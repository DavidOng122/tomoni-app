import assert from 'node:assert/strict';
import test from 'node:test';

import { toTotalEventCapacity } from '../../src/features/events/domain/toTotalEventCapacity.ts';

test('converts creator-entered recruiting slots to total event capacity', () => {
  assert.equal(toTotalEventCapacity(1), 2);
  assert.equal(toTotalEventCapacity(5), 6);
});

test('keeps an omitted capacity unlimited', () => {
  assert.equal(toTotalEventCapacity(null), null);
  assert.equal(toTotalEventCapacity(undefined), null);
});

test('rejects zero, negative, fractional, and unsafe capacity input', () => {
  for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => toTotalEventCapacity(value), /positive integer/);
  }
});
