import type {
  NormalizedPublicPlace,
  PublicPlaceIdentityDuplicate,
} from "./publicPlaceImportTypes.ts";

export function detectPublicPlaceIdentityDuplicates(
  places: readonly NormalizedPublicPlace[],
): {
  unique: NormalizedPublicPlace[];
  duplicates: PublicPlaceIdentityDuplicate[];
  duplicateCount: number;
} {
  const groups = new Map<string, NormalizedPublicPlace[]>();
  for (const place of places) {
    const key = `${place.sourceDatasetId}\u0000${place.sourcePlaceId}`;
    groups.set(key, [...(groups.get(key) ?? []), place]);
  }
  const duplicates: PublicPlaceIdentityDuplicate[] = [];
  const unique: NormalizedPublicPlace[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      unique.push(group[0]);
    } else {
      duplicates.push({
        sourceDatasetId: group[0].sourceDatasetId,
        sourcePlaceId: group[0].sourcePlaceId,
        places: group,
      });
    }
  }
  return {
    unique,
    duplicates,
    duplicateCount: duplicates.reduce((count, duplicate) => count + duplicate.places.length, 0),
  };
}
