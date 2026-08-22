-- Fixed Plan matching is scoped to the exact, direction-independent plan pair.
-- Existing user connections must not hide otherwise eligible plans. A pair that
-- already has a pending, accepted, or declined invitation remains excluded.
--
-- Cancelled and expired invitations intentionally do not block a later retry.
-- Because invitation status belongs to invitations (not invitation_plan_pairs),
-- a permanent UNIQUE constraint on the pair would incorrectly block those retries.
-- The canonical index supports lookups, while the invitation RPC uses a canonical
-- transaction advisory lock to serialize reciprocal A -> B / B -> A attempts.

create index if not exists invitation_plan_pairs_canonical_fixed_plan_pair_idx
  on public.invitation_plan_pairs (
    (least(sender_fixed_plan_id, receiver_fixed_plan_id)),
    (greatest(sender_fixed_plan_id, receiver_fixed_plan_id))
  );

create or replace function public.get_blocking_fixed_plan_pair_invitation(
  p_plan_a_id uuid,
  p_plan_b_id uuid
) returns table (
  invitation_id uuid,
  invitation_status text,
  conversation_id uuid,
  sender_fixed_plan_id uuid,
  receiver_fixed_plan_id uuid,
  suggested_public_place_id uuid,
  suggested_event_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    invitation.invitation_id,
    invitation.invitation_status,
    conversation.conversation_id,
    pair.sender_fixed_plan_id,
    pair.receiver_fixed_plan_id,
    pair.suggested_public_place_id,
    pair.suggested_event_id
  from public.invitation_plan_pairs as pair
  join public.invitations as invitation
    on invitation.invitation_id = pair.invitation_id
  left join lateral (
    select existing_conversation.conversation_id
    from public.conversations as existing_conversation
    where existing_conversation.related_invitation_id = invitation.invitation_id
    order by existing_conversation.created_at, existing_conversation.conversation_id
    limit 1
  ) as conversation on true
  where p_plan_a_id <> p_plan_b_id
    and least(pair.sender_fixed_plan_id, pair.receiver_fixed_plan_id)
      = least(p_plan_a_id, p_plan_b_id)
    and greatest(pair.sender_fixed_plan_id, pair.receiver_fixed_plan_id)
      = greatest(p_plan_a_id, p_plan_b_id)
    and invitation.invitation_type = 'fixed_plan'
    and invitation.invitation_status in ('pending', 'accepted', 'declined')
  order by
    case invitation.invitation_status
      when 'pending' then 0
      when 'accepted' then 1
      else 2
    end,
    invitation.created_at,
    invitation.invitation_id
  limit 1;
$$;

revoke execute on function public.get_blocking_fixed_plan_pair_invitation(uuid, uuid)
  from public, anon, authenticated;

comment on function public.get_blocking_fixed_plan_pair_invitation(uuid, uuid) is
  'Internal direction-independent Fixed Plan pair exclusion rule for pending, accepted, and declined invitations.';

create or replace function public.get_discover_recommendations(
  p_my_plan_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  if p_my_plan_id is not null and not exists (
    select 1
    from public.fixed_plans
    where fixed_plan_id = p_my_plan_id
      and user_id = v_user_id
      and plan_status = 'active'
  ) then
    return v_result;
  end if;

  with my_active_plans as (
    select fp.*, coalesce(profile.tags, '{}'::text[]) as profile_tags
    from public.fixed_plans fp
    left join public.profiles profile on profile.user_id = fp.user_id
    where fp.user_id = v_user_id
      and fp.plan_status = 'active'
      and (p_my_plan_id is null or fp.fixed_plan_id = p_my_plan_id)
      and fp.latitude is not null
      and fp.longitude is not null
  ),
  candidate_active_plans as (
    select
      fp.*,
      profile.nickname,
      profile.avatar_url,
      profile.age_range,
      profile.gender,
      coalesce(profile.tags, '{}'::text[]) as profile_tags
    from public.fixed_plans fp
    join public.users candidate_user on candidate_user.id = fp.user_id
    join public.profiles profile on profile.user_id = fp.user_id
    where fp.user_id <> v_user_id
      and fp.plan_status = 'active'
      and candidate_user.account_status = 'active'
      and candidate_user.onboarding_status = 'completed'
      and profile.profile_status = 'active'
      and fp.latitude is not null
      and fp.longitude is not null
  ),
  matches as (
    select
      my_plan.fixed_plan_id as my_plan_id,
      my_plan.start_time as my_start_time,
      candidate_plan.user_id as candidate_id,
      candidate_plan.fixed_plan_id as candidate_plan_id,
      candidate_plan.start_time as candidate_start_time,
      candidate_plan.activity_type,
      candidate_plan.nickname,
      candidate_plan.avatar_url,
      candidate_plan.age_range,
      candidate_plan.gender,
      candidate_plan.profile_tags,
      extensions.st_distance(
        extensions.st_setsrid(
          extensions.st_makepoint(my_plan.longitude, my_plan.latitude),
          4326
        )::extensions.geography,
        extensions.st_setsrid(
          extensions.st_makepoint(candidate_plan.longitude, candidate_plan.latitude),
          4326
        )::extensions.geography
      ) / 1000.0 as distance_km,
      array(
        select unnest(my_plan.days_of_week)
        intersect
        select unnest(candidate_plan.days_of_week)
      ) as matched_days,
      array(
        select distinct my_tag
        from unnest(my_plan.profile_tags) as my_tag
        where my_tag = any(candidate_plan.profile_tags)
        order by my_tag
      ) as shared_tags,
      case
        when my_plan.activity_type = 'event' then 0::double precision
        else least(
          abs(extract(epoch from (my_plan.start_time - candidate_plan.start_time)) / 60.0),
          1440 - abs(extract(epoch from (my_plan.start_time - candidate_plan.start_time)) / 60.0)
        )
      end as time_diff_minutes
    from my_active_plans my_plan
    join candidate_active_plans candidate_plan
      on candidate_plan.activity_type = my_plan.activity_type
  ),
  filtered_matches as (
    select match.*
    from matches as match
    where (
        match.activity_type = 'event'
        or match.distance_km <= 3.0
        or match.time_diff_minutes <= 90
      )
      and cardinality(match.matched_days) > 0
      and not exists (
        select 1
        from public.get_blocking_fixed_plan_pair_invitation(
          match.my_plan_id,
          match.candidate_plan_id
        )
      )
  ),
  ranked_matches as (
    select
      *,
      row_number() over (
        partition by candidate_id
        order by
          distance_km,
          time_diff_minutes,
          cardinality(shared_tags) desc,
          cardinality(matched_days) desc,
          candidate_plan_id
      ) as rank_for_candidate
    from filtered_matches
  ),
  best_matches as (
    select *
    from ranked_matches
    where rank_for_candidate = 1
    order by
      distance_km,
      time_diff_minutes,
      cardinality(shared_tags) desc,
      cardinality(matched_days) desc,
      candidate_id
    limit 20
  )
  select coalesce(
    jsonb_agg(jsonb_build_object(
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
          select coalesce(jsonb_agg(reason), '[]'::jsonb)
          from (
            select 'same_activity' as reason
            union all
            select 'same_time' where activity_type <> 'event' and time_diff_minutes <= 30
            union all
            select 'nearby' where distance_km <= 1.0
            union all
            select 'shared_day' where cardinality(matched_days) >= 2
          ) reasons
        )
      )
    )),
    '[]'::jsonb
  ) into v_result
  from best_matches;

  return v_result;
