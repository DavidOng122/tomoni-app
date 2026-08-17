import assert from 'node:assert/strict';
import test from 'node:test';

import { canViewAcceptedPlanDetail } from '../../src/features/fixed-schedules/domain/canViewAcceptedPlanDetail.ts';

const acceptedDetail = {
  conversationStatus: 'active',
  invitationStatus: 'accepted',
  isActiveMember: true,
  hasFixedPlan: true,
};

test('allows an active member to view an accepted fixed-plan detail', () => {
  assert.equal(canViewAcceptedPlanDetail(acceptedDetail), true);
});

test('does not reveal the exact meetup before the invitation is accepted', () => {
  assert.equal(canViewAcceptedPlanDetail({
    ...acceptedDetail,
    invitationStatus: 'pending',
  }), false);
});

test('does not reveal the meetup to a non-member', () => {
  assert.equal(canViewAcceptedPlanDetail({
    ...acceptedDetail,
    isActiveMember: false,
  }), false);
});
