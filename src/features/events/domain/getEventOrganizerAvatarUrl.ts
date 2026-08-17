interface EventOrganizerAvatarInput {
  eventType: string;
  sourceName: string | null;
  creatorAvatarUrl: string | null;
}

export function getEventOrganizerAvatarUrl({
  eventType,
  sourceName,
  creatorAvatarUrl,
}: EventOrganizerAvatarInput) {
  if (creatorAvatarUrl) return creatorAvatarUrl;

  if (eventType === 'official' && sourceName?.includes('江戸川')) {
    return '/images/events/detail/organizer-edogawa.png';
  }

  return null;
}
