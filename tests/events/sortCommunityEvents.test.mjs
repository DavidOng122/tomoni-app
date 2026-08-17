import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { sortCommunityEvents } from '../../src/features/events/domain/sortCommunityEvents.ts';

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

test('marks only Supabase going events with an explicit participation badge', async () => {
  const page = await readFile(
    new URL('../../src/app/discover/page.tsx', import.meta.url),
    'utf8',
  );
  const view = await readFile(
    new URL('../../src/app/discover/DiscoverView.tsx', import.meta.url),
    'utf8',
  );
  const styles = await readFile(
    new URL('../../src/app/discover/DiscoverView.module.css', import.meta.url),
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
