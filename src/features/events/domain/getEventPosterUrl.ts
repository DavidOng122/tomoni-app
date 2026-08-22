interface EventPosterInput {
  eventType: string;
  sourceDatasetId: string | null;
  posterUrl: string | null;
}

export function getEventPosterUrl({
  eventType,
  sourceDatasetId,
  posterUrl,
}: EventPosterInput) {
  if (posterUrl) return posterUrl;

  if (eventType === 'official' && sourceDatasetId === 'edogawa_event_calendar') {
    return '/images/events/official/edogawa-event-placeholder.svg';
  }

  return null;
}
