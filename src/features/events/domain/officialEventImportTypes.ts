import type { Database } from "../../../types/database.types.ts";

export const EDOGAWA_EVENT_DATASET_ID = "edogawa_event_calendar" as const;
export const EDOGAWA_FLEA_MARKET_DATASET_ID = "edogawa_flea_market_schedule" as const;

export type OfficialEventDatasetId =
  | typeof EDOGAWA_EVENT_DATASET_ID
  | typeof EDOGAWA_FLEA_MARKET_DATASET_ID;

export const EVENT_RECOMMENDATION_TAGS = [
  "art_exhibition",
  "film",
  "music_performance",
  "culture_workshop",
  "community_festival",
  "market_flea",
] as const;

export type EventRecommendationTag = (typeof EVENT_RECOMMENDATION_TAGS)[number];

export const OFFICIAL_EVENT_SKIP_REASONS = [
  "missing_source_event_id",
  "missing_title",
  "missing_start_at",
  "missing_place_name",
  "multiple_occurrences",
  "invalid_datetime",
  "unsupported_page_format",
  "unsupported_recommendation_category",
] as const;

export type OfficialEventSkipReason =
  (typeof OFFICIAL_EVENT_SKIP_REASONS)[number];

export type OfficialEventRegistrationStatus =
  | "not_required"
  | "not_started"
  | "open"
  | "closed"
  | "full"
  | "unknown";

export type OfficialEventStatus =
  | "scheduled"
  | "cancelled"
  | "postponed"
  | "rescheduled"
  | "ended"
  | "unknown";

export interface NormalizedOfficialEvent {
  sourceDatasetId: OfficialEventDatasetId;
  sourceEventId: string;
  sourceName: string | null;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  placeName: string;
  address: string | null;
  registrationRequired: boolean;
  registrationStatus: OfficialEventRegistrationStatus;
  registrationDeadline: string | null;
  registrationUrl: string | null;
  capacity: number | null;
  officialUrl: string;
  sourceUpdatedAt: string | null;
  eventStatus: OfficialEventStatus;
  statusMessage: string | null;
  recommendationTags: EventRecommendationTag[];
}

export interface NormalizedOfficialEventCandidate {
  sourceDatasetId: OfficialEventDatasetId;
  sourceEventId: string | null;
  sourceName: string | null;
  title: string | null;
  description: string | null;
  startAt: string | null;
  endAt: string | null;
  placeName: string | null;
  address: string | null;
  registrationRequired: boolean;
  registrationStatus: OfficialEventRegistrationStatus;
  registrationDeadline: string | null;
  registrationUrl: string | null;
  capacity: number | null;
  officialUrl: string;
  sourceUpdatedAt: string | null;
  eventStatus: OfficialEventStatus;
  statusMessage: string | null;
  recommendationTags: EventRecommendationTag[];
  datetimeIssue: "multiple_occurrences" | "invalid_datetime" | null;
  warnings: string[];
}

export type OfficialEventValidationResult =
  | {
      kind: "accepted";
      event: NormalizedOfficialEvent;
      warnings: string[];
    }
  | {
      kind: "skipped";
      reason: OfficialEventSkipReason;
      evidence?: string;
      sourceUrl: string;
    };

export type OfficialEventUpsertRow =
  Database["public"]["Tables"]["events"]["Insert"];
