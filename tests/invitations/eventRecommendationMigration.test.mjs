import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL('../../supabase/migrations/20260822050000_add_event_fixed_plan_recommendations.sql', import.meta.url);
const softDistanceMigrationUrl = new URL('../../supabase/migrations/20260822060000_make_event_recommendation_distance_soft.sql', import.meta.url);
const focusedRecommendationMigrationUrl = new URL('../../supabase/migrations/20260822070000_narrow_event_recommendation_focus.sql', import.meta.url);
const weekdayOnlyMigrationUrl = new URL('../../supabase/migrations/20260822080000_event_plans_use_weekdays_only.sql', import.meta.url);
const artPriorityMigrationUrl = new URL('../../supabase/migrations/20260822090000_prioritize_art_event_recommendations.sql', import.meta.url);
const catalogCleanupMigrationUrl = new URL('../../supabase/migrations/20260822110000_prune_event_recommendation_catalog.sql', import.meta.url);

test('event recommendation migration defines the approved schema and mutually exclusive suggestion constraint', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /add column recommendation_tags text\[\] not null default '\{\}'/u);
  assert.match(sql, /add column venue_public_place_id uuid/u);
  assert.match(sql, /add column suggested_event_id uuid/u);
  assert.match(sql, /num_nonnulls\(suggested_public_place_id, suggested_event_id\) <= 1/u);
  assert.match(sql, /recommendation_tags <@ array\[/u);
});

test('event recommendation RPC contains every approved hard filter and deterministic tie-break', async () => {
  const sql = await readFile(weekdayOnlyMigrationUrl, 'utf8');

  assert.match(sql, /sender_plan\.activity_type = 'event'/u);
  assert.match(sql, /receiver_plan\.activity_type = 'event'/u);
  assert.match(sql, /event\.event_type = 'official'/u);
  assert.match(sql, /event\.event_status = 'scheduled'/u);
  assert.match(sql, /now\(\) \+ interval '24 hours'/u);
  assert.match(sql, /now\(\) \+ interval '60 days'/u);
  assert.match(sql, /event\.registration_status in \('not_required', 'open', 'not_started'\)/u);
  assert.doesNotMatch(sql, /\) <= 120/u);
  assert.doesNotMatch(sql, /st_dwithin/u);
  assert.match(sql, /'art_exhibition' = any\(scored\.recommendation_tags\)/u);
  assert.match(sql, /greatest\(scored\.sender_distance_meters, scored\.receiver_distance_meters\)/u);
  assert.match(sql, /row_number\(\) over/u);
  assert.match(sql, /scored\.event_id/u);
});

test('event Fixed Plans use shared weekdays without a user-selected time', async () => {
  const sql = await readFile(weekdayOnlyMigrationUrl, 'utf8');

  assert.match(sql, /set start_time = time '12:00'/u);
  assert.match(sql, /when my_plan\.activity_type = 'event' then 0/u);
  assert.match(sql, /activity_type <> 'event' and time_diff_minutes <= 30/u);
  assert.ok(sql.includes("'exhibition_space', 'aquarium', 'zoo', 'museum', 'cinema'"));
});

test('one Top 3 prioritizes art exhibitions, exhibition spaces, and museums before other outings', async () => {
  const sql = await readFile(artPriorityMigrationUrl, 'utf8');

  assert.match(sql, /when 'art_exhibition' = any\(event\.recommendation_tags\) then 0 else 3/u);
  assert.match(sql, /when 'exhibition_space' then 1/u);
  assert.match(sql, /when 'museum' then 2/u);
  assert.match(sql, /else 4/u);
  assert.match(sql, /select \* from eligible_events[\s\S]*union all[\s\S]*select \* from eligible_facilities/u);
  assert.match(sql, /order by[\s\S]*combined\.focus_rank/u);
});

test('event recommendation focus excludes broad community content while preserving source rows', async () => {
  const sql = await readFile(focusedRecommendationMigrationUrl, 'utf8');

  assert.match(sql, /'art_exhibition'/u);
  assert.match(sql, /'film'/u);
  assert.match(sql, /'music_performance'/u);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.events/iu);
  assert.doesNotMatch(sql, /'culture_workshop'/u);
  assert.doesNotMatch(sql, /'community_festival'/u);
  assert.doesNotMatch(sql, /'market_flea'/u);
});

test('selection is revalidated in the database and existing park recommendation stays server-selected', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /v_sender_activity_type in \('walking', 'dog_walking'\)/u);
  assert.match(sql, /recommend_walking_public_place/u);
  assert.match(sql, /Selected event is not an eligible recommendation/u);
  assert.match(sql, /Selected cultural facility is not an eligible recommendation/u);
  assert.doesNotMatch(sql, /insert into public\.event_participations/iu);
});

test('invitation recommendation hides precise venue data until acceptance', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /case when invitation\.invitation_status = 'accepted'[\s\S]*event_venue\.address/u);
  assert.match(sql, /case when invitation\.invitation_status = 'accepted'[\s\S]*event_venue\.latitude/u);
  assert.match(sql, /case when invitation\.invitation_status = 'accepted'[\s\S]*event\.official_url/u);
});

test('catalog cleanup deletes only unsupported official Event data and ordinary unused venues', async () => {
  const sql = await readFile(catalogCleanupMigrationUrl, 'utf8');

  assert.match(sql, /delete from public\.events[\s\S]+event_type = 'official'/u);
  assert.match(sql, /'art_exhibition', 'film', 'music_performance'/u);
  assert.match(sql, /place\.category = 'community_facility'/u);
  assert.match(sql, /not exists[\s\S]+event\.venue_public_place_id = place\.public_place_id/u);
  assert.match(sql, /pair\.suggested_public_place_id = place\.public_place_id/u);
  assert.doesNotMatch(sql, /event_type = 'user_created'/u);
  assert.doesNotMatch(sql, /place\.category = 'park'/u);
});
