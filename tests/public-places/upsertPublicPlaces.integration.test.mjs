import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';

import { createClient } from '@supabase/supabase-js';

import { upsertPublicPlaces } from '../../src/infrastructure/public-places/upsertPublicPlaces.ts';

const execFile = promisify(execFileCallback);
const integrationEnabled = process.env.RUN_SUPABASE_PUBLIC_PLACES_INTEGRATION === '1';

function localConfiguration() {
  const urlValue = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  assert.ok(urlValue, 'A local SUPABASE_URL is required.');
  assert.ok(serviceRoleKey, 'A local SUPABASE_SERVICE_ROLE_KEY is required.');
  assert.ok(anonKey, 'A local SUPABASE_ANON_KEY is required.');
  const url = new URL(urlValue);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'Refusing non-local Supabase URL.');
  return { url: url.toString(), serviceRoleKey, anonKey };
}

function normalizedPlace(sourcePlaceId, overrides = {}) {
  return {
    sourceDatasetId: 'integration_public_places',
    sourcePlaceId,
    sourceName: 'integration test',
    name: `place ${sourcePlaceId}`,
    category: 'library',
    address: null,
    latitude: 35.7101,
    longitude: 139.8801,
    officialUrl: null,
    description: null,
    availableDays: null,
    openTime: null,
    closeTime: null,
    hoursNote: null,
    attributes: {},
    sourceUpdatedAt: null,
    ...overrides,
  };
}

async function localSql(sql) {
  const container = process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_tomoni-app';
  const { stdout } = await execFile('docker', [
    'exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql,
  ]);
  return stdout.trim();
}

test('local public_places schema, RLS, upsert identity, and PostGIS behavior', {
  skip: !integrationEnabled,
}, async () => {
  const config = localConfiguration();
  const service = createClient(config.url, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anonymous = createClient(config.url, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const authenticated = createClient(config.url, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const suffix = crypto.randomUUID();
  const firstSourceId = `first-${suffix}`;
  const authEmail = `public-place-${suffix}@example.test`;
  const authPassword = `Local-${suffix}-password`;
  let authUserId = null;

  try {
    const first = await upsertPublicPlaces(service, [normalizedPlace(firstSourceId)]);
    assert.equal(first.succeeded, 1);
    const publicPlaceId = first.places[0].publicPlaceId;
    assert.match(publicPlaceId, /^[0-9a-f-]{36}$/iu);

    const second = await upsertPublicPlaces(service, [
      normalizedPlace(firstSourceId, { name: 'updated integration place' }),
    ]);
    assert.equal(second.places[0].publicPlaceId, publicPlaceId);

    const { data: duplicateRows, error: duplicateReadError } = await service
      .from('public_places')
      .select('public_place_id,name')
      .eq('source_dataset_id', 'integration_public_places')
      .eq('source_place_id', firstSourceId);
    assert.ifError(duplicateReadError);
    assert.equal(duplicateRows.length, 1);
    assert.equal(duplicateRows[0].name, 'updated integration place');

    const { error: sameIdDifferentDatasetError } = await service.from('public_places').insert({
      source_dataset_id: 'integration_other_dataset',
      source_place_id: firstSourceId,
      source_name: 'integration test',
      name: 'same source ID in another dataset',
      category: 'library',
      latitude: 35.71,
      longitude: 139.88,
      last_checked_at: new Date().toISOString(),
    });
    assert.ifError(sameIdDifferentDatasetError);

    const { error: duplicateError } = await service.from('public_places').insert({
      source_dataset_id: 'integration_public_places',
      source_place_id: firstSourceId,
      source_name: 'integration test',
      name: 'duplicate',
      category: 'library',
      latitude: 35.71,
      longitude: 139.88,
      last_checked_at: new Date().toISOString(),
    });
    assert.ok(duplicateError);

    for (const invalid of [
      { source_place_id: ' ', source_name: 'source', name: 'name', category: 'library', latitude: 35.7, longitude: 139.8, attributes: {} },
      { source_place_id: 'valid', source_name: 'source', name: 'name', category: 'library', latitude: 91, longitude: 139.8, attributes: {} },
      { source_place_id: 'valid2', source_name: 'source', name: 'name', category: 'library', latitude: 35.7, longitude: 181, attributes: {} },
      { source_place_id: 'valid3', source_name: 'source', name: 'name', category: 'library', latitude: 35.7, longitude: 139.8, attributes: [] },
    ]) {
      const { error } = await service.from('public_places').insert({
        source_dataset_id: 'integration_public_places',
        last_checked_at: new Date().toISOString(),
        ...invalid,
      });
      assert.ok(error);
    }

    const { data: created, error: createUserError } = await service.auth.admin.createUser({
      email: authEmail,
      password: authPassword,
      email_confirm: true,
    });
    assert.ifError(createUserError);
    authUserId = created.user.id;
    const { error: signInError } = await authenticated.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    assert.ifError(signInError);

    const { data: authenticatedRows, error: authenticatedReadError } = await authenticated
      .from('public_places')
      .select('public_place_id')
      .eq('public_place_id', publicPlaceId);
    assert.ifError(authenticatedReadError);
    assert.equal(authenticatedRows.length, 1);

    const clientInsert = {
      source_dataset_id: 'integration_client_write',
      source_place_id: suffix,
      source_name: 'client',
      name: 'forbidden',
      category: 'library',
      latitude: 35.7,
      longitude: 139.8,
      last_checked_at: new Date().toISOString(),
    };
    assert.ok((await authenticated.from('public_places').insert(clientInsert)).error);
    assert.ok((await anonymous.from('public_places').insert(clientInsert)).error);

    await upsertPublicPlaces(service, [
      normalizedPlace(`near-${suffix}`, { latitude: 35.7102, longitude: 139.8802 }),
      normalizedPlace(`far-${suffix}`, { latitude: 35.76, longitude: 139.94 }),
    ]);

    const point = await localSql(
      `select extensions.st_astext(location_point::extensions.geometry) from public.public_places where public_place_id = '${publicPlaceId}'::uuid;`,
    );
    assert.equal(point, 'POINT(139.8801 35.7101)');

    const indexDefinition = await localSql(
      "select indexdef from pg_indexes where schemaname = 'public' and indexname = 'public_places_location_point_gist';",
    );
    assert.match(indexDefinition, /USING gist \(location_point\)/iu);

    const within = await localSql(`
      with anchor as (
        select extensions.st_setsrid(extensions.st_makepoint(139.8801, 35.7101), 4326)::extensions.geography as point
      )
      select source_place_id
      from public.public_places, anchor
      where source_dataset_id = 'integration_public_places'
        and extensions.st_dwithin(location_point, anchor.point, 1000)
      order by location_point <-> anchor.point;
    `);
    const nearbyIds = within.split(/\r?\n/u);
    assert.deepEqual(nearbyIds, [firstSourceId, `near-${suffix}`]);
    assert.equal(nearbyIds.includes(`far-${suffix}`), false);
  } finally {
    await service.from('public_places').delete().like('source_dataset_id', 'integration_%');
    if (authUserId) await service.auth.admin.deleteUser(authUserId);
  }
});
