import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { normalizeEdogawaOfficialEvent } from '../../src/features/events/domain/normalizeEdogawaOfficialEvent.ts';
import { validateNormalizedOfficialEvent } from '../../src/features/events/domain/validateNormalizedOfficialEvent.ts';
import { parseEdogawaEventPage } from '../../src/infrastructure/open-data/edogawa/parseEdogawaEventPage.ts';

const fixtureUrl = new URL('../fixtures/edogawa-events/', import.meta.url);
const sourceUrl = 'https://www.city.edogawa.tokyo.jp/event/example.html';

async function parsedFixture(name) {
  const html = await readFile(new URL(name, fixtureUrl), 'utf8');
  const result = parseEdogawaEventPage(html, sourceUrl);
  assert.equal(result.kind, 'parsed');
  return result.page;
}

function normalizeAndValidate(page, now = new Date('2026-08-15T00:00:00.000Z')) {
  return validateNormalizedOfficialEvent(
    normalizeEdogawaOfficialEvent(page, { now }),
  );
}

test('normalizes a same-day event with start and end times', async () => {
  const result = normalizeAndValidate(await parsedFixture('standard-event.html'));

  assert.equal(result.kind, 'accepted');
  assert.equal(result.event.sourceDatasetId, 'edogawa_event_calendar');
  assert.equal(result.event.sourceEventId, '71897');
  assert.equal(result.event.startAt, '2026-09-05T10:30:00+09:00');
  assert.equal(result.event.endAt, '2026-09-05T12:00:00+09:00');
  assert.equal(result.event.sourceUpdatedAt, '2026-08-10T00:00:00+09:00');
  assert.equal(result.event.capacity, 100);
  assert.deepEqual(result.event.recommendationTags, []);
});

test('normalizes an event with a start time and no end time', async () => {
  const result = normalizeAndValidate(await parsedFixture('reordered-event.html'));

  assert.equal(result.kind, 'accepted');
  assert.equal(result.event.startAt, '2026-09-12T13:00:00+09:00');
  assert.equal(result.event.endAt, null);
});

test('normalizes one continuous cross-day event', async () => {
  const result = normalizeAndValidate(await parsedFixture('cross-day-event.html'));

  assert.equal(result.kind, 'accepted');
  assert.equal(result.event.startAt, '2026-09-19T10:00:00+09:00');
  assert.equal(result.event.endAt, '2026-09-20T16:00:00+09:00');
});

test('skips a date-only event without inventing a start time', async () => {
  const page = await parsedFixture('reordered-event.html');
  page.dateTimeItems = ['2026年9月12日（土曜日）'];

  const result = normalizeAndValidate(page);
  assert.equal(result.kind, 'skipped');
  assert.equal(result.reason, 'missing_start_at');
});

test('skips malformed datetime text', async () => {
  const page = await parsedFixture('reordered-event.html');
  page.dateTimeItems = ['2026年13月40日（土曜日）25時'];

  const result = normalizeAndValidate(page);
  assert.equal(result.kind, 'skipped');
  assert.equal(result.reason, 'invalid_datetime');
});

test('skips multiple date list items', async () => {
  const result = normalizeAndValidate(await parsedFixture('multiple-occurrences.html'));

  assert.equal(result.kind, 'skipped');
  assert.equal(result.reason, 'multiple_occurrences');
});

test('skips 全6回 and 各日 repeated sessions even with one date item', async () => {
  const page = await parsedFixture('reordered-event.html');
  page.dateTimeNotes = ['全6回、各日13時から開催します。'];

  const result = normalizeAndValidate(page);
  assert.equal(result.kind, 'skipped');
  assert.equal(result.reason, 'multiple_occurrences');
});

test('skips a broad range when the page description says it contains 全6回', async () => {
  const page = await parsedFixture('cross-day-event.html');
  page.descriptionText = '期間中に全6回の独立した講義を開催します。';

  const result = normalizeAndValidate(page);
  assert.equal(result.kind, 'skipped');
  assert.equal(result.reason, 'multiple_occurrences');
});

test('maps registration not required', async () => {
  const result = normalizeAndValidate(await parsedFixture('reordered-event.html'));

  assert.equal(result.kind, 'accepted');
  assert.equal(result.event.registrationRequired, false);
  assert.equal(result.event.registrationStatus, 'not_required');
});

