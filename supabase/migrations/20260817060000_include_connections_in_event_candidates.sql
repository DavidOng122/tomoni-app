-- Existing connections still participate in event compatibility ranking.
-- Event invitations remain excluded to avoid offering the same greeting twice.
create or replace function public.get_same_event_people(
  p_event_id uuid
)
returns table (
  user_id uuid,
  nickname text,
  avatar_url text,
  compatibility_label text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_participation public.event_participations%rowtype;
  v_caller_profile public.profiles%rowtype;
  v_event public.events%rowtype;
  v_caller_datetime timestamptz;
begin
  if v_caller_id is null then
    return;
  end if;

  select * into v_event
  from public.events
  where event_id = p_event_id
    and event_status = 'scheduled'
    and (end_at is null or end_at > now());

  if not found then
    return;
  end if;

  select * into v_caller_participation
  from public.event_participations
  where event_id = p_event_id
    and public.event_participations.user_id = v_caller_id
    and participation_status = 'going'
    and participation_date is not null
    and arrival_time is not null;

  if not found then
    return;
  end if;

  select * into v_caller_profile
  from public.profiles
  where public.profiles.user_id = v_caller_id
    and profile_status = 'active';

  if not found then
    return;
  end if;

  v_caller_datetime :=
    (v_caller_participation.participation_date + v_caller_participation.arrival_time)
    at time zone 'Asia/Tokyo';

  return query
  with eligible_candidates as (
    select
      candidate.user_id,
      candidate.participation_date,
      candidate.arrival_time,
      profile.nickname,
      profile.avatar_url,
      array(
        select candidate_tag.tag
        from unnest(profile.tags) with ordinality candidate_tag(tag, position)
        where candidate_tag.tag = any(v_caller_profile.tags)
        order by candidate_tag.position
      ) as shared_tags,
      abs(extract(epoch from (
        v_caller_datetime -
        ((candidate.participation_date + candidate.arrival_time) at time zone 'Asia/Tokyo')
      ))) as event_time_difference_seconds
    from public.event_participations candidate
    join public.profiles profile on profile.user_id = candidate.user_id
    join public.users candidate_user on candidate_user.id = candidate.user_id
    where candidate.event_id = p_event_id
      and candidate.user_id <> v_caller_id
      and candidate.participation_status = 'going'
      and candidate.participation_date is not null
      and candidate.arrival_time is not null
      and profile.profile_status = 'active'
      and candidate_user.account_status = 'active'
      and candidate_user.onboarding_status = 'completed'
      and abs(extract(epoch from (
        v_caller_datetime -
        ((candidate.participation_date + candidate.arrival_time) at time zone 'Asia/Tokyo')
      ))) <= 3600
      and not exists (
        select 1
        from public.invitations invitation
        where invitation.event_id = p_event_id
          and invitation.invitation_type = 'event'
          and (
            (invitation.sender_user_id = v_caller_id and invitation.receiver_user_id = candidate.user_id)
            or
            (invitation.sender_user_id = candidate.user_id and invitation.receiver_user_id = v_caller_id)
          )
      )
  ),
  scored_candidates as (
    select
      eligible.*,
      exists (
        select 1
        from public.fixed_plans my_plan
        join public.fixed_plans candidate_plan
          on candidate_plan.user_id = eligible.user_id
          and candidate_plan.activity_type = my_plan.activity_type
          and candidate_plan.plan_status = 'active'
        where my_plan.user_id = v_caller_id
          and my_plan.plan_status = 'active'
          and my_plan.activity_type <> 'other'
      ) as has_same_activity,
      exists (
        select 1
        from public.fixed_plans my_plan
        join public.fixed_plans candidate_plan
          on candidate_plan.user_id = eligible.user_id
          and candidate_plan.activity_type = my_plan.activity_type
          and candidate_plan.plan_status = 'active'
        where my_plan.user_id = v_caller_id
          and my_plan.plan_status = 'active'
          and my_plan.activity_type <> 'other'
          and least(
            abs(extract(epoch from (my_plan.start_time - candidate_plan.start_time)) / 60),
            1440 - abs(extract(epoch from (my_plan.start_time - candidate_plan.start_time)) / 60)
          ) <= 30
      ) as has_same_plan_time,
      exists (
        select 1
        from public.fixed_plans my_plan
        join public.fixed_plans candidate_plan
          on candidate_plan.user_id = eligible.user_id
          and candidate_plan.activity_type = my_plan.activity_type
          and candidate_plan.plan_status = 'active'
        where my_plan.user_id = v_caller_id
          and my_plan.plan_status = 'active'
          and my_plan.activity_type <> 'other'
          and my_plan.latitude is not null
          and my_plan.longitude is not null
          and candidate_plan.latitude is not null
          and candidate_plan.longitude is not null
          and extensions.st_distance(
            extensions.st_setsrid(extensions.st_makepoint(my_plan.longitude, my_plan.latitude), 4326)::extensions.geography,
            extensions.st_setsrid(extensions.st_makepoint(candidate_plan.longitude, candidate_plan.latitude), 4326)::extensions.geography
          ) / 1000.0 <= 1.0
      ) as is_nearby,
      exists (
        select 1
        from public.fixed_plans my_plan
        join public.fixed_plans candidate_plan
          on candidate_plan.user_id = eligible.user_id
          and candidate_plan.activity_type = my_plan.activity_type
          and candidate_plan.plan_status = 'active'
        where my_plan.user_id = v_caller_id
          and my_plan.plan_status = 'active'
          and my_plan.activity_type <> 'other'
          and cardinality(array(
            select unnest(my_plan.days_of_week)
            intersect
            select unnest(candidate_plan.days_of_week)
          )) >= 2
      ) as has_shared_days
    from eligible_candidates eligible
  )
  select
    scored.user_id,
    scored.nickname,
    scored.avatar_url,
    case
      when scored.has_shared_days then '同じ曜日'
      when scored.is_nearby then '近くに住んでいる'
      when cardinality(scored.shared_tags) > 0 then scored.shared_tags[1] || 'が好き'
      when scored.has_same_plan_time then '同じ時間ごろ'
      when scored.has_same_activity then '同じ活動が好き'
      when scored.event_time_difference_seconds <= 900 then '同じ時間帯'
      else '近い時間に参加予定'
    end as compatibility_label
  from scored_candidates scored
  order by
    (
      cardinality(scored.shared_tags)
      + scored.has_same_activity::integer
      + scored.has_same_plan_time::integer
      + scored.is_nearby::integer
      + scored.has_shared_days::integer
      + (scored.event_time_difference_seconds <= 900)::integer
    ) desc,
    scored.event_time_difference_seconds asc,
    scored.user_id asc
  limit 3;
end;
$$;

revoke all on function public.get_same_event_people(uuid) from public, anon;
grant execute on function public.get_same_event_people(uuid) to authenticated;

update public.event_participations
set
  arrival_time = case participation_id
    when '40000000-0000-4000-8000-000000000001' then '18:15'::time
    when '40000000-0000-4000-8000-000000000002' then '18:30'::time
    when '40000000-0000-4000-8000-000000000003' then '18:45'::time
    else arrival_time
  end,
  participation_status = 'going',
  updated_at = now()
where participation_id in (
  '40000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000002',
  '40000000-0000-4000-8000-000000000003'
);

update public.event_participations
set
  participation_status = 'cancelled',
  updated_at = now()
where participation_id in (
  '40000000-0000-4000-8000-000000000010',
  '40000000-0000-4000-8000-000000000011',
  '40000000-0000-4000-8000-000000000012'
);
