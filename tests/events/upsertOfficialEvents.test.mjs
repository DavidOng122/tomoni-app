import assert from 'node:assert/strict';
import test from 'node:test';

import {
  toOfficialEventUpsertRow,
  upsertOfficialEvents,
} from '../../src/infrastructure/events/upsertOfficialEvents.ts';

function event(overrides = {}) {
  return {
    sourceDatasetId: 'edogawa_event_calendar',
    sourceEventId: '71897',
    sourceName: '江戸川区',
    title: '公式イベント',
    description: null,
    startAt: '2026-09-01T10:00:00+09:00',
    endAt: '2026-09-01T12:00:00+09:00',
    placeName: '会場',
    address: null,
    registrationRequired: false,
    registrationStatus: 'not_required',
    registrationDeadline: null,
    registrationUrl: null,
    capacity: null,
    officialUrl: 'https://www.city.edogawa.tokyo.jp/event/example.html',
    sourceUpdatedAt: null,
    eventStatus: 'scheduled',
    statusMessage: null,
    recommendationTags: ['art_exhibition'],
    ...overrides,
  };
}

function fakeClient() {
  const records = new Map();
  const calls = [];
  let nextId = 1;

  return {
    calls,
    records,
    client: {
      from(table) {
        if (table === 'public_places') {
          return {
            async select() {
              return {
                data: [{
                  public_place_id: '10000000-0000-4000-8000-000000000001',
                  name: '会場',
                  address: null,
                }],
                error: null,
              };
            },
          };
        }
        assert.equal(table, 'events');
        return {
          upsert(rows, options) {
            calls.push({ rows, options });
            return {
              async select() {
                const data = rows.map((row) => {
                  const key = `${row.source_dataset_id}:${row.source_event_id}`;
                  const existing = records.get(key);
                  const eventId = existing?.event_id ?? `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`;
                  const stored = { ...existing, ...row, event_id: eventId };
                  records.set(key, stored);
                  return {
                    event_id: eventId,
                    source_dataset_id: row.source_dataset_id,
                    source_event_id: row.source_event_id,
                  };
                });
                return { data, error: null };
              },
            };
          },
        };
      },
    },
  };
}

test('builds upsert rows without event_id, created_at, or geocoding values', () => {
  const row = toOfficialEventUpsertRow(
    event(),
    '2026-08-21T00:00:00.000Z',
  );

  assert.equal('event_id' in row, false);
  assert.equal('created_at' in row, false);
  assert.equal(row.place_id, null);
  assert.equal(row.latitude, null);
  assert.equal(row.longitude, null);
  assert.equal(row.venue_public_place_id, null);
  assert.deepEqual(row.recommendation_tags, ['art_exhibition']);
  assert.equal(row.last_checked_at, '2026-08-21T00:00:00.000Z');
  assert.equal(row.updated_at, '2026-08-21T00:00:00.000Z');
});

test('repeat upsert keeps the database-generated event ID', async () => {
  const database = fakeClient();
  const first = await upsertOfficialEvents(database.client, [event()], {
    runStartedAt: new Date('2026-08-21T00:00:00.000Z'),
  });
  const relationship = { eventId: first.events[0].eventId };
  const second = await upsertOfficialEvents(database.client, [event({ title: '更新後' })], {
    runStartedAt: new Date('2026-08-22T00:00:00.000Z'),
  });

  assert.equal(second.events[0].eventId, first.events[0].eventId);
  assert.equal(relationship.eventId, second.events[0].eventId);
  assert.equal(database.records.get('edogawa_event_calendar:71897').title, '更新後');
  assert.equal(database.calls[0].options.onConflict, 'source_dataset_id,source_event_id');
  assert.equal(first.venueResolution.matched, 1);
});

test('duplicate source identities abort before invoking the database client', async () => {
  const database = fakeClient();

  await assert.rejects(
    upsertOfficialEvents(database.client, [event(), event({ title: 'duplicate' })]),
    /Duplicate source identities/,
  );
  assert.equal(database.calls.length, 0);
});
