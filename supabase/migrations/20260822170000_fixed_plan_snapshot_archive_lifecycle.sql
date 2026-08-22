-- Migration: 20260822170000_fixed_plan_snapshot_archive_lifecycle.sql
-- Implement Fixed Plan Snapshots and complete Archive Lifecycle for Yorimi invitations.

-- 1. Add snapshot columns to invitation_plan_pairs
alter table public.invitation_plan_pairs
  add column if not exists sender_plan_snapshot jsonb,
  add column if not exists receiver_plan_snapshot jsonb;

comment on column public.invitation_plan_pairs.sender_plan_snapshot is
  'JSONB snapshot of sender Fixed Plan at invitation creation (activity_type, custom_activity_name, days_of_week, start_time, place_id, place_name, latitude, longitude).';

comment on column public.invitation_plan_pairs.receiver_plan_snapshot is
  'JSONB snapshot of receiver Fixed Plan at invitation creation (activity_type, custom_activity_name, days_of_week, start_time, place_id, place_name, latitude, longitude).';

grant select, insert, update, delete on table public.invitation_plan_pairs to service_role;


-- 2. Snapshot Generator Helper Function
create or replace function public.build_fixed_plan_snapshot(
  p_plan public.fixed_plans
) returns jsonb
language sql
immutable
security definer
set search_path = ''
as $$
  select case when p_plan.fixed_plan_id is null then null else jsonb_build_object(
    'activity_type', p_plan.activity_type,
    'custom_activity_name', p_plan.custom_activity_name,
    'days_of_week', p_plan.days_of_week,
    'start_time', to_char(p_plan.start_time, 'HH24:MI:SS'),
    'place_id', p_plan.place_id,
    'place_name', p_plan.place_name,
    'latitude', p_plan.latitude,
    'longitude', p_plan.longitude
  ) end;
$$;

revoke all on function public.build_fixed_plan_snapshot(public.fixed_plans) from public, anon;
grant execute on function public.build_fixed_plan_snapshot(public.fixed_plans) to authenticated, service_role;


-- 3. Backfill Migration for existing legacy rows in invitation_plan_pairs
-- NOTE: Backfill of legacy invitation snapshots is best-effort only. For legacy invitations created before
-- this migration, the backfilled snapshot reflects the plan state at migration execution time,
-- not guaranteed historical state at invitation creation time.
update public.invitation_plan_pairs pair
set
  sender_plan_snapshot = coalesce(
    pair.sender_plan_snapshot,
    public.build_fixed_plan_snapshot(sender_fp)
  ),
  receiver_plan_snapshot = coalesce(
    pair.receiver_plan_snapshot,
    public.build_fixed_plan_snapshot(receiver_fp)
  )
from public.fixed_plans sender_fp, public.fixed_plans receiver_fp
where sender_fp.fixed_plan_id = pair.sender_fixed_plan_id
  and receiver_fp.fixed_plan_id = pair.receiver_fixed_plan_id
  and (pair.sender_plan_snapshot is null or pair.receiver_plan_snapshot is null);


