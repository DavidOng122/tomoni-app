import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { normalizeEdogawaFleaMarketRow } from '../../src/features/events/domain/normalizeEdogawaFleaMarketSchedule.ts';
import { parseEdogawaFleaMarketSchedule } from '../../src/infrastructure/open-data/edogawa/fetchEdogawaFleaMarketSchedule.ts';

const fixture = new URL('../fixtures/edogawa-events/flea-market-schedule.html', import.meta.url);

test('parses semantic flea-market table rows and visible page identity', async () => {
  const parsed = parseEdogawaFleaMarketSchedule(
    await readFile(fixture, 'utf8'),
    'https://www.city.edogawa.tokyo.jp/example/freemarket.html',
  );

  assert.equal(parsed.pageId, '12345');
  assert.equal(parsed.updatedAtText, '2026年4月10日');
  assert.equal(parsed.fiscalYearText, '令和8年度 フリーマーケット実施予定');
  assert.equal(parsed.rows.length, 3);
  assert.equal(parsed.rows[1].venueName, '東部フレンドホール');
});

test('normalizes clear rows independently and skips fuzzy date ranges', async () => {
  const parsed = parseEdogawaFleaMarketSchedule(
    await readFile(fixture, 'utf8'),
    'https://www.city.edogawa.tokyo.jp/example/freemarket.html',
  );
  const results = parsed.rows.map((row) => normalizeEdogawaFleaMarketRow(parsed, row, {
    now: new Date('2026-04-01T00:00:00.000Z'),
  }));

  assert.equal(results[0].kind, 'accepted');
  assert.equal(results[0].event.startAt, '2026-05-17T10:00:00+09:00');
  assert.equal(results[0].event.endAt, '2026-05-17T12:00:00+09:00');
  assert.deepEqual(results[0].event.recommendationTags, []);
  assert.equal(results[1].kind, 'accepted');
  assert.equal(results[1].event.startAt, '2026-10-18T09:30:00+09:00');
  assert.equal(results[1].event.endAt, '2026-10-18T15:00:00+09:00');
  assert.equal(results[2].kind, 'skipped');
  assert.equal(results[2].reason, 'invalid_datetime');
});

test('keeps stable row identity independent of the event title', async () => {
  const parsed = parseEdogawaFleaMarketSchedule(
    await readFile(fixture, 'utf8'),
    'https://www.city.edogawa.tokyo.jp/example/freemarket.html',
  );
  const first = normalizeEdogawaFleaMarketRow(parsed, parsed.rows[0]);
  const renamed = normalizeEdogawaFleaMarketRow(parsed, { ...parsed.rows[0], eventName: '名称変更後' });
  assert.equal(first.kind, 'accepted');
  assert.equal(renamed.kind, 'accepted');
  assert.equal(first.event.sourceEventId, renamed.event.sourceEventId);
});
