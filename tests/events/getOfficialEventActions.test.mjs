import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { getOfficialEventActions } from '../../src/features/events/domain/getOfficialEventActions.ts';
import { getEventOrganizerAvatarUrl } from '../../src/features/events/domain/getEventOrganizerAvatarUrl.ts';

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
    sourceName: '江戸川区公式',
    creatorAvatarUrl: null,
  }), '/images/events/detail/organizer-edogawa.png');
});

test('prefers the real Supabase creator avatar for a user-created event', () => {
  assert.equal(getEventOrganizerAvatarUrl({
    eventType: 'user_created',
    sourceName: 'Miki',
    creatorAvatarUrl: '/profiles/miki.png',
  }), '/profiles/miki.png');
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
