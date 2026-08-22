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

test('Discover uses the same activity icons as onboarding', async () => {
  const [constants, selector, view] = await Promise.all([
    readFile(new URL('../../src/features/fixed-schedules/lib/constants.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../src/features/fixed-schedules/components/onboarding-form/ActivityTypeSelector.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/app/discover/DiscoverView.tsx', import.meta.url), 'utf8'),
  ]);

  for (const [activityType, icon] of Object.entries({
    walking: 'onboarding-walking.svg',
    dog_walking: 'onboarding-dog.svg',
    event: 'onboarding-event.svg',
    study_reading: 'onboarding-study.svg',
    sports: 'onboarding-sports.svg',
    other: 'onboarding-other.svg',
  })) {
    assert.ok(constants.includes(`${activityType}: '/images/${icon}'`));
  }

  assert.match(selector, /ACTIVITY_ICONS\.dog_walking/);
  assert.match(view, /ACTIVITY_ICONS\[group\.activityType\]/);
  assert.doesNotMatch(view, /styles\.walkIcon/);
});

test('shows a pending-invitation notice and opens the notification feed', async () => {
  const [page, view, css] = await Promise.all([
    readFile(new URL('../../src/app/discover/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/app/discover/DiscoverView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/app/discover/DiscoverView.module.css', import.meta.url), 'utf8'),
  ]);

  assert.match(page, /receiver_user_id', user\.id[\s\S]+invitation_status', 'pending'/);
  assert.match(page, /pendingNotificationCount=\{pendingNotificationCount\}/);
  assert.match(page, /getPendingEventJoinRequests\(user\.id\)/);
  assert.match(view, /pendingNotificationCount > 0[\s\S]+styles\.notificationDot/);
  assert.match(view, /onClick=\{\(\) => router\.push\('\/notifications'\)\}/);
  assert.doesNotMatch(view, /router\.push\('\/connections\?tab=plans'\)/);
  assert.match(css, /\.notificationDot\s*\{[\s\S]+background:\s*#ff6f59/);
});

test('opens an accepted companion detail from the current activity card', async () => {
  const [page, view, css] = await Promise.all([
    readFile(new URL('../../src/app/discover/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/app/discover/DiscoverView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/app/discover/DiscoverView.module.css', import.meta.url), 'utf8'),
  ]);

  assert.match(page, /conversationId:\s*nearestCompanion\.conversationId/);
  assert.match(view, /href=\{`\/connections\/plans\/\$\{currentActivity\.conversationId\}`\}/);
  assert.match(view, /aria-label=\{`\$\{currentActivity\.name\}さんとの同行詳細を見る`\}/);
  assert.match(css, /\.currentCard:focus-visible\s*\{/);
});

test('shows the accepted suggested public place instead of a coarse Fixed Plan area', async () => {
  const page = await readFile(new URL('../../src/app/discover/page.tsx', import.meta.url), 'utf8');

  assert.match(page, /rpc\('get_fixed_plan_invitation_suggested_place'/);
  assert.match(page, /p_invitation_id:\s*nearestCompanion\.invitationId/);
  assert.match(page, /location:\s*currentMeetingPlaceName \?\? '合流地点を確認中'/);
  assert.doesNotMatch(page, /location:\s*nearestCompanion\.placeName/);
});