end;
$$;

revoke execute on function public.get_discover_recommendations(uuid) from public, anon;
grant execute on function public.get_discover_recommendations(uuid) to authenticated;

create or replace function public.create_fixed_schedule_invitation(
  p_fixed_plan_id uuid,
  p_receiver_id uuid,
  p_receiver_fixed_plan_id uuid,
  p_suggested_event_id uuid default null,
  p_suggested_public_place_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid := auth.uid();
  v_sender_activity_type text;
  v_sender_latitude double precision;
  v_sender_longitude double precision;
  v_receiver_latitude double precision;
  v_receiver_longitude double precision;
  v_suggested_event_id uuid := p_suggested_event_id;
  v_suggested_public_place_id uuid := p_suggested_public_place_id;
  v_blocking_invitation record;
  v_new_invitation_id uuid;
  v_new_conversation_id uuid;
begin
  if v_sender_id is null then
    raise exception 'Unauthenticated';
  end if;

  if v_sender_id = p_receiver_id then
    raise exception 'Cannot invite yourself';
  end if;

  if num_nonnulls(v_suggested_event_id, v_suggested_public_place_id) > 1 then
    raise exception 'Only one recommendation may be selected';
  end if;

  select
    sender_plan.activity_type,
    sender_plan.latitude,
    sender_plan.longitude,
    receiver_plan.latitude,
    receiver_plan.longitude
  into
    v_sender_activity_type,
    v_sender_latitude,
    v_sender_longitude,
    v_receiver_latitude,
    v_receiver_longitude
  from public.fixed_plans sender_plan
  join public.fixed_plans receiver_plan
    on receiver_plan.fixed_plan_id = p_receiver_fixed_plan_id
    and receiver_plan.user_id = p_receiver_id
    and receiver_plan.plan_status = 'active'
    and receiver_plan.activity_type = sender_plan.activity_type
  join public.users receiver_user
    on receiver_user.id = receiver_plan.user_id
    and receiver_user.account_status = 'active'
    and receiver_user.onboarding_status = 'completed'
  join public.profiles receiver_profile
    on receiver_profile.user_id = receiver_plan.user_id
    and receiver_profile.profile_status = 'active'
  where sender_plan.fixed_plan_id = p_fixed_plan_id
    and sender_plan.user_id = v_sender_id
    and sender_plan.plan_status = 'active'
    and sender_plan.latitude is not null
    and sender_plan.longitude is not null
    and receiver_plan.latitude is not null
    and receiver_plan.longitude is not null
    and (
      sender_plan.activity_type = 'event'
      or extensions.st_distance(
        extensions.st_setsrid(
          extensions.st_makepoint(sender_plan.longitude, sender_plan.latitude),
          4326
        )::extensions.geography,
        extensions.st_setsrid(
          extensions.st_makepoint(receiver_plan.longitude, receiver_plan.latitude),
          4326
        )::extensions.geography
      ) / 1000.0 <= 3.0
      or least(
        abs(extract(epoch from (sender_plan.start_time - receiver_plan.start_time)) / 60.0),
        1440 - abs(extract(epoch from (sender_plan.start_time - receiver_plan.start_time)) / 60.0)
      ) <= 90
    )
    and cardinality(array(
      select unnest(sender_plan.days_of_week)
      intersect
      select unnest(receiver_plan.days_of_week)
    )) > 0;

  if not found then
    raise exception 'Receiver plan is not eligible for this fixed plan';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      least(p_fixed_plan_id, p_receiver_fixed_plan_id)::text
        || ':'
        || greatest(p_fixed_plan_id, p_receiver_fixed_plan_id)::text,
      0
    )
  );

  select blocking.*
  into v_blocking_invitation
  from public.get_blocking_fixed_plan_pair_invitation(
    p_fixed_plan_id,
    p_receiver_fixed_plan_id
  ) as blocking;

  if found then
    if v_blocking_invitation.invitation_status = 'pending' then
      if v_blocking_invitation.conversation_id is null then
        raise exception 'Linked conversation not found for the pending invitation';
      end if;

      return jsonb_build_object(
        'invitation_id', v_blocking_invitation.invitation_id,
        'conversation_id', v_blocking_invitation.conversation_id,
        'suggested_public_place_id', v_blocking_invitation.suggested_public_place_id,
        'suggested_event_id', v_blocking_invitation.suggested_event_id
      );
    end if;

    raise exception 'Fixed Plan pair is blocked by invitation status %',
      v_blocking_invitation.invitation_status;
  end if;

  if v_sender_activity_type in ('walking', 'dog_walking') then
    if num_nonnulls(v_suggested_event_id, v_suggested_public_place_id) > 0 then
      raise exception 'Walking recommendations are selected by the server';
    end if;

    select recommendation.public_place_id
    into v_suggested_public_place_id
    from public.recommend_walking_public_place(
      v_sender_latitude,
      v_sender_longitude,
      v_receiver_latitude,
      v_receiver_longitude
    ) recommendation;
  elsif v_sender_activity_type = 'study_reading' then
    if num_nonnulls(v_suggested_event_id, v_suggested_public_place_id) > 0 then
      raise exception 'Study and reading recommendations are selected by the server';
    end if;

    select recommendation.public_place_id
    into v_suggested_public_place_id
    from public.recommend_study_reading_public_place(
      v_sender_latitude,
      v_sender_longitude,
      v_receiver_latitude,
      v_receiver_longitude
    ) recommendation;
  elsif v_sender_activity_type = 'sports' then
    if num_nonnulls(v_suggested_event_id, v_suggested_public_place_id) > 0 then
      raise exception 'Sports recommendations are selected by the server';
    end if;

    select recommendation.public_place_id
    into v_suggested_public_place_id
    from public.recommend_sports_public_place(
      v_sender_latitude,
      v_sender_longitude,
      v_receiver_latitude,
      v_receiver_longitude
    ) recommendation;
  elsif v_sender_activity_type = 'event' then
    if v_suggested_event_id is not null and not exists (
      select 1
      from public.get_fixed_plan_event_recommendations(
        p_fixed_plan_id,
        p_receiver_fixed_plan_id,
        3
      ) recommendation
      where recommendation.recommendation_kind = 'event'
        and recommendation.event_id = v_suggested_event_id
    ) then
      raise exception 'Selected event is not an eligible recommendation';
    end if;

    if v_suggested_public_place_id is not null and not exists (
      select 1
      from public.get_fixed_plan_event_recommendations(
        p_fixed_plan_id,
        p_receiver_fixed_plan_id,
        3
      ) recommendation
      where recommendation.recommendation_kind = 'cultural_facility'
        and recommendation.public_place_id = v_suggested_public_place_id
    ) then
      raise exception 'Selected cultural facility is not an eligible recommendation';
    end if;
  elsif num_nonnulls(v_suggested_event_id, v_suggested_public_place_id) > 0 then
    raise exception 'This activity type does not support destination recommendations';
  end if;

  v_new_invitation_id := gen_random_uuid();
  v_new_conversation_id := gen_random_uuid();

  insert into public.invitations (
    invitation_id,
    sender_user_id,
    receiver_user_id,
    invitation_type,
    fixed_plan_id,
    invitation_status
  ) values (
    v_new_invitation_id,
    v_sender_id,
    p_receiver_id,
    'fixed_plan',
    p_fixed_plan_id,
    'pending'
  );

  insert into public.invitation_plan_pairs (
    invitation_id,
    sender_fixed_plan_id,
    receiver_fixed_plan_id,
    suggested_public_place_id,
    suggested_event_id
  ) values (
    v_new_invitation_id,
    p_fixed_plan_id,
    p_receiver_fixed_plan_id,
    v_suggested_public_place_id,
    v_suggested_event_id
  );

  insert into public.conversations (
    conversation_id,
    conversation_status,
    fixed_plan_id,
    related_invitation_id,
    event_id
  ) values (
    v_new_conversation_id,
    'active',
    p_fixed_plan_id,
    v_new_invitation_id,
    null
  );

  insert into public.conversation_members (conversation_id, user_id)
  values
    (v_new_conversation_id, v_sender_id),
    (v_new_conversation_id, p_receiver_id);

  return jsonb_build_object(
    'invitation_id', v_new_invitation_id,
    'conversation_id', v_new_conversation_id,
    'suggested_public_place_id', v_suggested_public_place_id,
    'suggested_event_id', v_suggested_event_id
  );
end;
$$;

revoke execute on function public.create_fixed_schedule_invitation(uuid, uuid, uuid, uuid, uuid)
  from public, anon;
grant execute on function public.create_fixed_schedule_invitation(uuid, uuid, uuid, uuid, uuid)
  to authenticated;
