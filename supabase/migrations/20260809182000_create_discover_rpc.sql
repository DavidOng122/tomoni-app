-- Create the RPC for Phase 2B MVP Discover Matching

create or replace function public.get_discover_recommendations(
  p_my_plan_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_result jsonb := '[]'::jsonb;
begin
  -- 1. Identify User securely
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  -- 2. Verify p_my_plan_id if provided
  if p_my_plan_id is not null then
    if not exists (
      select 1 from public.fixed_plans 
      where fixed_plan_id = p_my_plan_id 
        and user_id = v_user_id 
        and plan_status = 'active'
    ) then
      -- If the user doesn't own this plan or it's not active, return empty
      return v_result;
    end if;
  end if;

  -- 3. Execute Matching
  with my_active_plans as (
    select *
    from public.fixed_plans
    where user_id = v_user_id
      and plan_status = 'active'
      and (p_my_plan_id is null or fixed_plan_id = p_my_plan_id)
      and latitude is not null
      and longitude is not null
  ),
  candidate_active_plans as (
    select fp.*, p.nickname, p.avatar_url, p.age_range, p.gender, p.tags as profile_tags
    from public.fixed_plans fp
    join public.users u on u.id = fp.user_id
    join public.profiles p on p.user_id = fp.user_id
    where fp.user_id != v_user_id
      and fp.plan_status = 'active'
      and u.account_status = 'active'
      and u.onboarding_status = 'completed'
      and p.profile_status = 'active'
      and fp.latitude is not null
      and fp.longitude is not null
      and fp.activity_type != 'other'
      -- Bidirectional Connection Exclusion
      and not exists (
        select 1 from public.connections c
        where c.connection_status = 'active'
          and (
            (c.user_a_id = v_user_id and c.user_b_id = fp.user_id) or
            (c.user_b_id = v_user_id and c.user_a_id = fp.user_id)
          )
      )
      -- Bidirectional Invitation Exclusion
      and not exists (
        select 1 from public.invitations i
        where i.invitation_status in ('pending', 'accepted')
          and (
            (i.sender_user_id = v_user_id and i.receiver_user_id = fp.user_id) or
            (i.sender_user_id = fp.user_id and i.receiver_user_id = v_user_id)
          )
      )
  ),
  matches as (
    select
      m.fixed_plan_id as my_plan_id,
      m.start_time as my_start_time,
      m.days_of_week as my_days,
      c.user_id as candidate_id,
      c.fixed_plan_id as candidate_plan_id,
      c.start_time as candidate_start_time,
      c.days_of_week as candidate_days,
      c.activity_type,
      c.nickname,
      c.avatar_url,
      c.age_range,
      c.gender,
      c.profile_tags,
      -- Geography Distance calculation in meters, then to km
      extensions.st_distance(
        extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326)::extensions.geography,
        extensions.st_setsrid(extensions.st_makepoint(c.longitude, c.latitude), 4326)::extensions.geography
      ) / 1000.0 as distance_km,
      
      -- Shared days intersection
      array(
        select unnest(m.days_of_week) intersect select unnest(c.days_of_week)
      ) as matched_days,
      
      -- Time difference (circular 24h) in minutes
      least(
        abs(extract(epoch from (m.start_time - c.start_time))/60.0),
        1440 - abs(extract(epoch from (m.start_time - c.start_time))/60.0)
      ) as time_diff_minutes
      
    from my_active_plans m
    join candidate_active_plans c on m.activity_type = c.activity_type
  ),
  filtered_matches as (
    select *
    from matches
    where distance_km <= 3.0
      and time_diff_minutes <= 60
      and cardinality(matched_days) > 0
  ),
  ranked_matches as (
    select *,
      row_number() over (
        partition by candidate_id 
        order by 
          distance_km asc, 
          time_diff_minutes asc, 
          cardinality(matched_days) desc
      ) as rn
    from filtered_matches
  ),
  best_matches as (
    select *
    from ranked_matches
    where rn = 1
    order by 
      distance_km asc, 
      time_diff_minutes asc, 
      cardinality(matched_days) desc,
      candidate_id asc
    limit 20
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'candidateId', candidate_id,
        'profile', jsonb_build_object(
          'nickname', nickname,
          'avatarUrl', avatar_url,
          'ageRange', age_range,
          'gender', gender,
          'tags', profile_tags
        ),
        'match', jsonb_build_object(
          'myPlanId', my_plan_id,
          'candidatePlanId', candidate_plan_id,
          'activityType', activity_type,
          'matchedDays', matched_days,
          'myStartTime', to_char(my_start_time, 'HH24:MI'),
          'candidateStartTime', to_char(candidate_start_time, 'HH24:MI'),
          'timeDifferenceMinutes', round(time_diff_minutes::numeric, 0)::integer,
          'distanceKm', round(distance_km::numeric, 2),
          'reasons', (
            select coalesce(jsonb_agg(reason), '[]'::jsonb) from (
              select 'same_activity' as reason
              union all
              select 'same_time' where time_diff_minutes <= 30
              union all
              select 'nearby' where distance_km <= 1.0
              union all
              select 'shared_day' where cardinality(matched_days) >= 2
            ) r
          )
        )
      )
    ),
    '[]'::jsonb
  ) into v_result
  from best_matches;

  return v_result;
end;
$$;

revoke execute on function public.get_discover_recommendations(uuid) from public;
revoke execute on function public.get_discover_recommendations(uuid) from anon;
grant execute on function public.get_discover_recommendations(uuid) to authenticated;
