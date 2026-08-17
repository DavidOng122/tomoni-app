import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  formatUpcomingCompanionDateTime,
  getNearestUpcomingCompanion,
  getNextPlanOccurrence,
} from '../../src/features/discover/domain/getNearestUpcomingCompanion.ts';

const baseCandidate = {
  invitationId: 'invitation-b',
  conversationId: 'conversation-b',
  otherUserId: 'user-b',
  nickname: 'B',
  avatarUrl: '/b.png',
  activityType: 'walking',
  customActivityName: null,
  daysOfWeek: ['tue'],
  startTime: '09:00:00',
  placeName: '行船公園',
};

test('computes the next Tokyo occurrence and skips a plan time that already passed', () => {
  const next = getNextPlanOccurrence(
    ['mon'],
    '09:00:00',
    new Date('2026-08-17T01:00:00.000Z'),
  );

  assert.equal(next?.toISOString(), '2026-08-24T00:00:00.000Z');
});

test('shows only the companion whose next fixed-plan occurrence is nearest', () => {
  const nearest = getNearestUpcomingCompanion([
    baseCandidate,
    {
      ...baseCandidate,
      invitationId: 'invitation-a',
      otherUserId: 'user-a',
      nickname: 'A',
      daysOfWeek: ['mon'],
      startTime: '20:00:00',
    },
  ], new Date('2026-08-17T01:00:00.000Z'));

  assert.equal(nearest?.nickname, 'A');
});

test('uses a stable invitation id tie-break instead of rendering every companion', () => {
  const nearest = getNearestUpcomingCompanion([
    baseCandidate,
    { ...baseCandidate, invitationId: 'invitation-a', nickname: 'A' },
  ], new Date('2026-08-17T01:00:00.000Z'));

  assert.equal(nearest?.nickname, 'A');
});

test('formats the next occurrence like the Figma companion card', () => {
  assert.equal(
    formatUpcomingCompanionDateTime(new Date('2026-08-18T00:00:00.000Z')),
    '8月18日（火） 9:00ごろ',
  );
});

test('the home page no longer derives the companion card from the first owned plan', async () => {
  const page = await readFile(new URL('../../src/app/discover/page.tsx', import.meta.url), 'utf8');

  assert.match(page, /invitation_status', 'accepted'/);
  assert.match(page, /getNearestUpcomingCompanion/);
  assert.doesNotMatch(page, /const firstPlan/);
});

test('preserves the Figma person-walking icon aspect ratio', async () => {
  const css = await readFile(
    new URL('../../src/app/discover/DiscoverView.module.css', import.meta.url),
    'utf8',
  );
  const walkIconRule = css.match(/\.walkIcon\s*\{([^}]+)\}/)?.[1] || '';

  assert.match(walkIconRule, /background-image:\s*url\('\/images\/discover\/scheduled-people\/walking\.svg'\)/);
  assert.match(walkIconRule, /background-size:\s*auto 17px/);
});
