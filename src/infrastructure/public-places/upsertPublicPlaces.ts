import type { SupabaseClient } from "@supabase/supabase-js";

import { detectPublicPlaceIdentityDuplicates } from "../../features/public-places/domain/detectPublicPlaceIdentityDuplicates.ts";
import type {
  NormalizedPublicPlace,
  PublicPlaceUpsertRow,
} from "../../features/public-places/domain/publicPlaceImportTypes.ts";
import type { Database } from "../../types/database.types.ts";

const DEFAULT_BATCH_SIZE = 50;

export interface PublicPlaceUpsertResult {
  attempted: number;
  succeeded: number;
  batches: number;
  places: Array<{
    publicPlaceId: string;
    sourceDatasetId: string;
    sourcePlaceId: string;
  }>;
}

export class PublicPlaceUpsertError extends Error {
  readonly completedBatches: number;
  readonly failedSourceIdentities: string[];

  constructor(message: string, completedBatches: number, failedSourceIdentities: string[]) {
    super(message);
    this.name = "PublicPlaceUpsertError";
    this.completedBatches = completedBatches;
    this.failedSourceIdentities = failedSourceIdentities;
  }
}

export function toPublicPlaceUpsertRow(
  place: NormalizedPublicPlace,
  runStartedAt: string,
): PublicPlaceUpsertRow {
  return {
    source_dataset_id: place.sourceDatasetId,
    source_place_id: place.sourcePlaceId,
    source_name: place.sourceName,
    name: place.name,
    category: place.category,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    official_url: place.officialUrl,
    description: place.description,
    available_days: place.availableDays,
    open_time: place.openTime,
    close_time: place.closeTime,
    hours_note: place.hoursNote,
    attributes: place.attributes,
    source_updated_at: place.sourceUpdatedAt,
    last_checked_at: runStartedAt,
    updated_at: runStartedAt,
  };
}

function chunk<T>(values: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

export async function upsertPublicPlaces(
  client: SupabaseClient<Database>,
  places: readonly NormalizedPublicPlace[],
  options: { runStartedAt?: Date; batchSize?: number } = {},
): Promise<PublicPlaceUpsertResult> {
  const duplicateResult = detectPublicPlaceIdentityDuplicates(places);
  if (duplicateResult.duplicateCount > 0) {
    throw new PublicPlaceUpsertError(
      "Duplicate public-place source identities were detected before database write.",
      0,
      duplicateResult.duplicates.map(
        (duplicate) => `${duplicate.sourceDatasetId}:${duplicate.sourcePlaceId}`,
      ),
    );
  }

  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
    throw new Error("batchSize must be an integer from 1 through 500.");
  }

  const runStartedAt = (options.runStartedAt ?? new Date()).toISOString();
  const rows = places.map((place) => toPublicPlaceUpsertRow(place, runStartedAt));
  if (rows.some((row) => "public_place_id" in row || "created_at" in row || "location_point" in row)) {
    throw new Error("Public-place upsert rows must not contain generated identity or location columns.");
  }

  const batches = chunk(rows, batchSize);
  const imported: PublicPlaceUpsertResult["places"] = [];

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    const { data, error } = await client
      .from("public_places")
      .upsert(batch, { onConflict: "source_dataset_id,source_place_id" })
      .select("public_place_id,source_dataset_id,source_place_id");

    if (error) {
      throw new PublicPlaceUpsertError(
        `Public-place upsert batch ${index + 1} failed: ${error.message}`,
        index,
        batch.map((row) => `${row.source_dataset_id}:${row.source_place_id}`),
      );
    }

    for (const row of data ?? []) {
      imported.push({
        publicPlaceId: row.public_place_id,
        sourceDatasetId: row.source_dataset_id,
        sourcePlaceId: row.source_place_id,
      });
    }
  }

  return {
    attempted: rows.length,
    succeeded: imported.length,
    batches: batches.length,
    places: imported,
  };
}
