import assert from 'node:assert/strict';
import test from 'node:test';

import { getFixedPlanInvitationCopy } from '../../src/features/invitations/domain/getFixedPlanInvitationCopy.ts';

test('uses the actual invited profile name and stored invitation message', () => {
  const copy = getFixedPlanInvitationCopy({
    activityType: 'walking',
    invitationMessage: '行船公園を一緒に歩きませんか？',
    isSender: true,
    otherNickname: 'Sora',
  });

  assert.equal(copy.headline, 'Soraさんにお誘いを送りました');
  assert.equal(copy.inviteMessage, '行船公園を一緒に歩きませんか？');
});

test('creates a fallback invitation message from the Supabase activity type', () => {
  const copy = getFixedPlanInvitationCopy({
    activityType: 'running',
    invitationMessage: null,
    isSender: false,
    otherNickname: 'Ken',
  });

  assert.equal(copy.headline, 'Kenさんからお誘いが届いています');
  assert.equal(copy.inviteMessage, '一緒にランニングに行きませんか？');
});
