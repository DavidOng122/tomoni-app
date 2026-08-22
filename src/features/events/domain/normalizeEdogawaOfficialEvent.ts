import type { ParsedEdogawaEventPage } from "../../../infrastructure/open-data/edogawa/edogawaEventSourceTypes.ts";
import {
  EDOGAWA_EVENT_DATASET_ID,
  type NormalizedOfficialEventCandidate,
  type OfficialEventRegistrationStatus,
  type OfficialEventStatus,
} from "./officialEventImportTypes.ts";
import { classifyOfficialEventRecommendationTags } from "./classifyOfficialEventRecommendationTags.ts";

interface JapaneseDatePart {
  year: number;
  month: number;
  day: number;
  index: number;
}

interface JapaneseTimePart {
  hour: number;
  minute: number;
  index: number;
}

interface ParsedEventDateTime {
  startAt: string | null;
  endAt: string | null;
  issue: "multiple_occurrences" | "invalid_datetime" | null;
}

function normalizeText(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const normalized = value
    .split(/\r?\n/u)
    .map((line) => line.replace(/[\s\u3000]+/gu, " ").trim())
    .filter(Boolean)
    .join("\n");
  return normalized || null;
}

function parseJapaneseDates(value: string): JapaneseDatePart[] {
  const dates: JapaneseDatePart[] = [];
  const pattern = /(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/gu;
  let inheritedYear: number | null = null;

  for (const match of value.matchAll(pattern)) {
    const explicitYear = match[1] ? Number(match[1]) : null;
    if (explicitYear !== null) {
      inheritedYear = explicitYear;
    }
    if (inheritedYear === null) {
      continue;
    }

    let year: number = explicitYear ?? inheritedYear;
    const month = Number(match[2]);
    const day = Number(match[3]);
    const previous = dates.at(-1);
    if (!explicitYear && previous && month < previous.month) {
      year += 1;
      inheritedYear = year;
    }

    dates.push({ year, month, day, index: match.index ?? 0 });
  }

  return dates;
}

function parseJapaneseTimes(value: string): JapaneseTimePart[] {
  const times: JapaneseTimePart[] = [];
  const pattern = /(?:(午前|午後)\s*)?(\d{1,2})時(?:(\d{1,2})分)?/gu;

  for (const match of value.matchAll(pattern)) {
    const period = match[1] ?? null;
    let hour = Number(match[2]);
    const minute = Number(match[3] ?? 0);

    if (period === "午前" && hour === 12) {
      hour = 0;
    } else if (period === "午後" && hour < 12) {
      hour += 12;
    }

    times.push({ hour, minute, index: match.index ?? 0 });
  }

  return times;
}

function isValidDatePart(date: JapaneseDatePart): boolean {
  const candidate = new Date(Date.UTC(date.year, date.month - 1, date.day));
  return candidate.getUTCFullYear() === date.year
    && candidate.getUTCMonth() === date.month - 1
    && candidate.getUTCDate() === date.day;
}

function toTokyoIso(
  date: JapaneseDatePart,
  time: JapaneseTimePart,
): string | null {
  if (
    !isValidDatePart(date)
    || time.hour < 0
    || time.hour > 23
    || time.minute < 0
    || time.minute > 59
  ) {
    return null;
  }

  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.year}-${pad(date.month)}-${pad(date.day)}T${pad(time.hour)}:${pad(time.minute)}:00+09:00`;
}

function hasRangeConnector(value: string): boolean {
  return /(?:から|まで|[～〜－–—])/u.test(value);
}

function parseEventDateTime(
  items: string[],
  notes: string[],
  pageContext: string,
): ParsedEventDateTime {
  const combined = [...items, ...notes].join(" ");
  const repeatedPattern = /(?:全\s*[0-9０-９一二三四五六七八九十]+\s*回|各日|毎週|毎月|複数回)/u;
  const repeatedPagePattern = /(?:全\s*[0-9０-９一二三四五六七八九十]+\s*回|各日)/u;

  if (
    items.length > 1
    || repeatedPattern.test(combined)
    || repeatedPagePattern.test(pageContext)
  ) {
    return { startAt: null, endAt: null, issue: "multiple_occurrences" };
  }

  const value = items[0] ?? "";
  if (!value) {
    return { startAt: null, endAt: null, issue: null };
  }

  const dates = parseJapaneseDates(value);
  const times = parseJapaneseTimes(value);
  const rangeConnectorCount = (value.match(/から/gu) ?? []).length;

  if (
    dates.length > 2
    || times.length > 2
    || rangeConnectorCount > 1
    || (dates.length === 2 && !hasRangeConnector(value))
  ) {
    return { startAt: null, endAt: null, issue: "multiple_occurrences" };
  }

  if (dates.length === 0) {
    return {
      startAt: null,
      endAt: null,
      issue: /\d/u.test(value) ? "invalid_datetime" : null,
    };
  }

  if (times.length === 0) {
    return { startAt: null, endAt: null, issue: null };
  }

  const startAt = toTokyoIso(dates[0], times[0]);
  if (!startAt) {
    return { startAt: null, endAt: null, issue: "invalid_datetime" };
  }

  let endAt: string | null = null;
  if (times.length === 2) {
    const endDate = dates[1] ?? dates[0];
    endAt = toTokyoIso(endDate, times[1]);
    if (!endAt || Date.parse(endAt) <= Date.parse(startAt)) {
      return { startAt: null, endAt: null, issue: "invalid_datetime" };
    }
  } else if (dates.length === 2) {
    return { startAt: null, endAt: null, issue: "invalid_datetime" };
  }

  return { startAt, endAt, issue: null };
}

function parseUpdatedAt(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const dates = parseJapaneseDates(value);
  if (dates.length !== 1 || !isValidDatePart(dates[0])) {
    return null;
  }
  return toTokyoIso(dates[0], { hour: 0, minute: 0, index: 0 });
}

function parseCapacity(value: string | null): number | null {
  if (!value || /(?:なし|無し|定めなし)/u.test(value)) {
    return null;
  }
  const match = value.match(/([0-9０-９][0-9０-９,，]*)\s*(?:人|名)/u);
  if (!match) {
    return null;
  }
  const ascii = match[1]
    .replace(/[０-９]/gu, (digit) => String("０１２３４５６７８９".indexOf(digit)))
    .replace(/[,，]/gu, "");
  const capacity = Number(ascii);
  return Number.isSafeInteger(capacity) && capacity >= 1 ? capacity : null;
}

interface RegistrationWindow {
  startAt: number | null;
  endAt: number | null;
  deadline: string | null;
}

function parseBoundary(
  value: string,
  fallbackYear: number | null,
  endOfDay: boolean,
): { timestamp: number; iso: string | null; year: number } | null {
  const explicitYearMatch = value.match(/(\d{4})年/u);
  const dateMatch = value.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/u);
  if (!dateMatch) {
    return null;
  }
  const year = Number(dateMatch[1] ?? explicitYearMatch?.[1] ?? fallbackYear);
  if (!Number.isInteger(year)) {
    return null;
  }
  const date: JapaneseDatePart = {
    year,
    month: Number(dateMatch[2]),
    day: Number(dateMatch[3]),
    index: dateMatch.index ?? 0,
  };
  if (!isValidDatePart(date)) {
    return null;
  }

  const time = parseJapaneseTimes(value)[0] ?? null;
  if (time) {
    const iso = toTokyoIso(date, time);
    return iso ? { timestamp: Date.parse(iso), iso, year } : null;
  }

  const pad = (number: number) => String(number).padStart(2, "0");
  const boundary = `${year}-${pad(date.month)}-${pad(date.day)}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+09:00`;
  return { timestamp: Date.parse(boundary), iso: null, year };
}

function parseRegistrationWindow(value: string | null): RegistrationWindow {
  if (!value) {
    return { startAt: null, endAt: null, deadline: null };
  }

  const separatorIndex = value.indexOf("から");
  if (separatorIndex >= 0) {
    const startText = value.slice(0, separatorIndex);
    const endText = value.slice(separatorIndex + "から".length);
    const start = parseBoundary(startText, null, false);
    const end = parseBoundary(endText, start?.year ?? null, true);
    return {
      startAt: start?.timestamp ?? null,
      endAt: end?.timestamp ?? null,
      deadline: end?.iso ?? null,
    };
  }

  if (value.includes("まで")) {
    const end = parseBoundary(value, null, true);
    return {
      startAt: null,
      endAt: end?.timestamp ?? null,
      deadline: end?.iso ?? null,
    };
  }

  return { startAt: null, endAt: null, deadline: null };
}

function normalizeRegistration(
  page: ParsedEdogawaEventPage,
  now: Date,
): {
  required: boolean;
  status: OfficialEventRegistrationStatus;
  deadline: string | null;
  url: string | null;
} {
  const registrationText = [
    page.descriptionText,
    page.registrationRequiredText,
    page.registrationPeriodText,
    page.registrationMethodText,
  ].filter(Boolean).join(" ");

  if (/(?:申し込み|申込み)?\s*(?:不要|必要ありません)/u.test(registrationText)) {
    return { required: false, status: "not_required", deadline: null, url: null };
  }

  const required = /(?:必要|要申込|要申し込み|要予約)/u.test(registrationText)
    || Boolean(page.registrationPeriodText)
    || page.registrationLinks.length > 0;
  const url = page.registrationLinks[0]?.url ?? null;

  if (!required) {
    return { required: false, status: "unknown", deadline: null, url: null };
  }

  const window = parseRegistrationWindow(page.registrationPeriodText);
  const timestamp = now.getTime();
  let status: OfficialEventRegistrationStatus = "unknown";

  if (/(?:定員に達|満員|受付人数に達)/u.test(registrationText)) {
    status = "full";
  } else if (/(?:受付終了|募集終了|申し込みを終了|申込みを終了)/u.test(registrationText)) {
    status = "closed";
  } else if (window.startAt !== null && timestamp < window.startAt) {
    status = "not_started";
  } else if (window.endAt !== null && timestamp > window.endAt) {
    status = "closed";
  } else if (
    /(?:受付中|申し込み受付中|申込受付中)/u.test(registrationText)
    || (window.startAt !== null && window.endAt !== null)
  ) {
    status = "open";
  }

  return { required, status, deadline: window.deadline, url };
}

function normalizeEventStatus(
  notices: string[],
  startAt: string | null,
  endAt: string | null,
  now: Date,
): { status: OfficialEventStatus; message: string | null } {
  const message = notices.length > 0 ? notices.join("\n") : null;
  const noticeText = notices.join(" ");

  if (/開催中止/u.test(noticeText)) {
    return { status: "cancelled", message };
  }
  if (/開催延期/u.test(noticeText)) {
    return { status: "postponed", message };
  }
  if (/(?:日程変更|開催日変更)/u.test(noticeText)) {
    return { status: "rescheduled", message };
  }
  if (!startAt) {
    return { status: "unknown", message };
  }
  if (endAt && Date.parse(endAt) < now.getTime()) {
    return { status: "ended", message };
  }
  if (Date.parse(startAt) > now.getTime() || (endAt && Date.parse(endAt) >= now.getTime())) {
    return { status: "scheduled", message };
  }
  return { status: "unknown", message };
}

function canonicalizeOfficialUrl(sourceUrl: string): string {
  const url = new URL(sourceUrl);
  url.hash = "";
  return url.toString();
}

export function normalizeEdogawaOfficialEvent(
  page: ParsedEdogawaEventPage,
  options: { now?: Date } = {},
): NormalizedOfficialEventCandidate {
  const now = options.now ?? new Date();
  const datetime = parseEventDateTime(
    page.dateTimeItems,
    page.dateTimeNotes,
    [page.titleText, page.descriptionText].filter(Boolean).join(" "),
  );
  const registration = normalizeRegistration(page, now);
  const eventStatus = normalizeEventStatus(
    page.explicitStatusNotices,
    datetime.startAt,
    datetime.endAt,
    now,
  );
  const warnings: string[] = [];

  if (page.updatedAtText && !parseUpdatedAt(page.updatedAtText)) {
    warnings.push("unparseable_source_updated_at");
  }
  if (page.capacityText && parseCapacity(page.capacityText) === null && !/(?:なし|無し|定めなし)/u.test(page.capacityText)) {
    warnings.push("unparseable_capacity");
  }

  const title = normalizeText(page.titleText);
  const description = normalizeText(page.descriptionText);

  return {
    sourceDatasetId: EDOGAWA_EVENT_DATASET_ID,
    sourceEventId: normalizeText(page.sourceEventId),
    sourceName: normalizeText(page.organizerText),
    title,
    description,
    startAt: datetime.startAt,
    endAt: datetime.endAt,
    placeName: normalizeText(page.placeText),
    address: normalizeText(page.addressText),
    registrationRequired: registration.required,
    registrationStatus: registration.status,
    registrationDeadline: registration.deadline,
    registrationUrl: registration.url,
    capacity: parseCapacity(page.capacityText),
    officialUrl: canonicalizeOfficialUrl(page.sourceUrl),
    sourceUpdatedAt: parseUpdatedAt(page.updatedAtText),
    eventStatus: eventStatus.status,
    statusMessage: eventStatus.message,
    recommendationTags: classifyOfficialEventRecommendationTags({ title, description }),
    datetimeIssue: datetime.issue,
    warnings,
  };
}
