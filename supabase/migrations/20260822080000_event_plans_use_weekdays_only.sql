-- Event Fixed Plans use weekday and area preferences only. start_time remains
-- NOT NULL for compatibility with the established fixed_plans schema, so noon
-- is a non-user-visible sentinel and must never participate in Event scoring.
update public.fixed_plans
set start_time = time '12:00'
where activity_type = 'event'
  and start_time <> time '12:00';

comment on column public.fixed_plans.start_time is
  'User-selected time for non-Event plans. Event plans store 12:00 as a compatibility sentinel; Event matching uses weekdays only.';

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
    select 1 from public.fixed_plans
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
      and not exists (
        select 1 from public.connections connection
        where connection.connection_status = 'active'
          and (
            (connection.user_a_id = v_user_id and connection.user_b_id = fp.user_id)
            or (connection.user_b_id = v_user_id and connection.user_a_id = fp.user_id)
          )
      )
      and not exists (
        select 1 from public.invitations invitation
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
        extensions.st_setsrid(extensions.st_makepoint(my_plan.longitude, my_plan.latitude), 4326)::extensions.geography,
        extensions.st_setsrid(extensions.st_makepoint(candidate_plan.longitude, candidate_plan.latitude), 4326)::extensions.geography
      ) / 1000.0 as distance_km,
      array(
        select unnest(my_plan.days_of_week)
        intersect select unnest(candidate_plan.days_of_week)
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
    select * from matches
    where distance_km <= 3.0
      and time_diff_minutes <= 90
      and cardinality(matched_days) > 0
  ),
  ranked_matches as (
    select *, row_number() over (
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
    select * from ranked_matches
    where rank_for_candidate = 1
    order by
      distance_km,
      time_diff_minutes,
      cardinality(shared_tags) desc,
      cardinality(matched_days) desc,
      candidate_id
    limit 20
  )
  select coalesce(jsonb_agg(jsonb_build_object(
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
  )), '[]'::jsonb)
  into v_result
  from best_matches;

  return v_result;
end;
$$;

revoke execute on function public.get_discover_recommendations(uuid) from public, anon;
grant execute on function public.get_discover_recommendations(uuid) to authenticated;

create or replace function public.get_fixed_plan_event_recommendations(
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
    join public.users sender_user
      on sender_user.id = sender_plan.user_id
      and sender_user.account_status = 'active'
      and sender_user.onboarding_status = 'completed'
    join public.profiles sender_profile
      on sender_profile.user_id = sender_plan.user_id
      and sender_profile.profile_status = 'active'
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
      receiver_plan.days_of_week as receiver_days,
      array(
        select distinct mapped.tag
        from unnest(coalesce(sender_profile.tags, '{}'::text[])) as source_tag(tag)
        cross join lateral unnest(case source_tag.tag
          when 'exhibition' then array['art_exhibition']::text[]
          when 'movie' then array['film']::text[]
          when 'music' then array['music_performance']::text[]
          else '{}'::text[]
        end) mapped(tag)
      ) as sender_interest_tags,
      array(
        select distinct mapped.tag
        from unnest(coalesce(receiver_profile.tags, '{}'::text[])) as source_tag(tag)
        cross join lateral unnest(case source_tag.tag
          when 'exhibition' then array['art_exhibition']::text[]
          when 'movie' then array['film']::text[]
          when 'music' then array['music_performance']::text[]
          else '{}'::text[]
        end) mapped(tag)
      ) as receiver_interest_tags,
      extensions.st_setsrid(extensions.st_makepoint(sender_plan.longitude, sender_plan.latitude), 4326)::extensions.geography as sender_point,
      extensions.st_setsrid(extensions.st_makepoint(receiver_plan.longitude, receiver_plan.latitude), 4326)::extensions.geography as receiver_point
    from public.fixed_plans sender_plan
    join public.profiles sender_profile on sender_profile.user_id = sender_plan.user_id
    join public.fixed_plans receiver_plan on receiver_plan.fixed_plan_id = p_receiver_fixed_plan_id
    join public.profiles receiver_profile on receiver_profile.user_id = receiver_plan.user_id
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
      coalesce(event.poster_url, venue.attributes #>> '{media,image_url}') as image_url,
      event.registration_status,
      event.recommendation_tags,
      venue.public_place_id,
      extensions.st_distance(venue.location_point, context.sender_point) as sender_distance_meters,
      extensions.st_distance(venue.location_point, context.receiver_point) as receiver_distance_meters,
      cardinality(array(
        select unnest(event.recommendation_tags)
        intersect select unnest(context.sender_interest_tags)
      )) as sender_interest_hits,
      cardinality(array(
        select unnest(event.recommendation_tags)
        intersect select unnest(context.receiver_interest_tags)
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
      and event.recommendation_tags && array['art_exhibition', 'film', 'music_performance']::text[]
      and event.registration_status in ('not_required', 'open', 'not_started')
      and case extract(isodow from event.start_at at time zone 'Asia/Tokyo')::integer
        when 1 then 'mon' when 2 then 'tue' when 3 then 'wed' when 4 then 'thu'
        when 5 then 'fri' when 6 then 'sat' when 7 then 'sun'
      end = any(context.sender_days)
      and case extract(isodow from event.start_at at time zone 'Asia/Tokyo')::integer
        when 1 then 'mon' when 2 then 'tue' when 3 then 'wed' when 4 then 'thu'
        when 5 then 'fri' when 6 then 'sat' when 7 then 'sun'
      end = any(context.receiver_days)
  ),
  ranked_events as (
    select scored.*, row_number() over (order by
      ('art_exhibition' = any(scored.recommendation_tags)) desc,
      (scored.sender_interest_hits > 0 and scored.receiver_interest_hits > 0) desc,
      scored.sender_interest_hits + scored.receiver_interest_hits desc,
      greatest(scored.sender_distance_meters, scored.receiver_distance_meters),
      scored.sender_distance_meters + scored.receiver_distance_meters,
      scored.start_at,
      scored.event_id
    ) as recommendation_rank
    from scored_events scored
  ),
  selected_events as (
    select * from ranked_events where recommendation_rank <= p_limit
  ),
  ranked_facilities as (
    select
      place.public_place_id,
      place.name,
      place.source_name,
      place.attributes #>> '{media,image_url}' as image_url,
      extensions.st_distance(place.location_point, context.sender_point) as sender_distance_meters,
      extensions.st_distance(place.location_point, context.receiver_point) as receiver_distance_meters,
      row_number() over (order by
        case place.attributes #>> '{cultural_facility,facility_type}'
          when 'exhibition_space' then 0
          when 'museum' then 1
          when 'aquarium' then 2
          when 'zoo' then 2
          when 'cinema' then 3
          else 9
        end,
        greatest(
          extensions.st_distance(place.location_point, context.sender_point),
          extensions.st_distance(place.location_point, context.receiver_point)
        ),
        extensions.st_distance(place.location_point, context.sender_point)
          + extensions.st_distance(place.location_point, context.receiver_point),
        place.public_place_id
      ) as facility_rank
    from public.public_places place
    cross join plan_context context
    where place.category = 'cultural_facility'
      and place.location_point is not null
      and place.attributes #>> '{cultural_facility,facility_type}' in (
        'exhibition_space', 'aquarium', 'zoo', 'museum', 'cinema'
      )
      and not exists (
        select 1 from selected_events selected
        where selected.public_place_id = place.public_place_id
      )
  ),
  selected_facilities as (
    select * from ranked_facilities
    where facility_rank <= greatest(p_limit - (select count(*)::integer from selected_events), 0)
  ),
  combined as (
    select
      'event'::text as recommendation_kind,
      selected.event_id as recommendation_id,
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
      false as requires_hours_confirmation,
      selected.recommendation_rank as result_rank
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
      true,
      (select count(*) from selected_events) + selected.facility_rank
    from selected_facilities selected
  )
  select
    combined.recommendation_kind,
    combined.recommendation_id,
    combined.event_id,
    combined.public_place_id,
    combined.title,
    combined.start_at,
    combined.end_at,
    combined.place_name,
    combined.source_name,
    combined.image_url,
    combined.registration_status,
    combined.sender_distance_meters,
    combined.receiver_distance_meters,
    combined.requires_hours_confirmation
  from combined
  order by combined.result_rank;
end;
$$;

revoke execute on function public.get_fixed_plan_event_recommendations(uuid, uuid, integer)
  from public, anon;
grant execute on function public.get_fixed_plan_event_recommendations(uuid, uuid, integer)
  to authenticated, service_role;
