-- An accepted Fixed Plan invitation represents one completed agreement, not a
-- permanent exclusion between the two users. Keep only pending invitations as
-- the idempotency/exclusion boundary so the same person can be invited again.

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
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  if p_my_plan_id is not null then
    if not exists (
      select 1
      from public.fixed_plans
      where fixed_plan_id = p_my_plan_id
        and user_id = v_user_id
        and plan_status = 'active'
    ) then
      return v_result;
    end if;
  end if;

  with my_active_plans as (
    select
      fp.*,
      coalesce(profile.tags, array[]::text[]) as profile_tags
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
      coalesce(profile.tags, array[]::text[]) as profile_tags
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
      and not exists (
        select 1
        from public.connections connection
        where connection.connection_status = 'active'
          and (
            (connection.user_a_id = v_user_id and connection.user_b_id = fp.user_id)
            or (connection.user_b_id = v_user_id and connection.user_a_id = fp.user_id)
          )
      )
      and not exists (
        select 1
        from public.invitations invitation
        where invitation.invitation_type = 'fixed_plan'
          and invitation.invitation_status = 'pending'
          and (
            (invitation.sender_user_id = v_user_id and invitation.receiver_user_id = fp.user_id)
            or (invitation.sender_user_id = fp.user_id and invitation.receiver_user_id = v_user_id)
          )
      )
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
      least(
        abs(extract(epoch from (my_plan.start_time - candidate_plan.start_time)) / 60.0),
        1440 - abs(extract(epoch from (my_plan.start_time - candidate_plan.start_time)) / 60.0)
      ) as time_diff_minutes
    from my_active_plans my_plan
    join candidate_active_plans candidate_plan
      on candidate_plan.activity_type = my_plan.activity_type
  ),
  filtered_matches as (
    select *
    from matches
    where distance_km <= 3.0
      and time_diff_minutes <= 90
      and cardinality(matched_days) > 0
  ),
  ranked_matches as (
    select
      *,
      row_number() over (
        partition by candidate_id
        order by
          distance_km asc,
          time_diff_minutes asc,
          cardinality(shared_tags) desc,
          cardinality(matched_days) desc,
          candidate_plan_id asc
      ) as rank_for_candidate
    from filtered_matches
  ),
  best_matches as (
    select *
    from ranked_matches
    where rank_for_candidate = 1
    order by
      distance_km asc,
      time_diff_minutes asc,
      cardinality(shared_tags) desc,
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
            select coalesce(jsonb_agg(reason), '[]'::jsonb)
            from (
              select 'same_activity' as reason
              union all
              select 'same_time' where time_diff_minutes <= 30
              union all
              select 'nearby' where distance_km <= 1.0
              union all
              select 'shared_day' where cardinality(matched_days) >= 2
            ) reasons
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

revoke execute on function public.get_discover_recommendations(uuid) from public, anon;
grant execute on function public.get_discover_recommendations(uuid) to authenticated;

create or replace function public.create_fixed_schedule_invitation(
  p_fixed_plan_id uuid,
  p_receiver_id uuid,
  p_receiver_fixed_plan_id uuid
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
  v_suggested_public_place_id uuid;
  v_existing_invitation record;
  v_existing_pair record;
  v_new_invitation_id uuid;
  v_new_conversation_id uuid;
begin
  if v_sender_id is null then
    raise exception 'Unauthenticated';
  end if;

  if v_sender_id = p_receiver_id then
    raise exception 'Cannot invite yourself';
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
    and extensions.st_distance(
      extensions.st_setsrid(
        extensions.st_makepoint(sender_plan.longitude, sender_plan.latitude),
        4326
      )::extensions.geography,
      extensions.st_setsrid(
        extensions.st_makepoint(receiver_plan.longitude, receiver_plan.latitude),
        4326
      )::extensions.geography
    ) / 1000.0 <= 3.0
    and least(
      abs(extract(epoch from (sender_plan.start_time - receiver_plan.start_time)) / 60.0),
      1440 - abs(extract(epoch from (sender_plan.start_time - receiver_plan.start_time)) / 60.0)
    ) <= 90
    and cardinality(array(
      select unnest(sender_plan.days_of_week)
      intersect
      select unnest(receiver_plan.days_of_week)
    )) > 0
    and not exists (
      select 1
      from public.connections connection
      where connection.connection_status = 'active'
        and (
          (connection.user_a_id = v_sender_id and connection.user_b_id = p_receiver_id)
          or (connection.user_b_id = v_sender_id and connection.user_a_id = p_receiver_id)
        )
    );

  if not found then
    raise exception 'Receiver plan is not eligible for this fixed plan';
  end if;

  if v_sender_activity_type = 'walking' then
    select recommendation.public_place_id
    into v_suggested_public_place_id
    from public.recommend_walking_public_place(
      v_sender_latitude,
      v_sender_longitude,
      v_receiver_latitude,
      v_receiver_longitude
    ) recommendation;
  end if;

  select invitation.invitation_id, invitation.fixed_plan_id, conversation.conversation_id
  into v_existing_invitation
  from public.invitations invitation
  join public.conversations conversation
    on conversation.related_invitation_id = invitation.invitation_id
  where invitation.invitation_type = 'fixed_plan'
    and invitation.invitation_status = 'pending'
    and (
      (invitation.sender_user_id = v_sender_id and invitation.receiver_user_id = p_receiver_id)
      or (invitation.sender_user_id = p_receiver_id and invitation.receiver_user_id = v_sender_id)
    )
  limit 1;

  if found then
    if v_existing_invitation.fixed_plan_id <> p_fixed_plan_id then
      raise exception 'A pending invitation already exists for a different fixed plan';
    end if;

    insert into public.invitation_plan_pairs (
      invitation_id,
      sender_fixed_plan_id,
      receiver_fixed_plan_id,
      suggested_public_place_id
    ) values (
      v_existing_invitation.invitation_id,
      p_fixed_plan_id,
      p_receiver_fixed_plan_id,
      v_suggested_public_place_id
    )
    on conflict (invitation_id) do nothing;

    select
      sender_fixed_plan_id,
      receiver_fixed_plan_id,
      suggested_public_place_id
    into v_existing_pair
    from public.invitation_plan_pairs
    where invitation_id = v_existing_invitation.invitation_id;

    if v_existing_pair.sender_fixed_plan_id <> p_fixed_plan_id
      or v_existing_pair.receiver_fixed_plan_id <> p_receiver_fixed_plan_id then
      raise exception 'A pending invitation already exists for a different plan pair';
    end if;

    if v_existing_pair.suggested_public_place_id is null
      and v_suggested_public_place_id is not null then
      update public.invitation_plan_pairs
      set suggested_public_place_id = v_suggested_public_place_id
      where invitation_id = v_existing_invitation.invitation_id;
    else
      v_suggested_public_place_id := v_existing_pair.suggested_public_place_id;
    end if;

    return jsonb_build_object(
      'invitation_id', v_existing_invitation.invitation_id,
      'conversation_id', v_existing_invitation.conversation_id,
      'suggested_public_place_id', v_suggested_public_place_id
    );
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
    suggested_public_place_id
  ) values (
    v_new_invitation_id,
    p_fixed_plan_id,
    p_receiver_fixed_plan_id,
    v_suggested_public_place_id
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
    'suggested_public_place_id', v_suggested_public_place_id
  );
end;
$$;

revoke execute on function public.create_fixed_schedule_invitation(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.create_fixed_schedule_invitation(uuid, uuid, uuid)
  to authenticated;
