import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { groupEventsByTokyoDate } from '../../src/features/events/domain/groupEventsByTokyoDate.ts';
import { sortCommunityEvents } from '../../src/features/events/domain/sortCommunityEvents.ts';
import { formatEventTimeRange } from '../../src/utils/dateFormatter.ts';

test('pins joined community events before earlier non-joined events', () => {
  const events = [
    { event_id: 'earlier', start_at: '2026-08-18T09:00:00.000Z' },
    { event_id: 'joined-later', start_at: '2026-08-20T09:00:00.000Z' },
    { event_id: 'middle', start_at: '2026-08-19T09:00:00.000Z' },
  ];

  assert.deepEqual(
    sortCommunityEvents(events, new Set(['joined-later'])).map((event) => event.event_id),
    ['joined-later', 'earlier', 'middle'],
  );
});

test('keeps joined and non-joined groups chronological', () => {
  const events = [
    { event_id: 'joined-later', start_at: '2026-08-21T09:00:00.000Z' },
    { event_id: 'normal-later', start_at: '2026-08-20T09:00:00.000Z' },
    { event_id: 'joined-earlier', start_at: '2026-08-19T09:00:00.000Z' },
    { event_id: 'normal-earlier', start_at: '2026-08-18T09:00:00.000Z' },
  ];

  assert.deepEqual(
    sortCommunityEvents(events, new Set(['joined-later', 'joined-earlier'])).map((event) => event.event_id),
    ['joined-earlier', 'joined-later', 'normal-earlier', 'normal-later'],
  );
});

test('groups timeline events by their Tokyo calendar date', () => {
  const groups = groupEventsByTokyoDate([
    { event_id: 'late-evening', start_at: '2026-08-28T14:30:00.000Z' },
    { event_id: 'same-tokyo-day', start_at: '2026-08-28T23:30:00+09:00' },
    { event_id: 'next-day', start_at: '2026-08-29T00:30:00+09:00' },
  ]);

  assert.deepEqual(groups.map((group) => ({
    dateKey: group.dateKey,
    dateLabel: group.dateLabel,
    weekdayLabel: group.weekdayLabel,
    eventIds: group.events.map((event) => event.event_id),
  })), [
    {
      dateKey: '2026-08-28',
      dateLabel: '8月28日',
      weekdayLabel: '金曜日',
      eventIds: ['late-evening', 'same-tokyo-day'],
    },
    {
      dateKey: '2026-08-29',
      dateLabel: '8月29日',
      weekdayLabel: '土曜日',
      eventIds: ['next-day'],
    },
  ]);
});

test('formats event rows as time-only ranges inside a dated timeline group', () => {
  assert.equal(
    formatEventTimeRange('2026-08-28T15:00:00+09:00', '2026-08-28T17:30:00+09:00'),
    '15:00〜17:30',
  );
  assert.equal(formatEventTimeRange('2026-08-28T15:00:00+09:00', null), '15:00');
  assert.equal(
    formatEventTimeRange('2026-08-28T23:00:00+09:00', '2026-08-29T01:00:00+09:00'),
    '23:00〜8月29日 01:00',
  );
});

test('marks only Supabase going events with an explicit participation badge', async () => {
  const page = await readFile(
    new URL('../../src/app/discover/page.tsx', import.meta.url),
    'utf8',
  );
  const view = await readFile(
    new URL('../../src/features/events/components/EventTimeline.tsx', import.meta.url),
    'utf8',
  );
  const styles = await readFile(
    new URL('../../src/features/events/components/EventTimeline.module.css', import.meta.url),
    'utf8',
  );

  assert.match(page, /\.eq\('participation_status', 'going'\)/);
  assert.match(page, /isParticipating: joinedEventIds\.has\(event\.event_id\)/);
  assert.match(view, /event\.isParticipating \? <span className=\{styles\.participationBadge\}>参加予定<\/span> : null/);
  assert.match(styles, /\.participationBadge\s*\{[\s\S]*background: #cffbdc;[\s\S]*color: #2b7a3e;/);
});

test('uses the event同行 invitation action and shared同行 wording on both entry screens', async () => {
  const peopleView = await readFile(
    new URL('../../src/app/events/[eventId]/people/EventPeopleView.tsx', import.meta.url),
    'utf8',
  );
  const joinView = await readFile(
    new URL('../../src/app/events/[eventId]/join/JoinEventView.tsx', import.meta.url),
    'utf8',
  );

  for (const source of [peopleView, joinView]) {
    assert.match(source, /createEventInvitationAction/);
    assert.match(source, /同行に誘う/);
    assert.match(source, /お誘い済み/);
    assert.doesNotMatch(source, /招待する|挨拶する/);
  }
});