-- 4. Update create_fixed_schedule_invitation to compute and store snapshots
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
  v_sender_plan public.fixed_plans%rowtype;
  v_receiver_plan public.fixed_plans%rowtype;
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

  select * into v_sender_plan
  from public.fixed_plans
  where fixed_plan_id = p_fixed_plan_id
    and user_id = v_sender_id
    and plan_status = 'active';

  if not found then
    raise exception 'Sender plan is not active or found';
  end if;

  select * into v_receiver_plan
  from public.fixed_plans
  where fixed_plan_id = p_receiver_fixed_plan_id
    and user_id = p_receiver_id
    and plan_status = 'active';

  if not found then
    raise exception 'Receiver plan is not active or found';
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
    suggested_event_id,
    sender_plan_snapshot,
    receiver_plan_snapshot
  ) values (
    v_new_invitation_id,
    p_fixed_plan_id,
    p_receiver_fixed_plan_id,
    v_suggested_public_place_id,
    v_suggested_event_id,
    public.build_fixed_plan_snapshot(v_sender_plan),
    public.build_fixed_plan_snapshot(v_receiver_plan)
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


-- 5. Update archive_fixed_plan to handle PENDING invitations for both Sender and Receiver
create or replace function public.archive_fixed_plan(
  p_fixed_plan_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_rows integer;
  v_cancelled_invitation_ids uuid[] := '{}';
  v_inv record;
begin
  if v_user_id is null then
    raise exception 'Unauthenticated';
  end if;

  update public.fixed_plans
  set
    plan_status = 'deleted',
    updated_at = now()
  where fixed_plan_id = p_fixed_plan_id
    and user_id = v_user_id
    and plan_status <> 'deleted';

  get diagnostics v_plan_rows = row_count;
  if v_plan_rows = 0 then
    raise exception 'Fixed plan not found or already deleted';
  end if;

  -- Cancel ONLY PENDING invitations associated with p_fixed_plan_id (whether as sender's plan OR receiver's plan)
  -- ACCEPTED invitations MUST NOT be cancelled by archiving a fixed plan.
  with pending_to_cancel as (
    select invitation.invitation_id, invitation.sender_user_id, invitation.receiver_user_id
    from public.invitations invitation
    left join public.invitation_plan_pairs pair
      on pair.invitation_id = invitation.invitation_id
    where invitation.invitation_type = 'fixed_plan'
      and invitation.invitation_status = 'pending'
      and (
        invitation.fixed_plan_id = p_fixed_plan_id
        or pair.sender_fixed_plan_id = p_fixed_plan_id
        or pair.receiver_fixed_plan_id = p_fixed_plan_id
      )
      and (v_user_id = invitation.sender_user_id or v_user_id = invitation.receiver_user_id)
  ),
  cancelled_invitations as (
    update public.invitations
    set
      invitation_status = 'cancelled',
      cancelled_by_user_id = v_user_id,
      responded_at = now()
    where invitation_id in (select invitation_id from pending_to_cancel)
    returning invitation_id, sender_user_id, receiver_user_id
  )
  select coalesce(array_agg(invitation_id), '{}')
  into v_cancelled_invitation_ids
  from cancelled_invitations;

  update public.conversations
  set
    conversation_status = 'closed',
    closed_at = now(),
    updated_at = now()
  where related_invitation_id = any(v_cancelled_invitation_ids)
    and conversation_status = 'active';

  -- Sync connection state for any user pairs with cancelled pending invitations
  for v_inv in
    select sender_user_id, receiver_user_id
    from public.invitations
    where invitation_id = any(v_cancelled_invitation_ids)
  loop
    perform public.sync_connection_state(v_inv.sender_user_id, v_inv.receiver_user_id);
  end loop;

  return jsonb_build_object(
    'fixed_plan_id', p_fixed_plan_id,
    'cancelled_invitation_count', cardinality(v_cancelled_invitation_ids)
  );
end;
$$;


-- 6. Update Display RPCs to read from Snapshot with Fallback
create or replace function public.get_fixed_plan_invitation_suggested_place(
  p_invitation_id uuid
) returns table (
  sender_fixed_plan_id uuid,
  receiver_fixed_plan_id uuid,
  sender_area_name text,
  receiver_area_name text,
  suggested_public_place_id uuid,
  suggested_place_name text,
  suggested_place_address text,
  suggested_place_latitude double precision,
  suggested_place_longitude double precision,
  suggested_place_source_name text,
  sender_distance_meters double precision,
  receiver_distance_meters double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pair.sender_fixed_plan_id,
    pair.receiver_fixed_plan_id,
    coalesce(
      pair.sender_plan_snapshot->>'place_name',
      sender_plan.place_name
    ) as sender_area_name,
    coalesce(
      pair.receiver_plan_snapshot->>'place_name',
      receiver_plan.place_name
    ) as receiver_area_name,
    pair.suggested_public_place_id,
    place.name as suggested_place_name,
    case
      when invitation.invitation_status = 'accepted' then place.address
      else null
    end as suggested_place_address,
    case
      when invitation.invitation_status = 'accepted' then place.latitude
      else null
    end as suggested_place_latitude,
    case
      when invitation.invitation_status = 'accepted' then place.longitude
      else null
    end as suggested_place_longitude,
    place.source_name as suggested_place_source_name,
    case
      when place.public_place_id is null then null
      else extensions.st_distance(
        place.location_point,
        extensions.st_setsrid(
          extensions.st_makepoint(
            coalesce(
              (pair.sender_plan_snapshot->>'longitude')::double precision,
              sender_plan.longitude
            ),
            coalesce(
              (pair.sender_plan_snapshot->>'latitude')::double precision,
              sender_plan.latitude
            )
          ),
          4326
        )::extensions.geography
      )
    end as sender_distance_meters,
    case
      when place.public_place_id is null then null
      else extensions.st_distance(
        place.location_point,
        extensions.st_setsrid(
          extensions.st_makepoint(
            coalesce(
              (pair.receiver_plan_snapshot->>'longitude')::double precision,
              receiver_plan.longitude
            ),
            coalesce(
              (pair.receiver_plan_snapshot->>'latitude')::double precision,
              receiver_plan.latitude
            )
          ),
          4326
        )::extensions.geography
      )
    end as receiver_distance_meters
  from public.invitation_plan_pairs pair
  join public.invitations invitation
    on invitation.invitation_id = pair.invitation_id
    and invitation.invitation_type = 'fixed_plan'
  left join public.fixed_plans sender_plan
    on sender_plan.fixed_plan_id = pair.sender_fixed_plan_id
  left join public.fixed_plans receiver_plan
    on receiver_plan.fixed_plan_id = pair.receiver_fixed_plan_id
  left join public.public_places place
    on place.public_place_id = pair.suggested_public_place_id
  where pair.invitation_id = p_invitation_id
    and auth.uid() in (invitation.sender_user_id, invitation.receiver_user_id);
$$;

revoke execute on function public.get_fixed_plan_invitation_suggested_place(uuid) from public, anon;
grant execute on function public.get_fixed_plan_invitation_suggested_place(uuid) to authenticated;


create or replace function public.get_fixed_plan_invitation_recommendation(
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
    coalesce(pair.sender_plan_snapshot->>'place_name', sender_plan.place_name) as sender_area_name,
    coalesce(pair.receiver_plan_snapshot->>'place_name', receiver_plan.place_name) as receiver_area_name,
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
          extensions.st_makepoint(
            coalesce((pair.sender_plan_snapshot->>'longitude')::double precision, sender_plan.longitude),
            coalesce((pair.sender_plan_snapshot->>'latitude')::double precision, sender_plan.latitude)
          ),
          4326
        )::extensions.geography
      )
    end,
    case when coalesce(event_venue.location_point, suggested_place.location_point) is null
      then null
      else extensions.st_distance(
        coalesce(event_venue.location_point, suggested_place.location_point),
        extensions.st_setsrid(
          extensions.st_makepoint(
            coalesce((pair.receiver_plan_snapshot->>'longitude')::double precision, receiver_plan.longitude),
            coalesce((pair.receiver_plan_snapshot->>'latitude')::double precision, receiver_plan.latitude)
          ),
          4326
        )::extensions.geography
      )
    end,
    pair.suggested_public_place_id is not null
  from public.invitation_plan_pairs pair
  join public.invitations invitation
    on invitation.invitation_id = pair.invitation_id
    and invitation.invitation_type = 'fixed_plan'
  left join public.fixed_plans sender_plan
    on sender_plan.fixed_plan_id = pair.sender_fixed_plan_id
  left join public.fixed_plans receiver_plan
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

revoke execute on function public.get_fixed_plan_invitation_recommendation(uuid) from public, anon;
grant execute on function public.get_fixed_plan_invitation_recommendation(uuid) to authenticated;


-- 7. New Helper RPC to retrieve invitation snapshots
create or replace function public.get_fixed_plan_invitation_snapshots(
  p_invitation_id uuid
) returns table (
  invitation_id uuid,
  sender_fixed_plan_id uuid,
  receiver_fixed_plan_id uuid,
  sender_plan_snapshot jsonb,
  receiver_plan_snapshot jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pair.invitation_id,
    pair.sender_fixed_plan_id,
    pair.receiver_fixed_plan_id,
    pair.sender_plan_snapshot,
    pair.receiver_plan_snapshot
  from public.invitation_plan_pairs pair
  join public.invitations invitation
    on invitation.invitation_id = pair.invitation_id
  where pair.invitation_id = p_invitation_id
    and auth.uid() in (invitation.sender_user_id, invitation.receiver_user_id);
$$;

revoke execute on function public.get_fixed_plan_invitation_snapshots(uuid) from public, anon;
grant execute on function public.get_fixed_plan_invitation_snapshots(uuid) to authenticated;
