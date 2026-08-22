import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = new URL(
  '../../supabase/migrations/20260822150000_scope_matching_exclusions_to_plan_pairs.sql',
  import.meta.url,
);

test('Discover accepts a Fixed Plan pair when either distance or time fits', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  const discoverFunction = sql.slice(
    sql.indexOf('create or replace function public.get_discover_recommendations'),
    sql.indexOf('create or replace function public.create_fixed_schedule_invitation'),
  );

  assert.match(
    discoverFunction,
    /match\.activity_type = 'event'\s+or match\.distance_km <= 3\.0\s+or match\.time_diff_minutes <= 90/iu,
  );
  assert.match(discoverFunction, /cardinality\(match\.matched_days\) > 0/iu);
  assert.match(discoverFunction, /candidate_plan\.activity_type = my_plan\.activity_type/iu);
  assert.match(discoverFunction, /candidate_user\.onboarding_status = 'completed'/iu);
  assert.match(discoverFunction, /profile\.profile_status = 'active'/iu);
  assert.match(discoverFunction, /fp\.user_id <> v_user_id/iu);
  assert.doesNotMatch(discoverFunction, /from public\.connections/iu);
  assert.doesNotMatch(discoverFunction, /(?:place_id|place_name)\s*=\s*/iu);
});

test('invitation validation uses the same distance-or-time eligibility rule', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  const invitationFunction = sql.slice(
    sql.indexOf('create or replace function public.create_fixed_schedule_invitation'),
  );

  assert.match(
    invitationFunction,
    /and \(\s*sender_plan\.activity_type = 'event'\s+or extensions\.st_distance[\s\S]+?\/ 1000\.0 <= 3\.0\s+or least\([\s\S]+?\) <= 90\s*\)\s+and cardinality/iu,
  );
  assert.match(invitationFunction, /receiver_plan\.activity_type = sender_plan\.activity_type/iu);
  assert.match(invitationFunction, /receiver_plan\.plan_status = 'active'/iu);
  assert.match(invitationFunction, /receiver_user\.onboarding_status = 'completed'/iu);
  assert.match(invitationFunction, /receiver_profile\.profile_status = 'active'/iu);
  assert.doesNotMatch(invitationFunction, /from public\.connections/iu);
});

test('Event Fixed Plans ignore user-to-user distance and clock time as hard filters', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  const discoverFunction = sql.slice(
    sql.indexOf('create or replace function public.get_discover_recommendations'),
    sql.indexOf('create or replace function public.create_fixed_schedule_invitation'),
  );
  const invitationFunction = sql.slice(
    sql.indexOf('create or replace function public.create_fixed_schedule_invitation'),
  );

  assert.match(discoverFunction, /when my_plan\.activity_type = 'event' then 0::double precision/iu);
  assert.match(
    discoverFunction,
    /match\.activity_type = 'event'\s+or match\.distance_km <= 3\.0\s+or match\.time_diff_minutes <= 90/iu,
  );
  assert.match(invitationFunction, /sender_plan\.activity_type = 'event'\s+or extensions\.st_distance/iu);
});

test('relaxed companion matching does not relax destination recommendation rules', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /recommend_walking_public_place/iu);
  assert.match(sql, /recommend_study_reading_public_place/iu);
  assert.match(sql, /recommend_sports_public_place/iu);
  assert.doesNotMatch(sql, /create or replace function public\.recommend_(?:walking|study_reading|sports)_public_place/iu);
});
