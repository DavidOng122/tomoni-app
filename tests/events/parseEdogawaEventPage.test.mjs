import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parseEdogawaEventPage } from '../../src/infrastructure/open-data/edogawa/parseEdogawaEventPage.ts';

const fixtureUrl = new URL('../fixtures/edogawa-events/', import.meta.url);
const sourceUrl = 'https://www.city.edogawa.tokyo.jp/event/example.html';

async function fixture(name) {
  return readFile(new URL(name, fixtureUrl), 'utf8');
}

test('parses the visible page ID, title, description, and semantic sections', async () => {
  const result = parseEdogawaEventPage(await fixture('standard-event.html'), sourceUrl);

  assert.equal(result.kind, 'parsed');
  assert.equal(result.page.sourceEventId, '71897');
  assert.equal(result.page.titleText, '夏の文化講座');
  assert.equal(result.page.descriptionText, '地域文化を学ぶ公開講座です。');
  assert.equal(result.page.placeText, '江戸川区文化センター');
  assert.equal(result.page.addressText, '東京都江戸川区中央4丁目');
  assert.equal(result.page.organizerText, '江戸川区');
  assert.doesNotMatch(result.page.organizerText, /カレンダー/);
  assert.equal(result.page.capacityText, '100名（申込順）');
  assert.deepEqual(result.page.dateTimeItems, [
    '2026年9月5日（土曜日）10時30分から12時00分',
  ]);
  assert.deepEqual(result.page.registrationLinks, [{
    label: '電子申請で申し込む',
    url: 'https://www.city.edogawa.tokyo.jp/apply/71897.html',
  }]);
});

test('parses reordered sections by their labels', async () => {
  const result = parseEdogawaEventPage(await fixture('reordered-event.html'), sourceUrl);

  assert.equal(result.kind, 'parsed');
  assert.equal(result.page.sourceEventId, '72433');
  assert.equal(result.page.placeText, '船堀広場');
  assert.equal(result.page.organizerText, '地域振興課');
  assert.equal(result.page.registrationRequiredText, '不要');
});

test('returns a parse error for an unsupported page template', async () => {
  const result = parseEdogawaEventPage(await fixture('malformed-page.html'), sourceUrl);

  assert.deepEqual(result, {
    kind: 'parse_error',
    code: 'unsupported_page_format',
    message: 'The page does not contain the supported Edogawa event detail structure.',
    sourceUrl,
  });
});

test('returns a parse error when the visible and embedded page IDs differ', async () => {
  const html = (await fixture('standard-event.html')).replace(
    'name="page_id" value="71897"',
    'name="page_id" value="99999"',
  );
  const result = parseEdogawaEventPage(html, sourceUrl);

  assert.equal(result.kind, 'parse_error');
  assert.equal(result.code, 'mismatched_page_ids');
});

test('extracts only controlled explicit event-status notices', async () => {
  const html = (await fixture('standard-event.html')).replace(
    '<h1>夏の文化講座</h1>',
    '<h1>【開催中止】夏の文化講座</h1>',
  );
  const result = parseEdogawaEventPage(html, sourceUrl);

  assert.equal(result.kind, 'parsed');
  assert.deepEqual(result.page.explicitStatusNotices, ['【開催中止】夏の文化講座']);
});
