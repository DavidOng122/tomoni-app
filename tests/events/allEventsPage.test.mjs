import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const discoverViewPath = new URL('../../src/app/discover/DiscoverView.tsx', import.meta.url);
const allEventsPagePath = new URL('../../src/app/events/page.tsx', import.meta.url);
const allEventsViewPath = new URL('../../src/app/events/AllEventsView.tsx', import.meta.url);
const timelinePath = new URL('../../src/features/events/components/EventTimeline.tsx', import.meta.url);
const timelineStylesPath = new URL('../../src/features/events/components/EventTimeline.module.css', import.meta.url);

test('地域イベントのすべて見る opens the all-events route', async () => {
  const discoverView = await readFile(discoverViewPath, 'utf8');
  assert.match(discoverView, /router\.push\('\/events'\)[\s\S]*?すべて見る/u);
});

test('all-events page loads every upcoming scheduled event without a Discover limit', async () => {
  const page = await readFile(allEventsPagePath, 'utf8');

  assert.match(page, /\.from\('events'\)/u);
  assert.match(page, /\.eq\('event_status', 'scheduled'\)/u);
  assert.match(page, /\.order\('start_at', \{ ascending: true \}\)/u);
  assert.doesNotMatch(page, /\.limit\(/u);
  assert.doesNotMatch(page, /\.eq\('event_type'/u);
  assert.match(page, /redirect\('\/welcome'\)/u);
});

test('all-events page reuses one authoritative single-column event timeline', async () => {
  const [view, timeline, styles] = await Promise.all([
    readFile(allEventsViewPath, 'utf8'),
    readFile(timelinePath, 'utf8'),
    readFile(timelineStylesPath, 'utf8'),
  ]);

  assert.match(view, /<EventTimeline events=\{events\}/u);
  assert.match(timeline, /groupEventsByTokyoDate\(events\)/u);
  assert.match(timeline, /href=\{`\/events\/\$\{event\.event_id\}`\}/u);
  assert.match(styles, /\.eventList\s*\{[\s\S]*?flex-direction:\s*column/iu);
});
