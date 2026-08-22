import * as cheerio from "cheerio";

import type { DiscoveredEdogawaEventPage } from "./edogawaEventSourceTypes.ts";

const EDOGAWA_HOSTNAME = "www.city.edogawa.tokyo.jp";
const EVENT_CALENDAR_URL = `https://${EDOGAWA_HOSTNAME}/cgi-bin/event_cal_multi/calendar.cgi`;

export interface EdogawaCalendarMonth {
  year: number;
  month: number;
}

export function buildEdogawaEventCalendarUrl({
  year,
  month,
}: EdogawaCalendarMonth): string {
  if (!Number.isInteger(year) || year < 2000 || year > 2200) {
    throw new Error(`Invalid calendar year: ${year}`);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid calendar month: ${month}`);
  }

  const url = new URL(EVENT_CALENDAR_URL);
  url.searchParams.set("event_area", "1");
  url.searchParams.set("year", String(year));
  url.searchParams.set("month", String(month));
  return url.toString();
}

export function parseEdogawaEventCalendar(
  html: string,
  calendarUrl: string,
): DiscoveredEdogawaEventPage[] {
  const $ = cheerio.load(html);
  const discovered = new Map<string, DiscoveredEdogawaEventPage>();

  $("a[href]").each((_, anchor) => {
    const href = $(anchor).attr("href");
    if (!href) {
      return;
    }

    let url: URL;
    try {
      url = new URL(href, calendarUrl);
    } catch {
      return;
    }

    if (
      url.protocol !== "https:"
      || url.hostname !== EDOGAWA_HOSTNAME
      || !url.pathname.includes("/event/")
      || !url.pathname.endsWith(".html")
    ) {
      return;
    }

    url.hash = "";
    const normalizedUrl = url.toString();
    if (!discovered.has(normalizedUrl)) {
      discovered.set(normalizedUrl, {
        url: normalizedUrl,
        linkText: $(anchor).text().replace(/[\s\u3000]+/gu, " ").trim(),
      });
    }
  });

  return [...discovered.values()];
}

export async function fetchEdogawaEventCalendar(
  month: EdogawaCalendarMonth,
  options: { signal?: AbortSignal } = {},
): Promise<{
  calendarUrl: string;
  pages: DiscoveredEdogawaEventPage[];
}> {
  const calendarUrl = buildEdogawaEventCalendarUrl(month);
  const response = await fetch(calendarUrl, {
    headers: { "user-agent": "Yorimi-Edogawa-Event-Importer/1.0" },
    redirect: "follow",
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Edogawa calendar request failed with HTTP ${response.status}.`);
  }

  const html = await response.text();
  return {
    calendarUrl: response.url || calendarUrl,
    pages: parseEdogawaEventCalendar(html, response.url || calendarUrl),
  };
}
