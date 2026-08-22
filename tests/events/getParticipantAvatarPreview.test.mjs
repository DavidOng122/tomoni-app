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

test('allows public avatar images from the configured local Supabase origin', async () => {
  const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';

  try {
    const { default: nextConfig } = await import(
      `../../next.config.ts?local-supabase-images=${Date.now()}`
    );
    const [pattern] = nextConfig.images?.remotePatterns ?? [];

    assert.ok(pattern instanceof URL);
    assert.equal(pattern.protocol, 'http:');
    assert.equal(pattern.hostname, '127.0.0.1');
    assert.equal(pattern.port, '54321');
    assert.equal(pattern.pathname, '/storage/v1/object/public/**');
    assert.equal(nextConfig.images?.dangerouslyAllowLocalIP, true);
  } finally {
    if (previousSupabaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previousSupabaseUrl;
    }
  }
});
