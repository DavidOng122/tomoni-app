import assert from 'node:assert/strict';
import test from 'node:test';

import { getParticipantAvatarPreview } from '../../src/features/events/domain/getParticipantAvatarPreview.ts';

test('shows only real Supabase avatars and reports remaining participants', () => {
  const result = getParticipantAvatarPreview({
    participantCount: 4,
    users: [
      { userId: 'miki', nickname: 'Miki', avatarUrl: '/miki.png' },
      { userId: 'julia', nickname: 'Julia', avatarUrl: null },
      { userId: 'megan', nickname: 'Megan', avatarUrl: '/megan.png' },
    ],
  });

  assert.deepEqual(result.visibleUsers.map((user) => user.userId), ['miki', 'megan']);
  assert.equal(result.overflowCount, 2);
});

test('returns no avatar row when there is no participant preview', () => {
  assert.deepEqual(getParticipantAvatarPreview(null), {
    visibleUsers: [],
    overflowCount: 0,
  });
});
