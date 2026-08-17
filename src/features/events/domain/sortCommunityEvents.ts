export interface CommunityEventSortItem {
  event_id: string;
  start_at: string;
}

/**
 * Keeps the current user's joined events at the top of the community list.
 * Events inside each group remain chronological and deterministic.
 */
export function sortCommunityEvents<T extends CommunityEventSortItem>(
  events: readonly T[],
  joinedEventIds: ReadonlySet<string>,
): T[] {
  return [...events].sort((left, right) => {
    const participationOrder = Number(joinedEventIds.has(right.event_id))
      - Number(joinedEventIds.has(left.event_id));

    if (participationOrder !== 0) return participationOrder;

    const startOrder = new Date(left.start_at).getTime() - new Date(right.start_at).getTime();
    if (startOrder !== 0) return startOrder;

    return left.event_id.localeCompare(right.event_id);
  });
}
