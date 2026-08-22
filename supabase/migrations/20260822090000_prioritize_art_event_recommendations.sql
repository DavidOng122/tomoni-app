-- Produce one shared Top 3 so exhibition spaces and museums cannot be crowded
-- out by lower-priority film/music events. Distance breaks ties inside each
-- focus tier; it is not a destination hard filter.
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
        from unnest(coalesce(sender_profile.tags, '{}'::text[])) source_tag(tag)
        cross join lateral unnest(case source_tag.tag
          when 'exhibition' then array['art_exhibition']::text[]
          when 'movie' then array['film']::text[]
          when 'music' then array['music_performance']::text[]
          else '{}'::text[]
        end) mapped(tag)
      ) as sender_interest_tags,
      array(
        select distinct mapped.tag
        from unnest(coalesce(receiver_profile.tags, '{}'::text[])) source_tag(tag)
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
  eligible_events as (
    select
      'event'::text as recommendation_kind,
      event.event_id as recommendation_id,
      event.event_id,
      venue.public_place_id,
      event.title,
      event.start_at,
      event.end_at,
      event.place_name,
      event.source_name,
      coalesce(event.poster_url, venue.attributes #>> '{media,image_url}') as image_url,
      event.registration_status,
      extensions.st_distance(venue.location_point, context.sender_point) as sender_distance_meters,
      extensions.st_distance(venue.location_point, context.receiver_point) as receiver_distance_meters,
      false as requires_hours_confirmation,
      case when 'art_exhibition' = any(event.recommendation_tags) then 0 else 3 end as focus_rank,
      cardinality(array(
        select unnest(event.recommendation_tags)
        intersect select unnest(context.sender_interest_tags)
      )) + cardinality(array(
        select unnest(event.recommendation_tags)
        intersect select unnest(context.receiver_interest_tags)
      )) as interest_hits
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
  eligible_facilities as (
    select
      'cultural_facility'::text as recommendation_kind,
      place.public_place_id as recommendation_id,
      null::uuid as event_id,
      place.public_place_id,
      place.name as title,
      null::timestamptz as start_at,
      null::timestamptz as end_at,
      place.name as place_name,
      place.source_name,
      place.attributes #>> '{media,image_url}' as image_url,
      null::text as registration_status,
      extensions.st_distance(place.location_point, context.sender_point) as sender_distance_meters,
      extensions.st_distance(place.location_point, context.receiver_point) as receiver_distance_meters,
      true as requires_hours_confirmation,
      case place.attributes #>> '{cultural_facility,facility_type}'
        when 'exhibition_space' then 1
        when 'museum' then 2
        else 4
      end as focus_rank,
      0 as interest_hits
    from public.public_places place
    cross join plan_context context
    where place.category = 'cultural_facility'
      and place.location_point is not null
      and place.attributes #>> '{cultural_facility,facility_type}' in (
        'exhibition_space', 'museum', 'aquarium', 'zoo', 'cinema'
      )
      and not exists (
        select 1 from eligible_events event
        where event.public_place_id = place.public_place_id
      )
  ),
  combined as (
    select * from eligible_events
    union all
    select * from eligible_facilities
  ),
  ranked as (
    select combined.*, row_number() over (order by
      combined.focus_rank,
      combined.interest_hits desc,
      greatest(combined.sender_distance_meters, combined.receiver_distance_meters),
      combined.sender_distance_meters + combined.receiver_distance_meters,
      combined.start_at nulls last,
      combined.recommendation_id
    ) as result_rank
    from combined
  )
  select
    ranked.recommendation_kind,
    ranked.recommendation_id,
    ranked.event_id,
    ranked.public_place_id,
    ranked.title,
    ranked.start_at,
    ranked.end_at,
    ranked.place_name,
    ranked.source_name,
    ranked.image_url,
    ranked.registration_status,
    ranked.sender_distance_meters,
    ranked.receiver_distance_meters,
    ranked.requires_hours_confirmation
  from ranked
  where ranked.result_rank <= p_limit
  order by ranked.result_rank;
end;
$$;

revoke execute on function public.get_fixed_plan_event_recommendations(uuid, uuid, integer)
  from public, anon;
grant execute on function public.get_fixed_plan_event_recommendations(uuid, uuid, integer)
  to authenticated, service_role;