test('maps registration to not_started, open, and closed using an injected clock', async () => {
  const page = await parsedFixture('standard-event.html');
  const notStarted = normalizeAndValidate(page, new Date('2026-07-31T00:00:00.000Z'));
  const open = normalizeAndValidate(page, new Date('2026-08-15T00:00:00.000Z'));
  const closed = normalizeAndValidate(page, new Date('2026-09-02T00:00:00.000Z'));

  assert.equal(notStarted.kind, 'accepted');
  assert.equal(notStarted.event.registrationStatus, 'not_started');
  assert.equal(open.kind, 'accepted');
  assert.equal(open.event.registrationStatus, 'open');
  assert.equal(closed.kind, 'accepted');
  assert.equal(closed.event.registrationStatus, 'closed');
  assert.equal(open.event.registrationDeadline, '2026-09-01T17:00:00+09:00');
});

test('uses full only when the source explicitly says capacity was reached', async () => {
  const page = await parsedFixture('standard-event.html');
  page.registrationRequiredText += '\n定員に達したため受付終了';

  const result = normalizeAndValidate(page);
  assert.equal(result.kind, 'accepted');
  assert.equal(result.event.registrationStatus, 'full');
});

test('uses an explicit capacity-reached notice in the official description', async () => {
  const page = await parsedFixture('standard-event.html');
  page.descriptionText = '現在、お申込みが定員に達したためキャンセル待ちです。';

  const result = normalizeAndValidate(page);
  assert.equal(result.kind, 'accepted');
  assert.equal(result.event.registrationStatus, 'full');
});

test('keeps registration unknown when no reliable period or explicit status exists', async () => {
  const result = normalizeAndValidate(await parsedFixture('cross-day-event.html'));

  assert.equal(result.kind, 'accepted');
  assert.equal(result.event.registrationRequired, true);
  assert.equal(result.event.registrationStatus, 'unknown');
  assert.equal(result.event.registrationUrl, null);
});

test('maps an HTTP registration link but not phone or window instructions', async () => {
  const online = normalizeAndValidate(await parsedFixture('standard-event.html'));
  const offline = normalizeAndValidate(await parsedFixture('cross-day-event.html'));

  assert.equal(online.kind, 'accepted');
  assert.equal(online.event.registrationUrl, 'https://www.city.edogawa.tokyo.jp/apply/71897.html');
  assert.equal(offline.kind, 'accepted');
  assert.equal(offline.event.registrationUrl, null);
});

test('accepts nullable description, address, capacity, deadline, and registration URL', async () => {
  const page = await parsedFixture('cross-day-event.html');
  page.descriptionText = null;
  const result = normalizeAndValidate(page);

  assert.equal(result.kind, 'accepted');
  assert.equal(result.event.description, null);
  assert.equal(result.event.address, null);
  assert.equal(result.event.capacity, null);
  assert.equal(result.event.registrationDeadline, null);
  assert.equal(result.event.registrationUrl, null);
});

test('maps only explicit cancellation, postponement, and rescheduling notices', async () => {
  const original = await parsedFixture('standard-event.html');

  for (const [notice, status] of [
    ['【開催中止】夏の文化講座', 'cancelled'],
    ['開催延期のお知らせ', 'postponed'],
    ['【日程変更】夏の文化講座', 'rescheduled'],
  ]) {
    const result = normalizeAndValidate({
      ...original,
      explicitStatusNotices: [notice],
    });
    assert.equal(result.kind, 'accepted');
    assert.equal(result.event.eventStatus, status);
    assert.equal(result.event.statusMessage, notice);
  }
});

test('skips missing identity, title, and place with deterministic reasons', async () => {
  const original = await parsedFixture('standard-event.html');

  for (const [field, reason] of [
    ['sourceEventId', 'missing_source_event_id'],
    ['titleText', 'missing_title'],
    ['placeText', 'missing_place_name'],
  ]) {
    const result = normalizeAndValidate({ ...original, [field]: null });
    assert.equal(result.kind, 'skipped');
    assert.equal(result.reason, reason);
  }
});
