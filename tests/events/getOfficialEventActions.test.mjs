import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { getOfficialEventActions } from '../../src/features/events/domain/getOfficialEventActions.ts';
import { getEventOrganizerAvatarUrl } from '../../src/features/events/domain/getEventOrganizerAvatarUrl.ts';
import { getEventPosterUrl } from '../../src/features/events/domain/getEventPosterUrl.ts';

const baseEvent = {
  officialUrl: 'https://example.com/event',
  registrationUrl: 'https://example.com/register',
  registrationRequired: true,
  registrationStatus: 'open',
  registrationDeadline: null,
};

test('keeps the official page link separate from the registration action', () => {
  const actions = getOfficialEventActions(baseEvent);

  assert.equal(actions.officialSiteUrl, 'https://example.com/event');
  assert.deepEqual(actions.registrationAction, {
    label: '公式サイトで申し込む',
    url: 'https://example.com/register',
    disabled: false,
  });
});

test('disables official registration after its deadline', () => {
  const actions = getOfficialEventActions(
    { ...baseEvent, registrationDeadline: '2026-08-16T00:00:00.000Z' },
    new Date('2026-08-17T00:00:00.000Z'),
  );

  assert.deepEqual(actions.registrationAction, {
    label: '受付終了',
    url: null,
    disabled: true,
  });
});

test('uses the Edogawa organizer logo when an official event has no creator profile', () => {
  assert.equal(getEventOrganizerAvatarUrl({
    eventType: 'official',
    sourceDatasetId: 'edogawa_event_calendar',
    sourceName: '東京都',
    creatorAvatarUrl: null,
  }), '/images/events/detail/organizer-edogawa.png');
});

test('keeps the legacy Edogawa organizer logo fallback for official seed events', () => {
  assert.equal(getEventOrganizerAvatarUrl({
    eventType: 'official',
    sourceDatasetId: null,
    sourceName: '江戸川区公式',
    creatorAvatarUrl: null,
  }), '/images/events/detail/organizer-edogawa.png');
});

test('prefers the real Supabase creator avatar for a user-created event', () => {
  assert.equal(getEventOrganizerAvatarUrl({
    eventType: 'user_created',
    sourceDatasetId: null,
    sourceName: 'Miki',
    creatorAvatarUrl: '/profiles/miki.png',
  }), '/profiles/miki.png');
});

test('uses a local placeholder for an Edogawa event without an authorized poster', () => {
  assert.equal(getEventPosterUrl({
    eventType: 'official',
    sourceDatasetId: 'edogawa_event_calendar',
    posterUrl: null,
  }), '/images/events/official/edogawa-event-placeholder.svg');
});

test('prefers a real event poster over the official placeholder', () => {
  assert.equal(getEventPosterUrl({
    eventType: 'official',
    sourceDatasetId: 'edogawa_event_calendar',
    posterUrl: '/event-posters/real-poster.jpg',
  }), '/event-posters/real-poster.jpg');
});

test('does not add the official placeholder to a user-created event', () => {
  assert.equal(getEventPosterUrl({
    eventType: 'user_created',
    sourceDatasetId: null,
    posterUrl: null,
  }), null);
});

test('renders the official action before the Tomoni participation action', async () => {
  const view = await readFile(
    new URL('../../src/app/events/[eventId]/EventDetailView.tsx', import.meta.url),
    'utf8',
  );

  assert.ok(view.indexOf('officialActions.registrationAction') < view.indexOf('<EventParticipationButton'));
  assert.ok(view.indexOf('className={styles.officialLinkIcon}') < view.indexOf('className={styles.registrationBadge}'));
  assert.match(view, /getEventOrganizerAvatarUrl/);
});
