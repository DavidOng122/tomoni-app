export interface TokyoDateEvent {
  event_id: string;
  start_at: string;
}

export interface TokyoDateEventGroup<T extends TokyoDateEvent> {
  dateKey: string;
  dateLabel: string;
  weekdayLabel: string;
  events: T[];
}

const TOKYO_DATE_FORMATTER = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  weekday: 'long',
});

function getTokyoDateParts(startAt: string) {
  const parts = TOKYO_DATE_FORMATTER.formatToParts(new Date(startAt));
  const part = (type: Intl.DateTimeFormatPartTypes) => (
    parts.find((candidate) => candidate.type === type)?.value ?? ''
  );
  const year = part('year');
  const month = part('month');
  const day = part('day');

  return {
    dateKey: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
    dateLabel: `${month}月${day}日`,
    weekdayLabel: part('weekday'),
  };
}

export function groupEventsByTokyoDate<T extends TokyoDateEvent>(
  events: readonly T[],
): TokyoDateEventGroup<T>[] {
  const groups = new Map<string, TokyoDateEventGroup<T>>();

  for (const event of events) {
    const date = getTokyoDateParts(event.start_at);
    const existing = groups.get(date.dateKey);

    if (existing) {
      existing.events.push(event);
    } else {
      groups.set(date.dateKey, { ...date, events: [event] });
    }
  }

  return [...groups.values()];
}
