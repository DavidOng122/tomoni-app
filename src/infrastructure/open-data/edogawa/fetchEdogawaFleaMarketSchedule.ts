import * as cheerio from "cheerio";

import type {
  EdogawaFleaMarketSourceRow,
  ParsedEdogawaFleaMarketSchedule,
} from "./edogawaFleaMarketSourceTypes.ts";

export const EDOGAWA_FLEA_MARKET_SCHEDULE_URL =
  "https://www.city.edogawa.tokyo.jp/e025/kurashi/gomi_recycle/gomigenryo/shop/freemarket.html";

function normalizedText(value: string): string {
  return value.replace(/[\s\u3000]+/gu, " ").trim();
}

export function parseEdogawaFleaMarketSchedule(
  html: string,
  sourceUrl: string,
): ParsedEdogawaFleaMarketSchedule {
  const $ = cheerio.load(html);
  const pageId = normalizedText($("#tmp_pageid").first().text()).match(/ページID[：:]?\s*(\d+)/u)?.[1] ?? null;
  const updatedAtText = $("p, time, div")
    .map((_, element) => normalizedText($(element).text()))
    .get()
    .find((text) => /^更新日[：:]/u.test(text))
    ?.replace(/^更新日[：:]\s*/u, "") ?? null;
  const fiscalYearText = $("h2, h3")
    .map((_, element) => normalizedText($(element).text()))
    .get()
    .find((heading) => /(?:令和\d+年度|20\d{2}年度)/u.test(heading)) ?? null;

  const rows: EdogawaFleaMarketSourceRow[] = [];
  $("table").each((_, table) => {
    const tableRows = $(table).find("tr").toArray();
    const headerCells = $(tableRows[0]).find("th,td").map((__, cell) => normalizedText($(cell).text())).get();
    const headerIndex = (pattern: RegExp): number => headerCells.findIndex((header) => pattern.test(header));
    const nameIndex = headerIndex(/行事/u);
    const dateIndex = headerIndex(/実施月日/u);
    const typeIndex = headerIndex(/種別/u);
    const venueIndex = headerIndex(/会場/u);
    const timeIndex = headerIndex(/時間/u);
    const contactIndex = headerIndex(/問い合わせ/u);
    if ([nameIndex, dateIndex, typeIndex, venueIndex, timeIndex].some((index) => index < 0)) return;

    tableRows.slice(1).forEach((row, rowIndex) => {
      const cells = $(row).find("th,td").map((__, cell) => normalizedText($(cell).text())).get();
      if (cells.length === 0) return;
      const sourceRow: EdogawaFleaMarketSourceRow = {
        recordNumber: rowIndex + 2,
        eventName: cells[nameIndex] ?? "",
        dateText: cells[dateIndex] ?? "",
        marketType: cells[typeIndex] ?? "",
        venueName: cells[venueIndex] ?? "",
        timeText: cells[timeIndex] ?? "",
        contactText: contactIndex >= 0 ? cells[contactIndex] || null : null,
      };
      if (sourceRow.eventName || sourceRow.dateText || sourceRow.venueName) rows.push(sourceRow);
    });
  });

  return { sourceUrl, pageId, updatedAtText, fiscalYearText, rows };
}

export async function fetchEdogawaFleaMarketSchedule(
  options: { signal?: AbortSignal } = {},
): Promise<ParsedEdogawaFleaMarketSchedule> {
  const response = await fetch(EDOGAWA_FLEA_MARKET_SCHEDULE_URL, {
    headers: { "user-agent": "Yorimi-Edogawa-Flea-Market-Importer/1.0" },
    redirect: "follow",
    signal: options.signal,
  });
  if (!response.ok) {
    throw new Error(`Edogawa flea-market schedule request failed with HTTP ${response.status}.`);
  }
  return parseEdogawaFleaMarketSchedule(
    await response.text(),
    response.url || EDOGAWA_FLEA_MARKET_SCHEDULE_URL,
  );
}
