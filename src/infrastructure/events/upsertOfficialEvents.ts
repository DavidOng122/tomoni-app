import type { SupabaseClient } from "@supabase/supabase-js";

import { detectOfficialEventIdentityDuplicates } from "../../features/events/domain/detectOfficialEventIdentityDuplicates.ts";
import {
  matchOfficialEventVenue,
  type OfficialEventVenueCandidate,
} from "../../features/events/domain/matchOfficialEventVenue.ts";
import type {
  NormalizedOfficialEvent,
  OfficialEventUpsertRow,
} from "../../features/events/domain/officialEventImportTypes.ts";
import type { Database } from "../../types/database.types.ts";

const DEFAULT_BATCH_SIZE = 50;

export interface OfficialEventUpsertResult {
  attempted: number;
  succeeded: number;
  batches: number;
  events: Array<{
    eventId: string;
    sourceDatasetId: string;
    sourceEventId: string;
  }>;
  venueResolution: {
    matched: number;
    unmatched: string[];
    ambiguous: Array<{ sourceIdentity: string; publicPlaceIds: string[] }>;
  };
}

export class OfficialEventUpsertError extends Error {
  readonly completedBatches: number;
  readonly failedSourceIdentities: string[];

  constructor(
    message: string,
    completedBatches: number,
    failedSourceIdentities: string[],
  ) {
    super(message);
    this.name = "OfficialEventUpsertError";
    this.completedBatches = completedBatches;
    this.failedSourceIdentities = failedSourceIdentities;
  }
}

export function toOfficialEventUpsertRow(
  event: NormalizedOfficialEvent,
  runStartedAt: string,
  venuePublicPlaceId: string | null = null,
): OfficialEventUpsertRow {
  return {
    event_type: "official",
    source_dataset_id: event.sourceDatasetId,
    source_event_id: event.sourceEventId,
    source_name: event.sourceName,
    title: event.title,
    description: event.description,
    start_at: event.startAt,
    end_at: event.endAt,
    place_id: null,
    place_name: event.placeName,
    address: event.address,
    latitude: null,
    longitude: null,
    venue_public_place_id: venuePublicPlaceId,
    recommendation_tags: event.recommendationTags,
    registration_required: event.registrationRequired,
    registration_status: event.registrationStatus,
    registration_deadline: event.registrationDeadline,
    registration_url: event.registrationUrl,
    capacity: event.capacity,
    event_status: event.eventStatus,
    status_message: event.statusMessage,
    official_url: event.officialUrl,
    source_updated_at: event.sourceUpdatedAt,
    last_checked_at: runStartedAt,
    updated_at: runStartedAt,
  };
}

function chunk<T>(values: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export async function upsertOfficialEvents(
  client: SupabaseClient<Database>,
  events: readonly NormalizedOfficialEvent[],
  options: {
    runStartedAt?: Date;
    batchSize?: number;
  } = {},
): Promise<OfficialEventUpsertResult> {
  const duplicateResult = detectOfficialEventIdentityDuplicates(events);
  if (duplicateResult.duplicateCount > 0) {
    throw new OfficialEventUpsertError(
      "Duplicate source identities were detected before database write.",
      0,
      duplicateResult.duplicates.map(
        (duplicate) => `${duplicate.sourceDatasetId}:${duplicate.sourceEventId}`,
      ),
    );
  }

  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
    throw new Error("batchSize must be an integer from 1 through 500.");
  }

  const runStartedAt = (options.runStartedAt ?? new Date()).toISOString();
  const { data: publicPlaceRows, error: publicPlaceError } = await client
    .from("public_places")
    .select("public_place_id,name,address");

  if (publicPlaceError) {
    throw new OfficialEventUpsertError(
      `Official event venue lookup failed: ${publicPlaceError.message}`,
      0,
      events.map((event) => `${event.sourceDatasetId}:${event.sourceEventId}`),
    );
  }

  const publicPlaces: OfficialEventVenueCandidate[] = (publicPlaceRows ?? []).map((place) => ({
    publicPlaceId: place.public_place_id,
    name: place.name,
    address: place.address,
  }));
  const unmatched: string[] = [];
  const ambiguous: OfficialEventUpsertResult["venueResolution"]["ambiguous"] = [];
  let matched = 0;
  const rows = events.map((event) => {
    const sourceIdentity = `${event.sourceDatasetId}:${event.sourceEventId}`;
    const venueMatch = matchOfficialEventVenue(event, publicPlaces);
    if (venueMatch.kind === "matched") {
      matched += 1;
      return toOfficialEventUpsertRow(event, runStartedAt, venueMatch.publicPlaceId);
    }
    if (venueMatch.kind === "ambiguous") {
      ambiguous.push({ sourceIdentity, publicPlaceIds: venueMatch.publicPlaceIds });
    } else {
      unmatched.push(sourceIdentity);
    }
    return toOfficialEventUpsertRow(event, runStartedAt, null);
  });

  if (rows.some((row) => "event_id" in row || "created_at" in row)) {
    throw new Error("Official event upsert rows must not contain event_id or created_at.");
  }

  const batches = chunk(rows, batchSize);
  const importedEvents: OfficialEventUpsertResult["events"] = [];

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    const { data, error } = await client
      .from("events")
      .upsert(batch, {
        onConflict: "source_dataset_id,source_event_id",
      })
      .select("event_id,source_dataset_id,source_event_id");

    if (error) {
      throw new OfficialEventUpsertError(
        `Official event upsert batch ${index + 1} failed: ${error.message}`,
        index,
        batch.map((row) => `${row.source_dataset_id}:${row.source_event_id}`),
      );
    }

    for (const row of data ?? []) {
      if (!row.source_dataset_id || !row.source_event_id) {
        continue;
      }
      importedEvents.push({
        eventId: row.event_id,
        sourceDatasetId: row.source_dataset_id,
        sourceEventId: row.source_event_id,
      });
    }
  }

  return {
    attempted: rows.length,
    succeeded: importedEvents.length,
    batches: batches.length,
    events: importedEvents,
    venueResolution: { matched, unmatched, ambiguous },
  };
}
