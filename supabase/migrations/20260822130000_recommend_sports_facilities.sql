create function public.recommend_sports_public_place(
  p_sender_latitude double precision,
  p_sender_longitude double precision,
  p_receiver_latitude double precision,
  p_receiver_longitude double precision
) returns table (
  public_place_id uuid,
  name text,
  address text,
  latitude double precision,
  longitude double precision,
  source_name text,
  sender_distance_meters double precision,
  receiver_distance_meters double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  with reference_points as (
    select
      extensions.st_setsrid(
        extensions.st_makepoint(p_sender_longitude, p_sender_latitude),
        4326
      )::extensions.geography as sender_point,
      extensions.st_setsrid(
        extensions.st_makepoint(p_receiver_longitude, p_receiver_latitude),
        4326
      )::extensions.geography as receiver_point
    where p_sender_latitude between -90 and 90
      and p_sender_longitude between -180 and 180
      and p_receiver_latitude between -90 and 90
      and p_receiver_longitude between -180 and 180
  ),
  eligible_places as (
    select
      place.public_place_id,
      place.name,
      place.address,
      place.latitude,
      place.longitude,
      place.source_name,
      extensions.st_distance(place.location_point, points.sender_point)
        as sender_distance_meters,
      extensions.st_distance(place.location_point, points.receiver_point)
        as receiver_distance_meters
    from public.public_places place
    cross join reference_points points
    where place.category = 'sports_facility'
      and place.source_dataset_id = 'edogawa_sports_facilities'
      and place.location_point is not null
      and extensions.st_dwithin(place.location_point, points.sender_point, 3200)
      and extensions.st_dwithin(place.location_point, points.receiver_point, 3200)
  )
  select
    eligible.public_place_id,
    eligible.name,
    eligible.address,
    eligible.latitude,
    eligible.longitude,
    eligible.source_name,
    eligible.sender_distance_meters,
    eligible.receiver_distance_meters
  from eligible_places eligible
  order by
    greatest(eligible.sender_distance_meters, eligible.receiver_distance_meters),
    eligible.sender_distance_meters + eligible.receiver_distance_meters,
    eligible.public_place_id
  limit 1;
$$;

revoke execute on function public.recommend_sports_public_place(
  double precision,
  double precision,
  double precision,
  double precision
) from public, anon;
grant execute on function public.recommend_sports_public_place(
  double precision,
  double precision,
  double precision,
  double precision
) to authenticated, service_role;

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
      suggested_public_place_id,
      suggested_event_id
    ) values (
      v_existing_invitation.invitation_id,
      p_fixed_plan_id,
      p_receiver_fixed_plan_id,
      v_suggested_public_place_id,
      v_suggested_event_id
    )
    on conflict (invitation_id) do nothing;

    select
      sender_fixed_plan_id,
      receiver_fixed_plan_id,
      suggested_public_place_id,
      suggested_event_id
    into v_existing_pair
    from public.invitation_plan_pairs
    where invitation_id = v_existing_invitation.invitation_id;

    if v_existing_pair.sender_fixed_plan_id <> p_fixed_plan_id
      or v_existing_pair.receiver_fixed_plan_id <> p_receiver_fixed_plan_id then
      raise exception 'A pending invitation already exists for a different plan pair';
    end if;

    if v_existing_pair.suggested_public_place_id is null
      and v_existing_pair.suggested_event_id is null
      and num_nonnulls(v_suggested_public_place_id, v_suggested_event_id) = 1 then
      update public.invitation_plan_pairs
      set suggested_public_place_id = v_suggested_public_place_id,
          suggested_event_id = v_suggested_event_id
      where invitation_id = v_existing_invitation.invitation_id;
    else
      v_suggested_public_place_id := v_existing_pair.suggested_public_place_id;
      v_suggested_event_id := v_existing_pair.suggested_event_id;
    end if;

    return jsonb_build_object(
      'invitation_id', v_existing_invitation.invitation_id,
      'conversation_id', v_existing_invitation.conversation_id,
      'suggested_public_place_id', v_suggested_public_place_id,
      'suggested_event_id', v_suggested_event_id
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

with sports_recommendations as (
  select
    pair.invitation_id,
    recommendation.public_place_id
  from public.invitation_plan_pairs pair
  join public.invitations invitation
    on invitation.invitation_id = pair.invitation_id
    and invitation.invitation_status in ('pending', 'accepted')
  join public.fixed_plans sender_plan
    on sender_plan.fixed_plan_id = pair.sender_fixed_plan_id
    and sender_plan.activity_type = 'sports'
  join public.fixed_plans receiver_plan
    on receiver_plan.fixed_plan_id = pair.receiver_fixed_plan_id
    and receiver_plan.activity_type = 'sports'
  cross join lateral public.recommend_sports_public_place(
    sender_plan.latitude,
    sender_plan.longitude,
    receiver_plan.latitude,
    receiver_plan.longitude
  ) recommendation
  where pair.suggested_public_place_id is null
    and pair.suggested_event_id is null
)
update public.invitation_plan_pairs pair
set suggested_public_place_id = recommendation.public_place_id
from sports_recommendations recommendation
where pair.invitation_id = recommendation.invitation_id
  and pair.suggested_public_place_id is null
  and pair.suggested_event_id is null;
