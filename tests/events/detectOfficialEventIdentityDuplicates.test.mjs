import assert from 'node:assert/strict';
import test from 'node:test';

import { detectOfficialEventIdentityDuplicates } from '../../src/features/events/domain/detectOfficialEventIdentityDuplicates.ts';

function event(sourceEventId, title) {
  return {
    sourceDatasetId: 'edogawa_event_calendar',
    sourceEventId,
    sourceName: '江戸川区',
    title,
    description: null,
    startAt: '2026-09-01T10:00:00+09:00',
    endAt: null,
    placeName: '会場',
    address: null,
    registrationRequired: false,
    registrationStatus: 'not_required',
    registrationDeadline: null,
    registrationUrl: null,
    capacity: null,
    officialUrl: `https://www.city.edogawa.tokyo.jp/event/${sourceEventId}.html`,
    sourceUpdatedAt: null,
    eventStatus: 'scheduled',
    statusMessage: null,
  };
}

test('removes every member of a duplicate identity group from write candidates', () => {
  const result = detectOfficialEventIdentityDuplicates([
    event('1', 'first representation'),
    event('1', 'second representation'),
    event('2', 'unique'),
  ]);

  assert.deepEqual(result.unique.map((item) => item.sourceEventId), ['2']);
  assert.equal(result.duplicateCount, 2);
  assert.equal(result.duplicates.length, 1);
  assert.equal(result.duplicates[0].sourceEventId, '1');
});

test('does not treat matching titles as identity duplicates', () => {
  const result = detectOfficialEventIdentityDuplicates([
    event('1', 'same title'),
    event('2', 'same title'),
  ]);

  assert.equal(result.unique.length, 2);
  assert.equal(result.duplicateCount, 0);
});
