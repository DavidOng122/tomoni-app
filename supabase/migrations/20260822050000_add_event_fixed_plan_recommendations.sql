alter table public.events
  add column recommendation_tags text[] not null default '{}',
  add column venue_public_place_id uuid
    references public.public_places(public_place_id) on delete set null;

alter table public.events
  add constraint events_recommendation_tags_valid_check check (
    recommendation_tags <@ array[
      'art_exhibition',
      'film',
      'music_performance',
      'culture_workshop',
      'community_festival',
      'market_flea'
    ]::text[]
    and array_position(recommendation_tags, null) is null
  );

create index events_venue_public_place_id_idx
  on public.events(venue_public_place_id)
  where venue_public_place_id is not null;

create index events_official_recommendation_idx
  on public.events(start_at, event_id)
  where event_type = 'official'
    and event_status = 'scheduled'
    and cardinality(recommendation_tags) > 0;

alter table public.invitation_plan_pairs
  add column suggested_event_id uuid
    references public.events(event_id) on delete set null;

alter table public.invitation_plan_pairs
  add constraint invitation_plan_pairs_single_suggestion_check check (
    num_nonnulls(suggested_public_place_id, suggested_event_id) <= 1
  );

create index invitation_plan_pairs_suggested_event_id_idx
  on public.invitation_plan_pairs(suggested_event_id)
  where suggested_event_id is not null;

comment on column public.events.recommendation_tags is
  'Deterministic, non-AI categories used only for Fixed Plan event recommendations.';
comment on column public.events.venue_public_place_id is
  'Exact normalized venue match to official public place data; NULL when unresolved or ambiguous.';
comment on column public.invitation_plan_pairs.suggested_event_id is
  'Sender-selected official event suggestion for this Fixed Plan pair.';

