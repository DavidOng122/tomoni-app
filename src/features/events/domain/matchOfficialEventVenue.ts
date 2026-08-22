import type { NormalizedOfficialEvent } from "./officialEventImportTypes.ts";

export interface OfficialEventVenueCandidate {
  publicPlaceId: string;
  name: string;
  address: string | null;
}

export type OfficialEventVenueMatch =
  | { kind: "matched"; publicPlaceId: string }
  | { kind: "unmatched" }
  | { kind: "ambiguous"; publicPlaceIds: string[] };

function normalizeVenueText(value: string | null): string {
  return value?.normalize("NFKC").replace(/[\s\u3000]+/gu, "").trim() ?? "";
}

export function matchOfficialEventVenue(
  event: Pick<NormalizedOfficialEvent, "placeName" | "address">,
  places: readonly OfficialEventVenueCandidate[],
): OfficialEventVenueMatch {
  const eventName = normalizeVenueText(event.placeName);
  if (!eventName) return { kind: "unmatched" };

  const nameMatches = places.filter((place) => normalizeVenueText(place.name) === eventName);
  if (nameMatches.length === 0) return { kind: "unmatched" };
  if (nameMatches.length === 1) {
    return { kind: "matched", publicPlaceId: nameMatches[0].publicPlaceId };
  }

  const eventAddress = normalizeVenueText(event.address);
  const addressMatches = eventAddress
    ? nameMatches.filter((place) => normalizeVenueText(place.address) === eventAddress)
    : [];
  if (addressMatches.length === 1) {
    return { kind: "matched", publicPlaceId: addressMatches[0].publicPlaceId };
  }

  return {
    kind: "ambiguous",
    publicPlaceIds: nameMatches.map((place) => place.publicPlaceId).sort(),
  };
}
