import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';

import { createClient } from '@supabase/supabase-js';

const execFile = promisify(execFileCallback);
const integrationEnabled = process.env.RUN_SUPABASE_DISCOVER_INTEGRATION === '1';

function localConfiguration() {
  const urlValue = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(urlValue, 'A local SUPABASE_URL is required.');
  assert.ok(anonKey, 'A local SUPABASE_ANON_KEY is required.');
  assert.ok(serviceRoleKey, 'A local SUPABASE_SERVICE_ROLE_KEY is required.');
  const url = new URL(urlValue);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'Refusing non-local Supabase URL.');
  return { url: url.toString(), anonKey, serviceRoleKey };
}

async function localSql(sql) {
  const container = process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_tomoni-app';
  const { stdout } = await execFile('docker', [
    'exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql,
  ]);
  return stdout.trim();
}

test('local seed and Discover RPC use geographic Fixed Plan matching', {
  skip: !integrationEnabled,
}, async () => {
  const summary = JSON.parse(await localSql(`
    with generated_plans as (
      select fixed_plan.*
      from public.fixed_plans fixed_plan
      where fixed_plan.user_id::text like '10000000-0000-4000-8000-%'
        and right(fixed_plan.user_id::text, 12) ~ '^[0-9]{12}$'
        and right(fixed_plan.user_id::text, 12)::bigint between 10 and 109
    )
    select json_build_object(
      'users', (
        select count(*) from public.users app_user
        where app_user.id::text like '10000000-0000-4000-8000-%'
          and right(app_user.id::text, 12) ~ '^[0-9]{12}$'
          and right(app_user.id::text, 12)::bigint between 10 and 109
          and app_user.account_status = 'active'
          and app_user.onboarding_status = 'completed'
      ),
      'profiles', (
        select count(*) from public.profiles profile
        where profile.user_id::text like '10000000-0000-4000-8000-%'
          and right(profile.user_id::text, 12) ~ '^[0-9]{12}$'
          and right(profile.user_id::text, 12)::bigint between 10 and 109
          and profile.profile_status = 'active'
      ),
      'uniqueNicknames', (
        select count(distinct profile.nickname) from public.profiles profile
        where profile.user_id::text like '10000000-0000-4000-8000-%'
          and right(profile.user_id::text, 12) ~ '^[0-9]{12}$'
          and right(profile.user_id::text, 12)::bigint between 10 and 109
      ),
      'numberedDemoNicknames', (
        select count(*) from public.profiles profile
        where profile.user_id::text like '10000000-0000-4000-8000-%'
          and right(profile.user_id::text, 12) ~ '^[0-9]{12}$'
          and right(profile.user_id::text, 12)::bigint between 10 and 109
          and profile.nickname like 'Yorimi Demo %'
      ),
      'plans', (select count(*) from generated_plans where plan_status = 'active'),
      'distinctCoordinates', (select count(distinct (latitude, longitude)) from generated_plans),
      'nullPlaceIds', (select count(*) from generated_plans where place_id is null),
      'uniquePlaceNames', (select count(distinct place_name) from generated_plans),
      'walking', (select count(*) from generated_plans where activity_type = 'walking'),
      'other', (select count(*) from generated_plans where activity_type = 'other'),
      'activityTypes', (select count(distinct activity_type) from generated_plans),
      'allInsideEdogawaDemoBounds', (
        select bool_and(latitude between 35.64 and 35.75 and longitude between 139.83 and 139.92)
        from generated_plans
      ),
      'areas', (
        select json_agg(area_name order by area_name)
        from (
          select distinct place_name as area_name
          from generated_plans
        ) areas
      )
    );
  `));

  assert.equal(summary.users, 100);
  assert.equal(summary.profiles, 100);
  assert.equal(summary.uniqueNicknames, 100);
  assert.equal(summary.numberedDemoNicknames, 0);
  assert.equal(summary.plans, 400);
  assert.equal(summary.distinctCoordinates, 10);
  assert.equal(summary.nullPlaceIds, 400);
  assert.equal(summary.uniquePlaceNames, 10);
  assert.equal(summary.walking, 60);
  assert.equal(summary.other, 60);
  assert.equal(summary.activityTypes, 6);
  assert.equal(summary.allInsideEdogawaDemoBounds, true);
  assert.deepEqual(summary.areas, ['一之江', '小岩', '平井', '松江', '瑞江', '篠崎', '船堀', '葛西', '西葛西', '鹿骨'].sort());

  const uncoveredWalkingCombinations = Number(await localSql(`
    with target_areas(area_name, latitude, longitude) as (
      values
        ('葛西',   35.663500::numeric, 139.872600::numeric),
        ('西葛西', 35.665900::numeric, 139.859300::numeric),
        ('船堀',   35.683700::numeric, 139.864300::numeric),
        ('一之江', 35.686200::numeric, 139.882700::numeric),
        ('瑞江',   35.693300::numeric, 139.897600::numeric),
        ('篠崎',   35.706900::numeric, 139.903600::numeric),
        ('小岩',   35.733000::numeric, 139.881700::numeric),
        ('平井',   35.706400::numeric, 139.842400::numeric),
        ('松江',   35.699300::numeric, 139.871900::numeric),
        ('鹿骨',   35.716600::numeric, 139.891300::numeric)
    ),
    target_times(start_time) as (
      select (time '00:00' + (slot * interval '30 minutes'))::time
      from generate_series(0, 47) as slot
    ),
    target_days(day_code) as (
      select unnest(array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
    ),
    target_combinations as (
      select * from target_areas cross join target_times cross join target_days
    )
    select count(*)
    from target_combinations target
    where not exists (
      select 1
      from public.fixed_plans candidate_plan
      join public.users candidate_user on candidate_user.id = candidate_plan.user_id
      join public.profiles candidate_profile on candidate_profile.user_id = candidate_plan.user_id
        where candidate_plan.user_id::text like '10000000-0000-4000-8000-%'
          and right(candidate_plan.user_id::text, 12) ~ '^[0-9]{12}$'
          and right(candidate_plan.user_id::text, 12)::bigint between 10 and 109
        and candidate_plan.activity_type = 'walking'
        and candidate_plan.plan_status = 'active'
        and candidate_user.account_status = 'active'
        and candidate_user.onboarding_status = 'completed'
        and candidate_profile.profile_status = 'active'
        and target.day_code = any(candidate_plan.days_of_week)
        and (
          least(
            abs(extract(epoch from (target.start_time - candidate_plan.start_time)) / 60.0),
            1440 - abs(extract(epoch from (target.start_time - candidate_plan.start_time)) / 60.0)
          ) <= 90
          or extensions.st_distance(
            extensions.st_setsrid(
              extensions.st_makepoint(target.longitude, target.latitude),
              4326
            )::extensions.geography,
            extensions.st_setsrid(
              extensions.st_makepoint(candidate_plan.longitude, candidate_plan.latitude),
              4326
            )::extensions.geography
          ) / 1000.0 <= 3.0
        )
    );
  `));
  assert.equal(uncoveredWalkingCombinations, 0);

  const uncoveredAllActivityCombinations = Number(await localSql(`
    with target_areas(area_name, latitude, longitude) as (
      values
        ('葛西',   35.663500::numeric, 139.872600::numeric),
        ('西葛西', 35.665900::numeric, 139.859300::numeric),
        ('船堀',   35.683700::numeric, 139.864300::numeric),
        ('一之江', 35.686200::numeric, 139.882700::numeric),
        ('瑞江',   35.693300::numeric, 139.897600::numeric),
        ('篠崎',   35.706900::numeric, 139.903600::numeric),
        ('小岩',   35.733000::numeric, 139.881700::numeric),
        ('平井',   35.706400::numeric, 139.842400::numeric),
        ('松江',   35.699300::numeric, 139.871900::numeric),
        ('鹿骨',   35.716600::numeric, 139.891300::numeric)
    ),
    target_times(start_time) as (
      select (time '00:00' + (slot * interval '30 minutes'))::time
      from generate_series(0, 47) as slot
    ),
    target_days(day_code) as (
      select unnest(array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
    ),
    target_activity_types(activity_type) as (
      select unnest(array['walking', 'dog_walking', 'sports', 'study_reading', 'event', 'other'])
    ),
    target_combinations as (
      select *
      from target_areas
      cross join target_times
      cross join target_days
      cross join target_activity_types
    )
    select count(*)
    from target_combinations target
    where not exists (
      select 1
      from public.fixed_plans candidate_plan
      join public.users candidate_user on candidate_user.id = candidate_plan.user_id
      join public.profiles candidate_profile on candidate_profile.user_id = candidate_plan.user_id
        where candidate_plan.user_id::text like '10000000-0000-4000-8000-%'
          and right(candidate_plan.user_id::text, 12) ~ '^[0-9]{12}$'
          and right(candidate_plan.user_id::text, 12)::bigint between 10 and 109
        and candidate_plan.activity_type = target.activity_type
        and candidate_plan.plan_status = 'active'
        and candidate_user.account_status = 'active'
        and candidate_user.onboarding_status = 'completed'
        and candidate_profile.profile_status = 'active'
        and target.day_code = any(candidate_plan.days_of_week)
        and (
          least(
            abs(extract(epoch from (target.start_time - candidate_plan.start_time)) / 60.0),
            1440 - abs(extract(epoch from (target.start_time - candidate_plan.start_time)) / 60.0)
          ) <= 90
          or extensions.st_distance(
            extensions.st_setsrid(
              extensions.st_makepoint(target.longitude, target.latitude),
              4326
            )::extensions.geography,
            extensions.st_setsrid(
              extensions.st_makepoint(candidate_plan.longitude, candidate_plan.latitude),
              4326
            )::extensions.geography
          ) / 1000.0 <= 3.0
        )
    );
  `));
  assert.equal(uncoveredAllActivityCombinations, 0);

  const invalidSeedPairCount = Number(await localSql(`
    select count(*)
    from public.invitation_plan_pairs pair
    join public.invitations invitation
      on invitation.invitation_id = pair.invitation_id
    join public.fixed_plans sender_plan
      on sender_plan.fixed_plan_id = pair.sender_fixed_plan_id
    join public.fixed_plans receiver_plan
      on receiver_plan.fixed_plan_id = pair.receiver_fixed_plan_id
    where invitation.invitation_status = 'pending'
      and (
        sender_plan.activity_type <> receiver_plan.activity_type
        or (
          sender_plan.activity_type <> 'event'
          and
          extensions.st_distance(
            extensions.st_setsrid(
              extensions.st_makepoint(sender_plan.longitude, sender_plan.latitude),
              4326
            )::extensions.geography,
            extensions.st_setsrid(
              extensions.st_makepoint(receiver_plan.longitude, receiver_plan.latitude),
              4326
            )::extensions.geography
          ) / 1000.0 > 3.0
          and least(
            abs(extract(epoch from (sender_plan.start_time - receiver_plan.start_time)) / 60.0),
            1440 - abs(extract(epoch from (sender_plan.start_time - receiver_plan.start_time)) / 60.0)
          ) > 90
        )
        or cardinality(array(
          select unnest(sender_plan.days_of_week)
          intersect
          select unnest(receiver_plan.days_of_week)
        )) = 0
      );
  `));
  assert.equal(invalidSeedPairCount, 0);

  const config = localConfiguration();
  const client = createClient(config.url, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const service = createClient(config.url, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({
    email: 'figma.demo@tomoni.local',
    password: 'TomoniDemo!2026',
  });
  assert.ifError(signInError);

  const callerPlanId = '20000000-0000-4000-8000-000000000001';
  const { data: recommendations, error: recommendationError } = await client.rpc(
    'get_discover_recommendations',
    { p_my_plan_id: callerPlanId },
  );
  assert.ifError(recommendationError);
  assert.ok(recommendations.length > 0, 'Different place labels/IDs should still produce nearby matches.');

  for (const recommendation of recommendations) {
    assert.notEqual(recommendation.candidateId, '10000000-0000-4000-8000-000000000001');
    assert.equal(recommendation.match.activityType, 'walking');
    assert.ok(
      recommendation.match.distanceKm <= 3
        || recommendation.match.timeDifferenceMinutes <= 90,
      'Every recommendation must fit either the distance or time threshold.',
    );
    assert.ok(recommendation.match.matchedDays.some((day) => ['tue', 'thu'].includes(day)));
  }

  const candidatePlanIds = recommendations.map((item) => item.match.candidatePlanId);
  const { data: candidatePlans, error: plansError } = await service
    .from('fixed_plans')
    .select('fixed_plan_id,place_id,place_name,plan_status')
    .in('fixed_plan_id', candidatePlanIds);
  assert.ifError(plansError);
  assert.equal(candidatePlans.length, recommendations.length);
  assert.ok(candidatePlans.every((plan) => plan.plan_status === 'active'));
  const generatedCandidatePlans = candidatePlans.filter((plan) => {
    const numericSuffix = Number(plan.fixed_plan_id.slice(-12));
    return numericSuffix >= 10 && numericSuffix <= 109;
  });
  assert.ok(generatedCandidatePlans.length > 0);
  assert.ok(generatedCandidatePlans.every((plan) => plan.place_id === null));
  assert.ok(generatedCandidatePlans.every((plan) => plan.place_name !== '行船公園'));
});