create function public.get_fixed_plan_event_recommendations(
  p_sender_fixed_plan_id uuid,
  p_receiver_fixed_plan_id uuid,
  p_limit integer default 3
) returns table (
  recommendation_kind text,
  recommendation_id uuid,
  event_id uuid,
  public_place_id uuid,
  title text,
  start_at timestamptz,
  end_at timestamptz,
  place_name text,
  source_name text,
  image_url text,
  registration_status text,
  sender_distance_meters double precision,
  receiver_distance_meters double precision,
  requires_hours_confirmation boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid := auth.uid();
begin
  if v_sender_id is null then
    raise exception 'Unauthenticated';
  end if;

  if p_limit < 1 or p_limit > 3 then
    raise exception 'Recommendation limit must be between 1 and 3';
  end if;

  if not exists (
    select 1
    from public.fixed_plans sender_plan
    join public.fixed_plans receiver_plan
      on receiver_plan.fixed_plan_id = p_receiver_fixed_plan_id
      and receiver_plan.activity_type = 'event'
      and receiver_plan.plan_status = 'active'
    join public.users receiver_user
      on receiver_user.id = receiver_plan.user_id
      and receiver_user.account_status = 'active'
      and receiver_user.onboarding_status = 'completed'
    join public.profiles receiver_profile
      on receiver_profile.user_id = receiver_plan.user_id
      and receiver_profile.profile_status = 'active'
    where sender_plan.fixed_plan_id = p_sender_fixed_plan_id
      and sender_plan.user_id = v_sender_id
      and sender_plan.activity_type = 'event'
      and sender_plan.plan_status = 'active'
  ) then
    raise exception 'Event plan pair is not eligible for recommendations';
  end if;

  return query
  with plan_context as (
    select
      sender_plan.days_of_week as sender_days,
      sender_plan.start_time as sender_time,
      sender_plan.latitude as sender_latitude,
      sender_plan.longitude as sender_longitude,
      receiver_plan.days_of_week as receiver_days,
      receiver_plan.start_time as receiver_time,
      receiver_plan.latitude as receiver_latitude,
      receiver_plan.longitude as receiver_longitude,
      array(
        select distinct mapped.tag
        from unnest(coalesce(sender_profile.tags, '{}'::text[])) as source_tag(tag)
        cross join lateral unnest(
          case source_tag.tag
            when 'exhibition' then array['art_exhibition']::text[]
            when 'movie' then array['film']::text[]
            when 'music' then array['music_performance']::text[]
            when 'reading' then array['culture_workshop']::text[]
            when 'local_event' then array['community_festival', 'market_flea']::text[]
            when 'cafe' then array['market_flea', 'community_festival']::text[]
            when 'casual_social' then array['market_flea', 'community_festival']::text[]
            when 'weekend_activity' then array['community_festival', 'market_flea']::text[]
            else '{}'::text[]
          end
        ) mapped(tag)
      ) as sender_interest_tags,
      array(
        select distinct mapped.tag
        from unnest(coalesce(receiver_profile.tags, '{}'::text[])) as source_tag(tag)
        cross join lateral unnest(
          case source_tag.tag
            when 'exhibition' then array['art_exhibition']::text[]
            when 'movie' then array['film']::text[]
            when 'music' then array['music_performance']::text[]
            when 'reading' then array['culture_workshop']::text[]
            when 'local_event' then array['community_festival', 'market_flea']::text[]
            when 'cafe' then array['market_flea', 'community_festival']::text[]
            when 'casual_social' then array['market_flea', 'community_festival']::text[]
            when 'weekend_activity' then array['community_festival', 'market_flea']::text[]
            else '{}'::text[]
          end
        ) mapped(tag)
      ) as receiver_interest_tags,
      extensions.st_setsrid(
        extensions.st_makepoint(sender_plan.longitude, sender_plan.latitude),
        4326
      )::extensions.geography as sender_point,
      extensions.st_setsrid(
        extensions.st_makepoint(receiver_plan.longitude, receiver_plan.latitude),
        4326
      )::extensions.geography as receiver_point
    from public.fixed_plans sender_plan
    join public.profiles sender_profile
      on sender_profile.user_id = sender_plan.user_id
    join public.fixed_plans receiver_plan
      on receiver_plan.fixed_plan_id = p_receiver_fixed_plan_id
    join public.profiles receiver_profile
      on receiver_profile.user_id = receiver_plan.user_id
    where sender_plan.fixed_plan_id = p_sender_fixed_plan_id
  ),
  scored_events as (
    select
      event.event_id,
      event.title,
      event.start_at,
      event.end_at,
      event.place_name,
      event.source_name,
      coalesce(
        event.poster_url,
        venue.attributes #>> '{media,image_url}'
      ) as image_url,
      event.registration_status,
      venue.public_place_id,
      extensions.st_distance(venue.location_point, context.sender_point)
        as sender_distance_meters,
      extensions.st_distance(venue.location_point, context.receiver_point)
        as receiver_distance_meters,
      least(
        abs(extract(epoch from (
          (event.start_at at time zone 'Asia/Tokyo')::time - context.sender_time
        )) / 60.0),
        1440 - abs(extract(epoch from (
          (event.start_at at time zone 'Asia/Tokyo')::time - context.sender_time
        )) / 60.0)
      ) as sender_time_delta_minutes,
      least(
        abs(extract(epoch from (
          (event.start_at at time zone 'Asia/Tokyo')::time - context.receiver_time
        )) / 60.0),
        1440 - abs(extract(epoch from (
          (event.start_at at time zone 'Asia/Tokyo')::time - context.receiver_time
        )) / 60.0)
      ) as receiver_time_delta_minutes,
      cardinality(array(
        select unnest(event.recommendation_tags)
        intersect
        select unnest(context.sender_interest_tags)
      )) as sender_interest_hits,
      cardinality(array(
        select unnest(event.recommendation_tags)
        intersect
        select unnest(context.receiver_interest_tags)
      )) as receiver_interest_hits
    from public.events event
    join public.public_places venue
      on venue.public_place_id = event.venue_public_place_id
      and venue.location_point is not null
    cross join plan_context context
    where event.event_type = 'official'
      and event.event_status = 'scheduled'
      and event.start_at >= now() + interval '24 hours'
      and event.start_at <= now() + interval '60 days'
      and cardinality(event.recommendation_tags) > 0
      and event.registration_status in ('not_required', 'open', 'not_started')
      and case extract(isodow from event.start_at at time zone 'Asia/Tokyo')::integer
        when 1 then 'mon'
        when 2 then 'tue'
        when 3 then 'wed'
        when 4 then 'thu'
        when 5 then 'fri'
        when 6 then 'sat'
        when 7 then 'sun'
      end = any(context.sender_days)
      and case extract(isodow from event.start_at at time zone 'Asia/Tokyo')::integer
        when 1 then 'mon'
        when 2 then 'tue'
        when 3 then 'wed'
        when 4 then 'thu'
        when 5 then 'fri'
        when 6 then 'sat'
        when 7 then 'sun'
      end = any(context.receiver_days)
      and least(
        abs(extract(epoch from (
          (event.start_at at time zone 'Asia/Tokyo')::time - context.sender_time
        )) / 60.0),
        1440 - abs(extract(epoch from (
          (event.start_at at time zone 'Asia/Tokyo')::time - context.sender_time
        )) / 60.0)
      ) <= 120
      and least(
        abs(extract(epoch from (
          (event.start_at at time zone 'Asia/Tokyo')::time - context.receiver_time
        )) / 60.0),
        1440 - abs(extract(epoch from (
          (event.start_at at time zone 'Asia/Tokyo')::time - context.receiver_time
        )) / 60.0)
      ) <= 120
      and extensions.st_dwithin(venue.location_point, context.sender_point, 5000)
      and extensions.st_dwithin(venue.location_point, context.receiver_point, 5000)
  ),
  selected_events as (
    select scored.*
    from scored_events scored
    order by
      (scored.sender_interest_hits > 0 and scored.receiver_interest_hits > 0) desc,
      scored.sender_interest_hits + scored.receiver_interest_hits desc,
      greatest(scored.sender_time_delta_minutes, scored.receiver_time_delta_minutes),
      greatest(scored.sender_distance_meters, scored.receiver_distance_meters),
      scored.sender_distance_meters + scored.receiver_distance_meters,
      scored.start_at,
      scored.event_id
    limit p_limit
  ),
  selected_facilities as (
    select
      place.public_place_id,
      place.name,
      place.source_name,
      place.attributes #>> '{media,image_url}' as image_url,
      extensions.st_distance(place.location_point, context.sender_point)
        as sender_distance_meters,
      extensions.st_distance(place.location_point, context.receiver_point)
        as receiver_distance_meters
    from public.public_places place
    cross join plan_context context
    where place.category = 'cultural_facility'
      and place.location_point is not null
      and extensions.st_dwithin(place.location_point, context.sender_point, 5000)
      and extensions.st_dwithin(place.location_point, context.receiver_point, 5000)
      and not exists (
        select 1
        from selected_events selected
        where selected.public_place_id = place.public_place_id
      )
    order by
      greatest(
        extensions.st_distance(place.location_point, context.sender_point),
        extensions.st_distance(place.location_point, context.receiver_point)
      ),
      extensions.st_distance(place.location_point, context.sender_point)
        + extensions.st_distance(place.location_point, context.receiver_point),
      place.public_place_id
    limit greatest(p_limit - (select count(*)::integer from selected_events), 0)
  )
  select
    'event'::text,
    selected.event_id,
    selected.event_id,
    selected.public_place_id,
    selected.title,
    selected.start_at,
    selected.end_at,
    selected.place_name,
    selected.source_name,
    selected.image_url,
    selected.registration_status,
    selected.sender_distance_meters,
    selected.receiver_distance_meters,
    false
  from selected_events selected
  union all
  select
    'cultural_facility'::text,
    selected.public_place_id,
    null::uuid,
    selected.public_place_id,
    selected.name,
    null::timestamptz,
    null::timestamptz,
    selected.name,
    selected.source_name,
    selected.image_url,
    null::text,
    selected.sender_distance_meters,
    selected.receiver_distance_meters,
    true
  from selected_facilities selected;
end;
$$;

revoke execute on function public.get_fixed_plan_event_recommendations(uuid, uuid, integer)
  from public, anon;
grant execute on function public.get_fixed_plan_event_recommendations(uuid, uuid, integer)
  to authenticated, service_role;

create function public.get_fixed_plan_invitation_recommendation(
  p_invitation_id uuid
) returns table (
  invitation_status text,
  sender_fixed_plan_id uuid,
  receiver_fixed_plan_id uuid,
  sender_area_name text,
  receiver_area_name text,
  recommendation_kind text,
  suggested_event_id uuid,
  suggested_public_place_id uuid,
  title text,
  start_at timestamptz,
  end_at timestamptz,
  place_name text,
  place_address text,
  place_latitude double precision,
  place_longitude double precision,
  source_name text,
  image_url text,
  event_status text,
  registration_status text,
  official_url text,
  sender_distance_meters double precision,
  receiver_distance_meters double precision,
  requires_hours_confirmation boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    invitation.invitation_status,
    pair.sender_fixed_plan_id,
    pair.receiver_fixed_plan_id,
    sender_plan.place_name,
    receiver_plan.place_name,
    case
      when pair.suggested_event_id is not null then 'event'
      when pair.suggested_public_place_id is not null then 'cultural_facility'
      else null
    end,
    pair.suggested_event_id,
    pair.suggested_public_place_id,
    coalesce(event.title, suggested_place.name),
    event.start_at,
    event.end_at,
    coalesce(event.place_name, suggested_place.name),
    case when invitation.invitation_status = 'accepted'
      then coalesce(event.address, event_venue.address, suggested_place.address)
      else null
    end,
    case when invitation.invitation_status = 'accepted'
      then coalesce(event_venue.latitude, suggested_place.latitude)
      else null
    end,
    case when invitation.invitation_status = 'accepted'
      then coalesce(event_venue.longitude, suggested_place.longitude)
      else null
    end,
    coalesce(event.source_name, suggested_place.source_name),
    coalesce(
      event.poster_url,
      event_venue.attributes #>> '{media,image_url}',
      suggested_place.attributes #>> '{media,image_url}'
    ),
    event.event_status,
    event.registration_status,
    case when invitation.invitation_status = 'accepted'
      then coalesce(event.official_url, suggested_place.official_url)
      else null
    end,
    case when coalesce(event_venue.location_point, suggested_place.location_point) is null
      then null
      else extensions.st_distance(
        coalesce(event_venue.location_point, suggested_place.location_point),
        extensions.st_setsrid(
          extensions.st_makepoint(sender_plan.longitude, sender_plan.latitude),
          4326
        )::extensions.geography
      )
    end,
    case when coalesce(event_venue.location_point, suggested_place.location_point) is null
      then null
      else extensions.st_distance(
        coalesce(event_venue.location_point, suggested_place.location_point),
        extensions.st_setsrid(
          extensions.st_makepoint(receiver_plan.longitude, receiver_plan.latitude),
          4326
        )::extensions.geography
      )
    end,
    pair.suggested_public_place_id is not null
  from public.invitation_plan_pairs pair
  join public.invitations invitation
    on invitation.invitation_id = pair.invitation_id
    and invitation.invitation_type = 'fixed_plan'
  join public.fixed_plans sender_plan
    on sender_plan.fixed_plan_id = pair.sender_fixed_plan_id
  join public.fixed_plans receiver_plan
    on receiver_plan.fixed_plan_id = pair.receiver_fixed_plan_id
  left join public.events event
    on event.event_id = pair.suggested_event_id
  left join public.public_places event_venue
    on event_venue.public_place_id = event.venue_public_place_id
  left join public.public_places suggested_place
    on suggested_place.public_place_id = pair.suggested_public_place_id
  where pair.invitation_id = p_invitation_id
    and auth.uid() in (invitation.sender_user_id, invitation.receiver_user_id);
$$;

revoke execute on function public.get_fixed_plan_invitation_recommendation(uuid)
  from public, anon;
grant execute on function public.get_fixed_plan_invitation_recommendation(uuid)
  to authenticated;

drop function public.create_fixed_schedule_invitation(uuid, uuid, uuid);

create function public.create_fixed_schedule_invitation(
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
