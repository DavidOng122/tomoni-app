import assert from 'node:assert/strict';
import test from 'node:test';

import { toPublicPlaceUpsertRow, upsertPublicPlaces } from '../../src/infrastructure/public-places/upsertPublicPlaces.ts';

function place(overrides = {}) {
  return {
    sourceDatasetId: 'edogawa_sports_facilities',
    sourcePlaceId: '1427',
    sourceName: '江戸川区',
    name: '総合体育館',
    category: 'sports_facility',
    address: '江戸川区松本1丁目35番1号',
    latitude: 35.7101,
    longitude: 139.8801,
    officialUrl: 'https://www.city.edogawa.tokyo.jp/facility/1427.html',
    description: null,
    availableDays: ['mon', 'tue'],
    openTime: '09:00:00',
    closeTime: '22:00:00',
    hoursNote: null,
    attributes: { sports: { activities: ['basketball'] } },
    sourceUpdatedAt: null,
    ...overrides,
  };
}

function fakeClient() {
  const records = new Map();
  const calls = [];
  let nextId = 1;
  return {
    records,
    calls,
    client: {
      from(table) {
        assert.equal(table, 'public_places');
        return {
          upsert(rows, options) {
            calls.push({ rows, options });
            return {
              async select() {
                return {
                  data: rows.map((row) => {
                    const key = `${row.source_dataset_id}:${row.source_place_id}`;
                    const previous = records.get(key);
                    const id = previous?.public_place_id
                      ?? `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`;
                    records.set(key, { ...previous, ...row, public_place_id: id });
                    return {
                      public_place_id: id,
                      source_dataset_id: row.source_dataset_id,
                      source_place_id: row.source_place_id,
                    };
                  }),
                  error: null,
                };
              },
            };
          },
        };
      },
    },
  };
}

test('builds upsert payload without generated identity, created_at, or location_point', () => {
  const row = toPublicPlaceUpsertRow(place(), '2026-08-21T00:00:00.000Z');
  assert.equal('public_place_id' in row, false);
  assert.equal('created_at' in row, false);
  assert.equal('location_point' in row, false);
  assert.equal(row.last_checked_at, '2026-08-21T00:00:00.000Z');
  assert.equal(row.updated_at, '2026-08-21T00:00:00.000Z');
});

test('repeat upsert preserves the database-generated public_place_id', async () => {
  const database = fakeClient();
  const first = await upsertPublicPlaces(database.client, [place()]);
  const second = await upsertPublicPlaces(database.client, [place({ name: '更新後' })]);

  assert.equal(second.places[0].publicPlaceId, first.places[0].publicPlaceId);
  assert.equal(database.records.get('edogawa_sports_facilities:1427').name, '更新後');
  assert.equal(database.calls[0].options.onConflict, 'source_dataset_id,source_place_id');
});

test('duplicate identities abort before any database call', async () => {
  const database = fakeClient();
  await assert.rejects(
    upsertPublicPlaces(database.client, [place(), place({ name: 'duplicate' })]),
    /Duplicate public-place source identities/u,
  );
  assert.equal(database.calls.length, 0);
});
