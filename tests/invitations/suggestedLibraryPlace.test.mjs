import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(new URL(
  '../../supabase/migrations/20260822120000_recommend_libraries_for_study_reading.sql',
  import.meta.url,
), 'utf8');

test('study and reading recommendation uses only Edogawa libraries near both people', () => {
  assert.match(migration, /create function public\.recommend_study_reading_public_place/iu);
  assert.match(migration, /place\.category = 'library'/iu);
  assert.match(migration, /place\.source_dataset_id = 'edogawa_public_libraries'/iu);
  assert.match(migration, /st_dwithin\(place\.location_point, points\.sender_point, 3200\)/iu);
  assert.match(migration, /st_dwithin\(place\.location_point, points\.receiver_point, 3200\)/iu);
  assert.match(migration, /greatest\(eligible\.sender_distance_meters, eligible\.receiver_distance_meters\)[\s\S]+eligible\.sender_distance_meters \+ eligible\.receiver_distance_meters[\s\S]+eligible\.public_place_id/iu);
});

test('study and reading invitations use server-selected libraries without changing park logic', () => {
  assert.match(migration, /if v_sender_activity_type in \('walking', 'dog_walking'\) then[\s\S]+recommend_walking_public_place/iu);
  assert.match(migration, /elsif v_sender_activity_type = 'study_reading' then[\s\S]+recommend_study_reading_public_place/iu);
  assert.match(migration, /Study and reading recommendations are selected by the server/iu);
  assert.doesNotMatch(migration, /delete from public\.(?:public_places|events|invitations|invitation_plan_pairs)/iu);
});

test('backfill is limited to active study and reading invitation pairs without an existing suggestion', () => {
  assert.match(migration, /invitation\.invitation_status in \('pending', 'accepted'\)/iu);
  assert.equal((migration.match(/activity_type = 'study_reading'/giu) ?? []).length, 3);
  assert.match(migration, /pair\.suggested_public_place_id is null[\s\S]+pair\.suggested_event_id is null/iu);
});
