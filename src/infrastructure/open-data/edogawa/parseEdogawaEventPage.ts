import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import type {
  EdogawaPageParseResult,
  EdogawaRegistrationLink,
} from "./edogawaEventSourceTypes.ts";

function normalizeInlineText(value: string): string {
  return value.replace(/[\s\u3000]+/gu, " ").trim();
}

function normalizeMultilineText(value: string): string | null {
  const lines = value
    .split(/\r?\n/u)
    .map(normalizeInlineText)
    .filter(Boolean);

  return lines.length > 0 ? lines.join("\n") : null;
}

function normalizeHeading(value: string): string {
  return normalizeInlineText(value).replace(/[：:]$/u, "");
}

function extractVisiblePageId(value: string): string | null {
  const match = normalizeInlineText(value).match(/ページID\s*[：:]?\s*(\d+)/u);
  return match?.[1] ?? null;
}

function sectionNodes(
  $: cheerio.CheerioAPI,
  labels: readonly string[],
): AnyNode[] {
  const normalizedLabels = new Set(labels.map(normalizeHeading));
  const heading = $("#tmp_contents h2")
    .filter((_, element) => normalizedLabels.has(normalizeHeading($(element).text())))
    .first();

  if (heading.length === 0) {
    return [];
  }

  const nodes = heading.nextUntil("h2").toArray();
  const calendarImportBoundary = nodes.findIndex(
    (node) => node.type === "tag" && $(node).hasClass("evt"),
  );

  return calendarImportBoundary >= 0
    ? nodes.slice(0, calendarImportBoundary)
    : nodes;
}

function nodesText($: cheerio.CheerioAPI, nodes: AnyNode[]): string | null {
  return normalizeMultilineText(nodes.map((node) => $(node).text()).join("\n"));
}

function subsectionText(
  $: cheerio.CheerioAPI,
  nodes: AnyNode[],
  labels: readonly string[],
): string | null {
  const normalizedLabels = new Set(labels.map(normalizeHeading));
  const heading = nodes.find(
    (node) =>
      node.type === "tag"
      && node.name === "h3"
      && normalizedLabels.has(normalizeHeading($(node).text())),
  );

  if (!heading) {
    return null;
  }

  const values: string[] = [];
  let sibling = heading.nextSibling;
  while (sibling && !(sibling.type === "tag" && sibling.name === "h3")) {
    values.push($(sibling).text());
    sibling = sibling.nextSibling;
  }

  return normalizeMultilineText(values.join("\n"));
}

function registrationLinks(
  $: cheerio.CheerioAPI,
  nodes: AnyNode[],
  sourceUrl: string,
): EdogawaRegistrationLink[] {
  const links: EdogawaRegistrationLink[] = [];
  const seen = new Set<string>();

  for (const node of nodes) {
    $(node).find("a[href]").each((_, anchor) => {
      const href = $(anchor).attr("href");
      if (!href) {
        return;
      }

      const label = normalizeInlineText($(anchor).text());
      const isActionLink = $(anchor).closest(".btn_entry").length > 0
        || /(?:申し込|申込|応募|電子申請|予約)/u.test(label);
      if (!isActionLink) {
        return;
      }

      let url: URL;
      try {
        url = new URL(href, sourceUrl);
      } catch {
        return;
      }

      if (!['http:', 'https:'].includes(url.protocol)) {
        return;
      }

      url.hash = "";
      const normalizedUrl = url.toString();
      if (seen.has(normalizedUrl)) {
        return;
      }

      seen.add(normalizedUrl);
      links.push({
        label,
        url: normalizedUrl,
      });
    });
  }

  return links;
}

function extractDateTimeItems(
  $: cheerio.CheerioAPI,
  nodes: AnyNode[],
): { items: string[]; notes: string[] } {
  const items: string[] = [];
  const notes: string[] = [];

  for (const node of nodes) {
    if (node.type === "tag" && node.name === "ul") {
      $(node).children("li").each((_, item) => {
        const text = normalizeInlineText($(item).text());
        if (text) {
          items.push(text);
        }
      });
      continue;
    }

    const text = normalizeInlineText($(node).text());
    if (text) {
      notes.push(text);
    }
  }

  if (items.length === 0) {
    const fallback = normalizeInlineText(nodes.map((node) => $(node).text()).join(" "));
    if (fallback) {
      items.push(fallback);
    }
  }

  return { items, notes };
}

function explicitStatusNotices(
  title: string | null,
  $: cheerio.CheerioAPI,
): string[] {
  const candidates = [
    title,
    ...$("#tmp_contents h2, #tmp_contents h3")
      .toArray()
      .map((element) => normalizeInlineText($(element).text())),
  ].filter((value): value is string => Boolean(value));

  const controlledNotice = /(?:[【〖\[]開催(?:中止|延期)[】〗\]]|開催(?:中止|延期)のお知らせ|[【〖\[](?:日程変更|開催日変更)[】〗\]]|(?:日程変更|開催日変更)のお知らせ)/u;
  return [...new Set(candidates.filter((value) => controlledNotice.test(value)))];
}

export function parseEdogawaEventPage(
  html: string,
  sourceUrl: string,
): EdogawaPageParseResult {
  const $ = cheerio.load(html);
  const contents = $("#tmp_contents");
  const title = normalizeMultilineText(contents.find("h1").first().text());

  if ($("#tmp_wrap_main").length === 0 || contents.length === 0) {
    return {
      kind: "parse_error",
      code: "unsupported_page_format",
      message: "The page does not contain the supported Edogawa event detail structure.",
      sourceUrl,
    };
  }

  const sourceEventId = extractVisiblePageId($("#tmp_pageid").first().text());
  const embeddedPageIds = [
    ...new Set(
      $('input[name="page_id"]')
        .toArray()
        .map((input) => normalizeInlineText($(input).attr("value") ?? ""))
        .filter((value) => /^\d+$/u.test(value)),
    ),
  ];

  if (
    sourceEventId
    && embeddedPageIds.some((embeddedPageId) => embeddedPageId !== sourceEventId)
  ) {
    return {
      kind: "parse_error",
      code: "mismatched_page_ids",
      message: `Visible page ID ${sourceEventId} does not match embedded page ID.`,
      sourceUrl,
    };
  }

  const dateTimeNodes = sectionNodes($, ["開催日時"]);
  const dateTime = extractDateTimeItems($, dateTimeNodes);
  const registrationNodes = sectionNodes($, ["申し込み", "申込み"]);

  return {
    kind: "parsed",
    page: {
      sourceUrl,
      sourceEventId,
      embeddedPageIds,
      updatedAtText: normalizeMultilineText($("#tmp_update").first().text()),
      titleText: title,
      descriptionText: normalizeMultilineText(contents.find(".outline").first().text()),
      dateTimeItems: dateTime.items,
      dateTimeNotes: dateTime.notes,
      placeText: nodesText($, sectionNodes($, ["場所"])),
      addressText: nodesText($, sectionNodes($, ["住所"])),
      organizerText: nodesText($, sectionNodes($, ["主催"])),
      capacityText: nodesText($, sectionNodes($, ["定員"])),
      registrationRequiredText: nodesText($, registrationNodes),
      registrationPeriodText: subsectionText($, registrationNodes, ["申し込み期間", "申込期間"]),
      registrationMethodText: subsectionText($, registrationNodes, ["申し込み方法", "申込方法"]),
      registrationLinks: registrationLinks($, registrationNodes, sourceUrl),
      explicitStatusNotices: explicitStatusNotices(title, $),
    },
  };
}
