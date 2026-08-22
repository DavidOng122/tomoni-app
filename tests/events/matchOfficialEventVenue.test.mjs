import assert from 'node:assert/strict';
import test from 'node:test';

import { matchOfficialEventVenue } from '../../src/features/events/domain/matchOfficialEventVenue.ts';

const places = [
  { publicPlaceId: 'a', name: '篠崎文化プラザ', address: '江戸川区篠崎町7丁目20番19号' },
  { publicPlaceId: 'b', name: '地域会館', address: '江戸川区松江1丁目' },
  { publicPlaceId: 'c', name: '地域会館', address: '江戸川区鹿骨1丁目' },
];

test('matches only normalized exact venue names', () => {
  assert.deepEqual(
    matchOfficialEventVenue({ placeName: ' 篠崎文化プラザ ', address: null }, places),
    { kind: 'matched', publicPlaceId: 'a' },
  );
  assert.deepEqual(
    matchOfficialEventVenue({ placeName: '篠崎文化プラザ別館', address: null }, places),
    { kind: 'unmatched' },
  );
});

test('uses an exact normalized address only to disambiguate duplicate names', () => {
  assert.deepEqual(
    matchOfficialEventVenue({ placeName: '地域会館', address: '江戸川区 鹿骨1丁目' }, places),
    { kind: 'matched', publicPlaceId: 'c' },
  );
  assert.deepEqual(
    matchOfficialEventVenue({ placeName: '地域会館', address: null }, places),
    { kind: 'ambiguous', publicPlaceIds: ['b', 'c'] },
  );
});
