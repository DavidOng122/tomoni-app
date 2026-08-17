import assert from 'node:assert/strict';
import test from 'node:test';

import { getConnectionPreview } from '../../src/features/connections/domain/getConnectionPreview.ts';

const profile = (id) => ({
  user_id: id,
  nickname: id,
  avatar_url: `/avatars/${id}.png`,
});

test('returns no avatars when there are no connected people', () => {
  const result = getConnectionPreview([]);

  assert.deepEqual(result.visibleProfiles, []);
  assert.equal(result.overflowCount, 0);
});

test('shows three avatars without an overflow badge for three people', () => {
  const profiles = [profile('Miki'), profile('Julia'), profile('Megan')];
  const result = getConnectionPreview(profiles);

  assert.deepEqual(result.visibleProfiles, profiles);
  assert.equal(result.overflowCount, 0);
});

test('limits the avatar stack to three and reports the remaining count', () => {
  const profiles = [profile('Miki'), profile('Julia'), profile('Megan'), profile('Sora')];
  const result = getConnectionPreview(profiles);

  assert.deepEqual(result.visibleProfiles.map((item) => item.user_id), ['Miki', 'Julia', 'Megan']);
  assert.equal(result.overflowCount, 1);
});
