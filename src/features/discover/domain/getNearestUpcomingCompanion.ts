const weekdayCodes = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export interface UpcomingCompanionCandidate {
  invitationId: string;
  conversationId: string;
  otherUserId: string;
  nickname: string;
  avatarUrl: string | null;
  activityType: string;
  customActivityName: string | null;
  daysOfWeek: string[];
  startTime: string;
  placeName: string;
}

export interface NearestUpcomingCompanion extends UpcomingCompanionCandidate {
  nextOccurrence: Date;
}

export function getNextPlanOccurrence(
  daysOfWeek: string[],
  startTime: string,
  now = new Date(),
) {
  const tokyoDate = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).format(now);
  const dateCursor = new Date(`${tokyoDate}T00:00:00.000Z`);
  const normalizedTime = startTime.substring(0, 5);

  for (let offset = 0; offset <= 7; offset += 1) {
    const candidateDate = new Date(dateCursor);
    candidateDate.setUTCDate(dateCursor.getUTCDate() + offset);
    const weekday = weekdayCodes[candidateDate.getUTCDay()];

    if (!daysOfWeek.includes(weekday)) continue;

    const localDate = candidateDate.toISOString().substring(0, 10);
    const occurrence = new Date(`${localDate}T${normalizedTime}:00+09:00`);

    if (occurrence >= now) return occurrence;
  }

  return null;
}

export function getNearestUpcomingCompanion(
  candidates: UpcomingCompanionCandidate[],
  now = new Date(),
): NearestUpcomingCompanion | null {
  return candidates
    .flatMap((candidate) => {
      const nextOccurrence = getNextPlanOccurrence(
        candidate.daysOfWeek,
        candidate.startTime,
        now,
      );

      return nextOccurrence ? [{ ...candidate, nextOccurrence }] : [];
    })
    .sort((left, right) => (
      left.nextOccurrence.getTime() - right.nextOccurrence.getTime()
      || left.invitationId.localeCompare(right.invitationId)
    ))[0] || null;
}

export function formatUpcomingCompanionDateTime(occurrence: Date) {
  const dateParts = new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'Asia/Tokyo',
  }).formatToParts(occurrence);
  const getPart = (type: Intl.DateTimeFormatPartTypes) => (
    dateParts.find((part) => part.type === type)?.value || ''
  );
  const time = new Intl.DateTimeFormat('ja-JP', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  }).format(occurrence);

  return `${getPart('month')}月${getPart('day')}日（${getPart('weekday')}） ${time}ごろ`;
}
