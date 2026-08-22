import type {
  NormalizedPublicPlace,
  NormalizedPublicPlaceCandidate,
  PublicPlaceValidationResult,
} from "./publicPlaceImportTypes.ts";

export function validateNormalizedPublicPlace(
  candidate: NormalizedPublicPlaceCandidate,
): PublicPlaceValidationResult {
  if (candidate.category === "community_facility") {
    return { kind: "skipped", reason: "unsupported_record", sourceUrl: candidate.sourceUrl };
  }
  if (!candidate.sourcePlaceId?.trim()) {
    return { kind: "skipped", reason: "missing_source_place_id", sourceUrl: candidate.sourceUrl };
  }
  if (!candidate.name?.trim()) {
    return { kind: "skipped", reason: "missing_name", sourceUrl: candidate.sourceUrl };
  }
  if (candidate.latitudeIssue) {
    return { kind: "skipped", reason: "invalid_latitude", sourceUrl: candidate.sourceUrl };
  }
  if (candidate.longitudeIssue) {
    return { kind: "skipped", reason: "invalid_longitude", sourceUrl: candidate.sourceUrl };
  }
  if (candidate.latitude === null || candidate.longitude === null) {
    return { kind: "skipped", reason: "missing_coordinates", sourceUrl: candidate.sourceUrl };
  }
  if (candidate.latitude < -90 || candidate.latitude > 90) {
    return { kind: "skipped", reason: "invalid_latitude", evidence: String(candidate.latitude), sourceUrl: candidate.sourceUrl };
  }
  if (candidate.longitude < -180 || candidate.longitude > 180) {
    return { kind: "skipped", reason: "invalid_longitude", evidence: String(candidate.longitude), sourceUrl: candidate.sourceUrl };
  }
  if (candidate.coordinateAreaIssue) {
    return {
      kind: "skipped",
      reason: "coordinates_outside_dataset_area",
      evidence: `${candidate.latitude},${candidate.longitude}`,
      sourceUrl: candidate.sourceUrl,
    };
  }

  const place: NormalizedPublicPlace = {
    sourceDatasetId: candidate.sourceDatasetId,
    sourcePlaceId: candidate.sourcePlaceId,
    sourceName: candidate.sourceName,
    name: candidate.name,
    category: candidate.category,
    address: candidate.address,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    officialUrl: candidate.officialUrl,
    description: candidate.description,
    availableDays: candidate.availableDays,
    openTime: candidate.openTime,
    closeTime: candidate.closeTime,
    hoursNote: candidate.hoursNote,
    attributes: candidate.attributes,
    sourceUpdatedAt: candidate.sourceUpdatedAt,
  };
  return { kind: "accepted", place, warnings: candidate.warnings };
}
