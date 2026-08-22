import type { NormalizedOfficialEvent } from "./officialEventImportTypes.ts";

export interface OfficialEventIdentityDuplicate {
  sourceDatasetId: string;
  sourceEventId: string;
  events: NormalizedOfficialEvent[];
}

export function detectOfficialEventIdentityDuplicates(
  events: readonly NormalizedOfficialEvent[],
): {
  unique: NormalizedOfficialEvent[];
  duplicates: OfficialEventIdentityDuplicate[];
  duplicateCount: number;
} {
  const grouped = new Map<string, NormalizedOfficialEvent[]>();

  for (const event of events) {
    const key = `${event.sourceDatasetId}\u0000${event.sourceEventId}`;
    const group = grouped.get(key) ?? [];
    group.push(event);
    grouped.set(key, group);
  }

  const unique: NormalizedOfficialEvent[] = [];
  const duplicates: OfficialEventIdentityDuplicate[] = [];

  for (const eventsForIdentity of grouped.values()) {
    if (eventsForIdentity.length === 1) {
      unique.push(eventsForIdentity[0]);
      continue;
    }

    duplicates.push({
      sourceDatasetId: eventsForIdentity[0].sourceDatasetId,
      sourceEventId: eventsForIdentity[0].sourceEventId,
      events: eventsForIdentity,
    });
  }

  return {
    unique,
    duplicates,
    duplicateCount: duplicates.reduce((count, duplicate) => count + duplicate.events.length, 0),
  };
}
