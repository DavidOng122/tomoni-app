import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildEdogawaEventCalendarUrl,
  parseEdogawaEventCalendar,
} from '../../src/infrastructure/open-data/edogawa/fetchEdogawaEventCalendar.ts';

test('builds a deterministic Edogawa monthly calendar URL', () => {
  const url = new URL(buildEdogawaEventCalendarUrl({ year: 2026, month: 9 }));

  assert.equal(url.hostname, 'www.city.edogawa.tokyo.jp');
  assert.equal(url.searchParams.get('event_area'), '1');
  assert.equal(url.searchParams.get('year'), '2026');
  assert.equal(url.searchParams.get('month'), '9');
});

test('discovers and deduplicates only official event detail links', () => {
  const html = `
    <a href="/event/one.html#details"> One </a>
    <a href="https://www.city.edogawa.tokyo.jp/event/one.html">Duplicate</a>
    <a href="/e093/event/two.html">Two</a>
    <a href="https://example.com/event/external.html">External</a>
    <a href="/event/list.pdf">PDF</a>
  `;
  const pages = parseEdogawaEventCalendar(
    html,
    'https://www.city.edogawa.tokyo.jp/cgi-bin/event_cal_multi/calendar.cgi',
  );

  assert.deepEqual(pages, [
    {
      url: 'https://www.city.edogawa.tokyo.jp/event/one.html',
      linkText: 'One',
    },
    {
      url: 'https://www.city.edogawa.tokyo.jp/e093/event/two.html',
      linkText: 'Two',
    },
  ]);
});
