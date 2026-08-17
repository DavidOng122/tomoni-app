import assert from 'node:assert/strict';
import test from 'node:test';

import { filterRecommendationsForPlan } from '../../src/features/discover/domain/filterRecommendationsForPlan.ts';

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
