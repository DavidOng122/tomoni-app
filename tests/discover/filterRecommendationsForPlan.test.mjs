import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { filterRecommendationsForPlan } from '../../src/features/discover/domain/filterRecommendationsForPlan.ts';
import {
  getRecommendationHeading,
  getRecommendationNickname,
  getRecommendationReasonLabel,
} from '../../src/features/discover/domain/getRecommendationPresentation.ts';

const scheduledPeopleStyles = await readFile(
  new URL(
    '../../src/app/discover/schedules/[scheduleId]/people/ScheduledPeopleView.module.css',
    import.meta.url,
  ),
  'utf8',
);
const scheduledPeopleView = await readFile(
  new URL(
    '../../src/app/discover/schedules/[scheduleId]/people/ScheduledPeopleView.tsx',
    import.meta.url,
  ),
  'utf8',
);

const recommendation = (candidateId, myPlanId) => ({
  candidateId,
  profile: {
    nickname: candidateId,
    avatarUrl: '',
    ageRange: '25-34',
    gender: 'prefer_not_to_say',
    tags: [],
  },
  match: {
    myPlanId,
    candidatePlanId: `${candidateId}-plan`,
    activityType: 'walking',
    matchedDays: ['tue'],
    myStartTime: '09:00',
    candidateStartTime: '09:00',
    timeDifferenceMinutes: 0,
    distanceKm: 1,
    reasons: ['same_activity'],
  },
});

test('keeps the home list scoped to the plan used by the detail route', () => {
  const recommendations = [
    recommendation('Julia', 'walking-plan'),
    recommendation('Reader', 'reading-plan'),
    recommendation('Megan', 'walking-plan'),
  ];

  const result = filterRecommendationsForPlan(recommendations, 'walking-plan');

  assert.deepEqual(result.map((item) => item.candidateId), ['Julia', 'Megan']);
  assert.ok(result.every((item) => item.match.myPlanId === 'walking-plan'));
});

test('uses the same recommendation copy in the preview and detail list', () => {
  assert.equal(getRecommendationHeading('散歩'), '一緒に散歩できそうな人');
  assert.equal(getRecommendationNickname('Aoi'), 'Aoiさん');
  assert.equal(getRecommendationNickname('Aoiさん'), 'Aoiさん');
  assert.equal(getRecommendationReasonLabel('same_activity', '散歩'), '散歩が好き');
  assert.equal(getRecommendationReasonLabel('same_time', '散歩'), '同じ時間ごろ');
  assert.equal(getRecommendationReasonLabel('nearby', '散歩'), '近くに住んでいる');
  assert.equal(getRecommendationReasonLabel('shared_day', '散歩'), '同じ曜日');
});

test('uses the same recommendation colors in the preview and detail list', () => {
  const walkingRule = scheduledPeopleStyles.match(/\.tagWalking\s*\{([^}]+)\}/)?.[1] ?? '';
  const timeRule = scheduledPeopleStyles.match(/\.tagTime\s*\{([^}]+)\}/)?.[1] ?? '';
  const nearbyRule = scheduledPeopleStyles.match(/\.tagNearby\s*\{([^}]+)\}/)?.[1] ?? '';
  const sharedDayRule = scheduledPeopleStyles.match(/\.tagSharedDay\s*\{([^}]+)\}/)?.[1] ?? '';

  assert.match(walkingRule, /background:\s*#fff3cd/);
  assert.match(walkingRule, /color:\s*#8b6914/);
  assert.match(timeRule, /background:\s*#f8d7da/);
  assert.match(timeRule, /color:\s*#721c24/);
  assert.match(nearbyRule, /background:\s*#d4edda/);
  assert.match(nearbyRule, /color:\s*#2b7a3e/);
  assert.match(sharedDayRule, /background:\s*#d1ecf1/);
  assert.match(sharedDayRule, /color:\s*#0c6370/);
});

test('lets event users invite without choosing a Top 3 recommendation', () => {
  assert.match(scheduledPeopleView, /おすすめを選ばず、同行成立後にチャットで相談できます/);
  assert.match(scheduledPeopleView, /あとでふたりで決める/);
  assert.match(
    scheduledPeopleView,
    /sendInvitation\(inviteTarget\.personId, inviteTarget\.candidatePlanId\)/,
  );
  assert.match(scheduledPeopleView, /eventRecommendations\.length > 0[\s\S]+decideLaterOption/);
});
