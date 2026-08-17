import assert from 'node:assert/strict';
import test from 'node:test';

import { getMessageAvatarUrl } from '../../src/features/chat/domain/getMessageAvatarUrl.ts';

test('uses the Supabase profile avatar for a message from the other participant', () => {
  assert.equal(getMessageAvatarUrl({
    currentUserId: 'mika',
    senderUserId: 'miki',
    otherAvatarUrl: '/images/mypage/connection-miki.png',
  }), '/images/mypage/connection-miki.png');
});

test('does not show the other participant avatar beside my own message', () => {
  assert.equal(getMessageAvatarUrl({
    currentUserId: 'mika',
    senderUserId: 'mika',
    otherAvatarUrl: '/images/mypage/connection-miki.png',
  }), null);
});
