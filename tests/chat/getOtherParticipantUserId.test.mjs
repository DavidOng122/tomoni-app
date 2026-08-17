import assert from 'node:assert/strict';
import test from 'node:test';

import { getOtherParticipantUserId } from '../../src/features/chat/domain/getOtherParticipantUserId.ts';

test('selects the active invited participant instead of the current user', () => {
  const participantId = getOtherParticipantUserId('mika', [
    { user_id: 'mika', left_at: null },
    { user_id: 'julia', left_at: null },
  ]);

  assert.equal(participantId, 'julia');
});

test('does not select a participant who left the conversation', () => {
  const participantId = getOtherParticipantUserId('mika', [
    { user_id: 'mika', left_at: null },
    { user_id: 'sora', left_at: '2026-08-17T00:00:00Z' },
  ]);

  assert.equal(participantId, null);
});
