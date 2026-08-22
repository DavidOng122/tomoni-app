import type {
  EdogawaFleaMarketSourceRow,
  ParsedEdogawaFleaMarketSchedule,
} from "../../../infrastructure/open-data/edogawa/edogawaFleaMarketSourceTypes.ts";
import {
  EDOGAWA_FLEA_MARKET_DATASET_ID,
  type NormalizedOfficialEvent,
  type OfficialEventSkipReason,
} from "./officialEventImportTypes.ts";
import { classifyOfficialEventRecommendationTags } from "./classifyOfficialEventRecommendationTags.ts";

export type FleaMarketRowNormalizationResult =
  | { kind: "accepted"; event: NormalizedOfficialEvent }
  | { kind: "skipped"; reason: OfficialEventSkipReason; evidence: string; recordNumber: number };

function fiscalYear(value: string | null): number | null {
  if (!value) return null;
  const western = value.match(/(20\d{2})年度/u);
  if (western) return Number(western[1]);
  const reiwa = value.normalize("NFKC").match(/令和(\d+)年度/u);
  return reiwa ? Number(reiwa[1]) + 2018 : null;
}

function parseDate(value: string, year: number): { month: number; day: number } | null {
  const normalized = value.normalize("NFKC").replace(/[\s\u3000]+/gu, "");
  if (/(?:上旬|中旬|下旬|頃|から|～|〜)/u.test(normalized)) return null;
  const match = normalized.match(/^(\d{1,2})月(\d{1,2})日$/u);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    return null;
  }
  return { month, day };
}

function parseJapaneseTime(value: string): { hour: number; minute: number } | null {
  const normalized = value.normalize("NFKC").replace(/[\s\u3000]+/gu, "");
  if (normalized === "正午") return { hour: 12, minute: 0 };
  const match = normalized.match(/^(午前|午後)?(\d{1,2})時(?:(\d{1,2})分)?$/u);
  if (!match) return null;
  let hour = Number(match[2]);
  const minute = Number(match[3] ?? 0);
  if (hour > 12 || minute > 59) return null;
  if (match[1] === "午後" && hour < 12) hour += 12;
  if (match[1] === "午前" && hour === 12) hour = 0;
  return { hour, minute };
}

function parseTimeRange(value: string): { start: { hour: number; minute: number }; end: { hour: number; minute: number } | null } | null {
  const parts = value.split(/[～〜]/u).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 1 || parts.length > 2) return null;
  const start = parseJapaneseTime(parts[0]);
  const end = parts[1] ? parseJapaneseTime(parts[1]) : null;
  if (!start || (parts[1] && !end)) return null;
  return { start, end };
}

function tokyoIso(year: number, month: number, day: number, time: { hour: number; minute: number }): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}:00+09:00`;
}

function sourceUpdatedAt(value: string | null): string | null {
  const match = value?.normalize("NFKC").match(/(20\d{2})年(\d{1,2})月(\d{1,2})日/u);
  if (!match) return null;
  return `${match[1]}-${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[3])).padStart(2, "0")}T00:00:00+09:00`;
}

function identityPart(value: string): string {
  return value.normalize("NFKC").replace(/[\s\u3000]+/gu, "").replace(/[:/]/gu, "-");
}

export function normalizeEdogawaFleaMarketRow(
  schedule: ParsedEdogawaFleaMarketSchedule,
  row: EdogawaFleaMarketSourceRow,
  options: { now?: Date } = {},
): FleaMarketRowNormalizationResult {
  if (!schedule.pageId) {
    return { kind: "skipped", reason: "missing_source_event_id", evidence: "missing page ID", recordNumber: row.recordNumber };
  }
  const year = fiscalYear(schedule.fiscalYearText);
  const date = year ? parseDate(row.dateText, year) : null;
  const time = parseTimeRange(row.timeText);
  if (!year || !date || !time) {
    return { kind: "skipped", reason: "invalid_datetime", evidence: `${row.dateText} ${row.timeText}`.trim(), recordNumber: row.recordNumber };
  }
  if (!row.eventName.trim()) {
    return { kind: "skipped", reason: "missing_title", evidence: "", recordNumber: row.recordNumber };
  }
  if (!row.venueName.trim()) {
    return { kind: "skipped", reason: "missing_place_name", evidence: row.eventName, recordNumber: row.recordNumber };
  }

  const startAt = tokyoIso(year, date.month, date.day, time.start);
  const endAt = time.end ? tokyoIso(year, date.month, date.day, time.end) : null;
  const now = options.now ?? new Date();
  const eventStatus = Date.parse(endAt ?? startAt) < now.getTime() ? "ended" : "scheduled";
  const title = row.eventName.trim();
  const description = [row.marketType, row.contactText].filter(Boolean).join("。") || null;

  return {
    kind: "accepted",
    event: {
      sourceDatasetId: EDOGAWA_FLEA_MARKET_DATASET_ID,
      sourceEventId: [
        schedule.pageId,
        `${year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`,
        identityPart(row.venueName),
        identityPart(row.marketType),
      ].join(":"),
      sourceName: "江戸川区",
      title,
      description,
      startAt,
      endAt,
      placeName: row.venueName.trim(),
      address: null,
      registrationRequired: false,
      registrationStatus: "not_required",
      registrationDeadline: null,
      registrationUrl: null,
      capacity: null,
      officialUrl: schedule.sourceUrl,
      sourceUpdatedAt: sourceUpdatedAt(schedule.updatedAtText),
      eventStatus,
      statusMessage: null,
      recommendationTags: classifyOfficialEventRecommendationTags({ title, description }),
    },
  };
}
