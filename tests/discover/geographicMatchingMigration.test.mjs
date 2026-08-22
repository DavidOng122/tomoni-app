import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const matchingMigrationPath = new URL(
  '../../supabase/migrations/20260821030000_update_fixed_plan_geographic_matching.sql',
  import.meta.url,
);
const demoSeedPath = new URL(
  '../../supabase/snippets/demo_candidates.sql',
  import.meta.url,
);
const demoCoverageMigrationPath = new URL(
  '../../supabase/snippets/demo_candidates.sql',
  import.meta.url,
);
const demoAllActivityCoverageMigrationPath = new URL(
  '../../supabase/snippets/demo_candidates.sql',
  import.meta.url,
);
const demoProfileNamesMigrationPath = new URL(
  '../../supabase/snippets/demo_candidates.sql',
  import.meta.url,
);

test('Discover hard filters use coordinates, not Google Place identity', async () => {
  const sql = await readFile(matchingMigrationPath, 'utf8');

  assert.match(sql, /candidate_plan\.activity_type\s*=\s*my_plan\.activity_type/iu);
  assert.match(sql, /cardinality\(matched_days\)\s*>\s*0/iu);
  assert.match(sql, /time_diff_minutes\s*<=\s*90/iu);
  assert.match(sql, /distance_km\s*<=\s*3\.0/iu);
  assert.match(sql, /fp\.plan_status\s*=\s*'active'/iu);
  assert.match(sql, /candidate_user\.onboarding_status\s*=\s*'completed'/iu);
  assert.match(sql, /profile\.profile_status\s*=\s*'active'/iu);
  assert.match(sql, /fp\.user_id\s*<>\s*v_user_id/iu);
  assert.match(sql, /extensions\.st_distance/iu);
  assert.doesNotMatch(sql, /(?:place_id|place_name)\s*=\s*/iu);
});

test('Discover ranks by distance, time, then shared tags', async () => {
  const sql = await readFile(matchingMigrationPath, 'utf8');

  assert.match(
    sql,
    /order by\s+distance_km asc,\s+time_diff_minutes asc,\s+cardinality\(shared_tags\) desc/iu,
  );
  assert.match(sql, /select distinct my_tag[\s\S]+my_tag = any\(candidate_plan\.profile_tags\)/iu);
});

test('invitation eligibility uses the same 3km and 90-minute hard limits', async () => {
  const sql = await readFile(matchingMigrationPath, 'utf8');
  const invitationFunction = sql.slice(sql.indexOf('create or replace function public.create_fixed_schedule_invitation'));

  assert.match(invitationFunction, /candidate_plan\.activity_type\s*=\s*my_plan\.activity_type/iu);
  assert.match(invitationFunction, /\/\s*1000\.0\s*<=\s*3\.0/iu);
  assert.match(invitationFunction, /\)\s*<=\s*90/iu);
  assert.match(invitationFunction, /candidate_plan\.plan_status\s*=\s*'active'/iu);
  assert.match(invitationFunction, /candidate_user\.onboarding_status\s*=\s*'completed'/iu);
  assert.match(invitationFunction, /candidate_profile\.profile_status\s*=\s*'active'/iu);
  assert.doesNotMatch(invitationFunction, /(?:place_id|place_name)\s*=\s*/iu);
});

test('demo seed generates 100 diverse Edogawa candidates with display-only places', async () => {
  const sql = await readFile(demoSeedPath, 'utf8');

  assert.match(sql, /generate_series\(10,\s*109\)/iu);
  for (const area of ['葛西', '西葛西', '船堀', '一之江', '瑞江', '篠崎', '小岩', '平井', '松江', '鹿骨']) {
    assert.match(sql, new RegExp(`'${area}'`, 'u'));
  }
  assert.match(sql, /candidate_number - 10 < 60 then 'walking'/iu);
  assert.match(sql, /candidate_number - 10 < 72 then 'dog_walking'/iu);
  assert.match(sql, /candidate_number - 10 < 84 then 'sports'/iu);
  assert.match(sql, /candidate_number - 10 < 94 then 'study_reading'/iu);
  assert.match(sql, /else 'event'/iu);
  assert.match(sql, /start_time,\s+null,\s+area_name,\s+latitude,\s+longitude/iu);
  assert.doesNotMatch(sql, /エリア\s*'\s*\|\|/iu);
  assert.doesNotMatch(sql, /offset_number \* 0\.000001/iu);
});

test('demo coverage migration spans every half-hour and all six activity types', async () => {
  const sql = await readFile(demoCoverageMigrationPath, 'utf8');

  assert.match(sql, /generate_series\(10,\s*109\)/iu);
  assert.match(sql, /offset_number < 48 then[\s\S]+offset_number \* interval '30 minutes'/iu);
  assert.match(sql, /offset_number < 60 then array\['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'\]/iu);
  assert.match(sql, /offset_number < 60 then 'walking'/iu);
  assert.match(sql, /offset_number < 70 then 'dog_walking'/iu);
  assert.match(sql, /offset_number < 80 then 'sports'/iu);
  assert.match(sql, /offset_number < 90 then 'study_reading'/iu);
  assert.match(sql, /offset_number < 95 then 'event'/iu);
  assert.match(sql, /else 'other'/iu);
  assert.match(sql, /place_id = null/iu);
});

test('expands the walking coverage template to every other activity type', async () => {
  const sql = await readFile(demoAllActivityCoverageMigrationPath, 'utf8');

  for (const activityType of ['dog_walking', 'sports', 'study_reading', 'event', 'other']) {
    assert.match(sql, new RegExp(`'${activityType}'`, 'u'));
  }
  assert.match(sql, /between 10 and 69/iu);
  assert.match(sql, /cross join activity_variants/iu);
  assert.match(sql, /on conflict \(fixed_plan_id\) do update/iu);
  assert.match(sql, /place_id[\s\S]+null,[\s\S]+place_name/iu);
});

test('replaces numbered Demo labels with 100 unique natural names', async () => {
  const sql = await readFile(demoProfileNamesMigrationPath, 'utf8');
  const entries = [...sql.matchAll(/^\s*\((\d+),\s*'([^']+)'\),?$/gmu)];
  const candidateNumbers = entries.map((entry) => Number(entry[1]));
  const nicknames = entries.map((entry) => entry[2]);

  assert.equal(entries.length, 100);
  assert.deepEqual(candidateNumbers, Array.from({ length: 100 }, (_, index) => index + 10));
  assert.equal(new Set(nicknames).size, 100);
  assert.ok(nicknames.every((nickname) => nickname.trim() === nickname && nickname.length > 0));
  assert.doesNotMatch(sql, /Yorimi Demo/iu);
  assert.match(sql, /update public\.profiles as profile/iu);
  assert.match(sql, /where profile\.user_id = named_demo_profiles\.user_id/iu);
});
