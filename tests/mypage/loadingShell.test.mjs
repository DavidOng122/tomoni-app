import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const loadingSource = readFileSync(
  new URL('../../src/app/mypage/loading.tsx', import.meta.url),
  'utf8',
);

test('My Page loading state does not render the legacy bottom navigation', () => {
  assert.doesNotMatch(loadingSource, /BottomNavigation/);
  assert.doesNotMatch(loadingSource, /<nav\b/);
  assert.match(loadingSource, /aria-busy="true"/);
});
