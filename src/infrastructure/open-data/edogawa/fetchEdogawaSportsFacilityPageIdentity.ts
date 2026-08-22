import * as cheerio from "cheerio";

import type { EdogawaSportsPageIdentity } from "./edogawaPublicPlaceSourceTypes.ts";

export function parseEdogawaSportsFacilityPageIdentity(
  html: string,
  sourceUrl: string,
): EdogawaSportsPageIdentity {
  const $ = cheerio.load(html);
  const pageIdText = $("#tmp_pageid").first().text().replace(/[\s\u3000]+/gu, " ").trim();
  const match = pageIdText.match(/(?:ページID\s*[:：]?\s*)?(\d+)/u);
  return { sourceUrl, pageId: match?.[1] ?? null };
}

export async function fetchEdogawaSportsFacilityPageIdentity(
  sourceUrl: string,
  options: { signal?: AbortSignal } = {},
): Promise<EdogawaSportsPageIdentity> {
  const response = await fetch(sourceUrl, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; YorimiOpenDataImporter/1.0)" },
    signal: options.signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch sports facility page ${sourceUrl}: HTTP ${response.status}.`);
  }
  const resolvedUrl = response.url || sourceUrl;
  return parseEdogawaSportsFacilityPageIdentity(await response.text(), resolvedUrl);
}
