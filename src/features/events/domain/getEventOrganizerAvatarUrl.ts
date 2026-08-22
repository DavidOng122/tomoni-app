interface EventOrganizerAvatarInput {
  eventType: string;
  sourceDatasetId: string | null;
  sourceName: string | null;
  creatorAvatarUrl: string | null;
}

export function getEventOrganizerAvatarUrl({
  eventType,
  sourceDatasetId,
  sourceName,
  creatorAvatarUrl,
}: EventOrganizerAvatarInput) {
  if (creatorAvatarUrl) return creatorAvatarUrl;

  const isEdogawaOfficialEvent = eventType === 'official'
    && (
      sourceDatasetId === 'edogawa_event_calendar'
      || (!sourceDatasetId && sourceName?.includes('江戸川'))
    );

  if (isEdogawaOfficialEvent) {
    return '/images/events/detail/organizer-edogawa.png';
  }

  return null;
}
