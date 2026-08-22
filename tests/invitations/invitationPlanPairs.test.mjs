import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = new URL(
  '../../supabase/migrations/20260821050000_add_invitation_plan_pairs.sql',
  import.meta.url,
);
const scopedPairMigrationPath = new URL(
  '../../supabase/migrations/20260822150000_scope_matching_exclusions_to_plan_pairs.sql',
  import.meta.url,
);

test('fixed-plan invitation migration persists an exact validated plan pair atomically', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /create table public\.invitation_plan_pairs/iu);
  assert.match(sql, /invitation_id uuid not null unique/iu);
  assert.match(sql, /sender_fixed_plan_id uuid not null/iu);
  assert.match(sql, /receiver_fixed_plan_id uuid not null/iu);
  assert.doesNotMatch(sql, /matched_days|distance_km|time_difference_minutes/iu);
  assert.match(sql, /p_receiver_fixed_plan_id uuid/iu);
  assert.match(sql, /receiver_plan\.fixed_plan_id = p_receiver_fixed_plan_id/iu);
  assert.match(sql, /receiver_plan\.user_id = p_receiver_id/iu);
  assert.match(sql, /sender_plan\.user_id = v_sender_id/iu);
  assert.match(sql, /receiver_plan\.activity_type = sender_plan\.activity_type/iu);
  assert.match(sql, /\/ 1000\.0 <= 3\.0/iu);
  assert.match(sql, /\) <= 90/iu);
  assert.match(sql, /insert into public\.invitations[\s\S]+insert into public\.invitation_plan_pairs[\s\S]+insert into public\.conversations/iu);
  assert.match(sql, /on conflict \(invitation_id\) do nothing/iu);
  assert.match(sql, /invitation\.invitation_type = 'fixed_plan'/iu);
  assert.doesNotMatch(sql, /drop function[^;]+create_event_invitation/iu);
});

test('matching exclusion is direction-independent and scoped to the exact Fixed Plan pair', async () => {
  const sql = await readFile(scopedPairMigrationPath, 'utf8');
  const discoverFunction = sql.slice(
    sql.indexOf('create or replace function public.get_discover_recommendations'),
    sql.indexOf('create or replace function public.create_fixed_schedule_invitation'),
  );
  const createInvitationFunction = sql.slice(
    sql.indexOf('create or replace function public.create_fixed_schedule_invitation'),
  );

  assert.match(sql, /least\(pair\.sender_fixed_plan_id, pair\.receiver_fixed_plan_id\)/iu);
  assert.match(sql, /greatest\(pair\.sender_fixed_plan_id, pair\.receiver_fixed_plan_id\)/iu);
  assert.match(sql, /invitation\.invitation_status in \('pending', 'accepted', 'declined'\)/iu);
  assert.doesNotMatch(discoverFunction, /from public\.connections/iu);
  assert.match(discoverFunction, /get_blocking_fixed_plan_pair_invitation\(\s*match\.my_plan_id,\s*match\.candidate_plan_id/iu);
  assert.match(createInvitationFunction, /pg_advisory_xact_lock/iu);
  assert.match(createInvitationFunction, /least\(p_fixed_plan_id, p_receiver_fixed_plan_id\)/iu);
  assert.match(createInvitationFunction, /greatest\(p_fixed_plan_id, p_receiver_fixed_plan_id\)/iu);
  assert.match(createInvitationFunction, /invitation_status = 'pending'/iu);
  assert.match(createInvitationFunction, /blocked by invitation status %/iu);
  assert.doesNotMatch(createInvitationFunction, /from public\.connections/iu);
});
