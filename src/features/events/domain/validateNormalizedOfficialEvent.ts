import type {
  NormalizedOfficialEvent,
  NormalizedOfficialEventCandidate,
  OfficialEventValidationResult,
} from "./officialEventImportTypes.ts";

export function validateNormalizedOfficialEvent(
  candidate: NormalizedOfficialEventCandidate,
): OfficialEventValidationResult {
  if (!candidate.sourceEventId) {
    return {
      kind: "skipped",
      reason: "missing_source_event_id",
      sourceUrl: candidate.officialUrl,
    };
  }
  if (!candidate.title) {
    return {
      kind: "skipped",
      reason: "missing_title",
      sourceUrl: candidate.officialUrl,
    };
  }
  if (candidate.datetimeIssue) {
    return {
      kind: "skipped",
      reason: candidate.datetimeIssue,
      sourceUrl: candidate.officialUrl,
    };
  }
  if (!candidate.startAt) {
    return {
      kind: "skipped",
      reason: "missing_start_at",
      sourceUrl: candidate.officialUrl,
    };
  }
  if (!candidate.placeName) {
    return {
      kind: "skipped",
      reason: "missing_place_name",
      sourceUrl: candidate.officialUrl,
    };
  }

  const {
    datetimeIssue: _datetimeIssue,
    warnings,
    ...event
  } = candidate;

  return {
    kind: "accepted",
    event: event as NormalizedOfficialEvent,
    warnings,
  };
}
