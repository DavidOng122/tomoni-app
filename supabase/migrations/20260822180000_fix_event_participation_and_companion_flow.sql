-- Migration: 20260822180000_fix_event_participation_and_companion_flow.sql
-- Fix Event companion invitation schema bugs, enforce database capacity, auto-participate creator, and handle leave/cancel lifecycles.

-- 1. Fix profiles.id schema bug in get_same_event_people
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

  v_caller_datetime := (v_caller_participation.participation_date + v_caller_participation.arrival_time) at time zone 'Asia/Tokyo';

  return query
  select
    c.user_id,
    prof.nickname,
    prof.avatar_url,
    case
      when abs(extract(epoch from (v_caller_datetime - ((c.participation_date + c.arrival_time) at time zone 'Asia/Tokyo')))) <= 900 then '同じ時間帯'
      else '近い時間に参加予定'
    end as compatibility_label
  from public.event_participations c
  join public.profiles prof on c.user_id = prof.user_id
  where c.event_id = p_event_id
    and c.user_id <> v_caller_id
    and c.participation_status = 'going'
    and c.participation_date is not null
    and c.arrival_time is not null
    and prof.profile_status = 'active'
    and abs(extract(epoch from (v_caller_datetime - ((c.participation_date + c.arrival_time) at time zone 'Asia/Tokyo')))) <= 3600
    -- Exclusion 1: Active connection
    and not exists (
      select 1 from public.connections conn
      where conn.connection_status = 'active'
        and (
          (conn.user_a_id = v_caller_id and conn.user_b_id = c.user_id) or
          (conn.user_a_id = c.user_id and conn.user_b_id = v_caller_id)
        )
    )
    -- Exclusion 2: ANY event invitation for THIS event in either direction
    and not exists (
      select 1 from public.invitations i
      where i.event_id = p_event_id
        and i.invitation_type = 'event'
        and (
          (i.sender_user_id = v_caller_id and i.receiver_user_id = c.user_id) or
          (i.sender_user_id = c.user_id and i.receiver_user_id = v_caller_id)
        )
    )
  order by
    abs(extract(epoch from (v_caller_datetime - ((c.participation_date + c.arrival_time) at time zone 'Asia/Tokyo')))) asc,
    c.user_id asc
  limit 5;
end;
$$;
revoke all on function public.get_same_event_people(uuid) from public, anon;
grant execute on function public.get_same_event_people(uuid) to authenticated, service_role;

grant execute on function public.get_event_participant_preview(uuid) to authenticated, service_role;


-- 2. Fix profiles.id schema bug in create_event_invitation
create or replace function public.create_event_invitation(
  p_event_id uuid,
  p_receiver_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid := auth.uid();
  v_sender_participation public.event_participations%rowtype;
  v_receiver_participation public.event_participations%rowtype;
  v_event public.events%rowtype;
  v_sender_datetime timestamptz;
  v_receiver_datetime timestamptz;
  v_receiver_profile public.profiles%rowtype;
  v_invitation_id uuid;
  v_expires_at timestamptz;
begin
  if v_sender_id is null or v_sender_id = p_receiver_user_id then
    raise exception 'Invalid sender or receiver';
  end if;

  select * into v_event
  from public.events
  where event_id = p_event_id
    and event_status = 'scheduled'
    and (end_at is null or end_at > now());

  if not found then
    raise exception 'Event not valid for invitation';
  end if;

  v_expires_at := coalesce(v_event.end_at, v_event.start_at + interval '1 day');

  select * into v_sender_participation
  from public.event_participations
  where event_id = p_event_id
    and user_id = v_sender_id
    and participation_status = 'going'
    and participation_date is not null
    and arrival_time is not null;

  if not found then
    raise exception 'Sender not eligible';
  end if;

  select * into v_receiver_participation
  from public.event_participations
  where event_id = p_event_id
    and user_id = p_receiver_user_id
    and participation_status = 'going'
    and participation_date is not null
    and arrival_time is not null;

  if not found then
    raise exception 'Receiver not eligible';
  end if;

  select * into v_receiver_profile
  from public.profiles
  where user_id = p_receiver_user_id
    and profile_status = 'active';

  if not found then
    raise exception 'Receiver profile not displayable';
  end if;

  v_sender_datetime := (v_sender_participation.participation_date + v_sender_participation.arrival_time) at time zone 'Asia/Tokyo';
  v_receiver_datetime := (v_receiver_participation.participation_date + v_receiver_participation.arrival_time) at time zone 'Asia/Tokyo';

  if abs(extract(epoch from (v_sender_datetime - v_receiver_datetime))) > 3600 then
    raise exception 'Time difference too large';
  end if;

  if exists (
    select 1 from public.connections conn
    where conn.connection_status = 'active'
      and (
        (conn.user_a_id = v_sender_id and conn.user_b_id = p_receiver_user_id) or
        (conn.user_a_id = p_receiver_user_id and conn.user_b_id = v_sender_id)
      )
  ) then
    raise exception 'Connection already exists';
  end if;

  insert into public.invitations (
    sender_user_id,
    receiver_user_id,
    invitation_type,
    event_id,
    invitation_status,
    expires_at
  ) values (
    v_sender_id,
    p_receiver_user_id,
    'event',
    p_event_id,
    'pending',
    v_expires_at
  ) returning invitation_id into v_invitation_id;

  return v_invitation_id;
end;
$$;
revoke all on function public.create_event_invitation(uuid, uuid) from public, anon;
grant execute on function public.create_event_invitation(uuid, uuid) to authenticated, service_role;


-- 3. Fix profiles.id schema bug in get_received_event_invitations
create or replace function public.get_received_event_invitations()
returns table (
  invitation_id uuid,
  sender_user_id uuid,
  sender_nickname text,
  sender_avatar_url text,
  event_id uuid,
  event_title text,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return;
  end if;

  return query
  select
    i.invitation_id,
    i.sender_user_id,
    p.nickname as sender_nickname,
    p.avatar_url as sender_avatar_url,
    i.event_id,
    e.title as event_title,
    i.created_at,
    i.expires_at
  from public.invitations i
  join public.profiles p on i.sender_user_id = p.user_id
  join public.events e on i.event_id = e.event_id
  where i.receiver_user_id = v_user_id
    and i.invitation_type = 'event'
    and i.invitation_status = 'pending'
    and (i.expires_at is null or i.expires_at > now())
    and e.event_status = 'scheduled'
    and (e.end_at is null or e.end_at > now())
    and exists (
      select 1 from public.event_participations ep_sender
      where ep_sender.user_id = i.sender_user_id and ep_sender.event_id = i.event_id and ep_sender.participation_status = 'going'
    )
    and exists (
      select 1 from public.event_participations ep_receiver
      where ep_receiver.user_id = i.receiver_user_id and ep_receiver.event_id = i.event_id and ep_receiver.participation_status = 'going'
    );
end;
$$;
revoke all on function public.get_received_event_invitations() from public, anon;
grant execute on function public.get_received_event_invitations() to authenticated, service_role;


-- 4. Update create_user_event to automatically make Creator 'going'
create or replace function public.create_user_event(
  p_title text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_place_id text default null,
  p_place_name text default '',
  p_address text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_description text default null,
  p_approval_required boolean default false,
  p_capacity integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new_event_id uuid;
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if trim(p_title) = '' then
    raise exception 'Title cannot be empty';
  end if;

  if p_start_at is null or p_end_at is null then
    raise exception 'Start and end times are required';
  end if;

  if p_end_at <= p_start_at then
    raise exception 'End time must be after start time';
  end if;

  if trim(p_place_name) = '' then
    raise exception 'Place name is required';
  end if;

  insert into public.events (
    event_type,
    created_by_user_id,
    title,
    start_at,
    end_at,
    place_id,
    place_name,
    address,
    latitude,
    longitude,
    description,
    approval_required,
    capacity,
    looking_for_participants,
    event_status,
    registration_required,
    registration_status
  ) values (
    'user_created',
    v_uid,
    trim(p_title),
    p_start_at,
    p_end_at,
    p_place_id,
    trim(p_place_name),
    p_address,
    p_latitude,
    p_longitude,
    nullif(trim(p_description), ''),
    p_approval_required,
    p_capacity,
    true,
    'scheduled',
    false,
    'not_required'
  )
  returning event_id into v_new_event_id;

  -- Automatically insert creator as 'going'
  insert into public.event_participations (
    event_id,
    user_id,
    participation_status,
    participation_date,
    arrival_time
  ) values (
    v_new_event_id,
    v_uid,
    'going',
    p_start_at::date,
    p_start_at::time
  ) on conflict (event_id, user_id) do update
    set participation_status = 'going',
        participation_date = excluded.participation_date,
        arrival_time = excluded.arrival_time,
        updated_at = now();

  return v_new_event_id;
end;
$$;
revoke execute on function public.create_user_event(text, timestamptz, timestamptz, text, text, text, double precision, double precision, text, boolean, integer) from public, anon;
grant execute on function public.create_user_event(text, timestamptz, timestamptz, text, text, text, double precision, double precision, text, boolean, integer) to authenticated, service_role;


-- 5. Database-safe Capacity Limits & Creator Self-Join Guard in join_event
create or replace function public.join_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_event record;
  v_target_status text;
  v_current_status text;
  v_going_count integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Lock event row for atomic capacity check
  select event_status, event_type, approval_required, start_at, end_at, capacity, created_by_user_id
  into v_event
  from public.events
  where event_id = p_event_id
  for update;

  if not found then
    raise exception 'Event not found';
  end if;

  if v_event.event_status != 'scheduled' then
    raise exception 'Event is not scheduled';
  end if;

  if (v_event.end_at is not null and v_event.end_at < now()) or
     (v_event.end_at is null and v_event.start_at < now()) then
    raise exception 'Event has already ended';
  end if;

  -- Creator self-join logic
  if v_user_id = v_event.created_by_user_id then
    v_target_status := 'going';
  elsif v_event.event_type = 'official' then
    v_target_status := 'going';
  elsif v_event.event_type = 'user_created' then
    if v_event.approval_required = true then
      v_target_status := 'requested';
    else
      v_target_status := 'going';
    end if;
  else
    v_target_status := 'going';
  end if;

  -- Capacity Check when entering 'going' status
  if v_target_status = 'going' then
    select count(*) into v_going_count
    from public.event_participations
    where event_id = p_event_id and participation_status = 'going' and user_id <> v_user_id;

    if v_event.capacity is not null and v_going_count >= v_event.capacity then
      select participation_status into v_current_status
      from public.event_participations
      where event_id = p_event_id and user_id = v_user_id;
      if v_current_status = 'going' then
        return; -- Idempotent success
      end if;
      raise exception 'Event has reached maximum capacity';
    end if;
  end if;

  select participation_status into v_current_status
  from public.event_participations
  where event_id = p_event_id and user_id = v_user_id;

  if found then
    if v_current_status in ('rejected', 'attended') then
      raise exception 'Cannot join: participation is %', v_current_status;
    end if;

    if v_current_status = v_target_status then
      return;
    end if;

    update public.event_participations
    set participation_status = v_target_status,
        participation_date = coalesce(participation_date, v_event.start_at::date),
        arrival_time = coalesce(arrival_time, v_event.start_at::time),
        updated_at = now()
    where event_id = p_event_id and user_id = v_user_id;
  else
    insert into public.event_participations (
      event_id,
      user_id,
      participation_status,
      participation_date,
      arrival_time
    ) values (
      p_event_id,
      v_user_id,
      v_target_status,
      v_event.start_at::date,
      v_event.start_at::time
    );
  end if;
end;
$$;
revoke execute on function public.join_event(uuid) from public, anon;
grant execute on function public.join_event(uuid) to authenticated, service_role;


-- 5b. Database-safe Capacity Limits in join_event_with_plan
create or replace function public.join_event_with_plan(
  p_event_id uuid,
  p_arrival_time time,
  p_planned_duration_minutes integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_event record;
  v_target_status text;
  v_current_status text;
  v_going_count integer;
  v_participation_date date;
  v_arrival_timestamp timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select event_status, event_type, approval_required, start_at, end_at, capacity, created_by_user_id
  into v_event
  from public.events
  where event_id = p_event_id
  for update;

  if not found then
    raise exception 'Event not found';
  end if;

  if v_event.event_status != 'scheduled' then
    raise exception 'Event is not scheduled';
  end if;

  if (v_event.end_at is not null and v_event.end_at < now()) or
     (v_event.end_at is null and v_event.start_at < now()) then
    raise exception 'Event has already ended';
  end if;

  v_participation_date := (v_event.start_at at time zone 'Asia/Tokyo')::date;

  if p_arrival_time < '12:00:00'::time and (v_event.start_at at time zone 'Asia/Tokyo')::time >= '12:00:00'::time then
    v_participation_date := v_participation_date + interval '1 day';
  end if;

  v_arrival_timestamp := (v_participation_date + p_arrival_time) at time zone 'Asia/Tokyo';

  if v_arrival_timestamp < v_event.start_at then
    raise exception 'Arrival time % is before event start %', p_arrival_time, v_event.start_at;
  end if;

  if v_event.end_at is not null and v_arrival_timestamp > v_event.end_at then
    raise exception 'Arrival time % is after event end %', p_arrival_time, v_event.end_at;
  end if;

  if v_user_id = v_event.created_by_user_id then
    v_target_status := 'going';
  elsif v_event.event_type = 'official' then
    v_target_status := 'going';
  elsif v_event.event_type = 'user_created' then
    if v_event.approval_required = true then
      v_target_status := 'requested';
    else
      v_target_status := 'going';
    end if;
  else
    v_target_status := 'going';
  end if;

  if v_target_status = 'going' then
    select count(*) into v_going_count
    from public.event_participations
    where event_id = p_event_id and participation_status = 'going' and user_id <> v_user_id;

    if v_event.capacity is not null and v_going_count >= v_event.capacity then
      select participation_status into v_current_status
      from public.event_participations
      where event_id = p_event_id and user_id = v_user_id;
      if v_current_status = 'going' then
        return; -- Idempotent success
      end if;
      raise exception 'Event has reached maximum capacity';
    end if;
  end if;

  select participation_status into v_current_status
  from public.event_participations
  where event_id = p_event_id and user_id = v_user_id;

  if found then
    if v_current_status in ('rejected', 'attended') then
      raise exception 'Cannot join: participation is %', v_current_status;
    end if;

    update public.event_participations
    set participation_status = v_target_status,
        participation_date = v_participation_date,
        arrival_time = p_arrival_time,
        planned_duration_minutes = p_planned_duration_minutes,
        updated_at = now()
    where event_id = p_event_id and user_id = v_user_id;
  else
    insert into public.event_participations (event_id, user_id, participation_status, participation_date, arrival_time, planned_duration_minutes)
    values (p_event_id, v_user_id, v_target_status, v_participation_date, p_arrival_time, p_planned_duration_minutes);
  end if;
end;
$$;
revoke execute on function public.join_event_with_plan(uuid, time, integer) from public, anon;
grant execute on function public.join_event_with_plan(uuid, time, integer) to authenticated, service_role;


-- 6. Database-safe Capacity Limits in approve_event_participant
create or replace function public.approve_event_participant(p_participation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_event_id uuid;
  v_created_by_user_id uuid;
  v_current_status text;
  v_capacity integer;
  v_going_count integer;
  v_target_user_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select ep.participation_status, ep.event_id, e.created_by_user_id, e.capacity, ep.user_id
  into v_current_status, v_event_id, v_created_by_user_id, v_capacity, v_target_user_id
  from public.event_participations ep
  join public.events e on e.event_id = ep.event_id
  where ep.participation_id = p_participation_id
  for update of e;

  if not found then
    raise exception 'Participation not found';
  end if;

  if v_created_by_user_id != v_caller_id then
    raise exception 'Not authorized';
  end if;

  if v_current_status = 'going' then
    return v_event_id;
  end if;

  -- Re-check capacity before approving
  select count(*) into v_going_count
  from public.event_participations
  where event_id = v_event_id and participation_status = 'going' and user_id <> v_target_user_id;

  if v_capacity is not null and v_going_count >= v_capacity then
    raise exception 'Event has reached maximum capacity. Cannot approve request.';
  end if;

  update public.event_participations ep
  set participation_status = 'going',
      updated_at = now()
  from public.events e
  where ep.event_id = e.event_id
    and ep.participation_id = p_participation_id
    and e.created_by_user_id = v_caller_id
    and ep.participation_status = 'requested'
    and e.event_status = 'scheduled'
    and (e.end_at >= now() or (e.end_at is null and e.start_at >= now()))
  returning ep.event_id into v_event_id;

  if v_event_id is null then
    raise exception 'Approve failed. Request may have been cancelled or event is ineligible.';
  end if;

  return v_event_id;
end;
$$;
revoke execute on function public.approve_event_participant(uuid) from public, anon;
grant execute on function public.approve_event_participant(uuid) to authenticated, service_role;


-- 7. Sync connection state on accept_event_invitation
create or replace function public.accept_event_invitation(
  p_invitation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receiver_id uuid := auth.uid();
  v_invitation public.invitations%rowtype;
  v_event public.events%rowtype;
  v_conversation_id uuid;
begin
  if v_receiver_id is null then
    raise exception 'Unauthorized';
  end if;

  select * into v_invitation
  from public.invitations
  where invitation_id = p_invitation_id
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if v_invitation.receiver_user_id <> v_receiver_id then
    raise exception 'Unauthorized';
  end if;

  if v_invitation.invitation_status = 'accepted' then
    select conversation_id into v_conversation_id from public.conversations where related_invitation_id = p_invitation_id;
    if v_conversation_id is not null then
      return v_conversation_id;
    else
      raise exception 'Conversation missing for accepted invitation';
    end if;
  end if;

  if v_invitation.invitation_status <> 'pending' then
    raise exception 'Invitation not pending';
  end if;

  if v_invitation.expires_at is not null and v_invitation.expires_at < now() then
    raise exception 'Invitation expired';
  end if;

  select * into v_event
  from public.events
  where event_id = v_invitation.event_id
    and event_status = 'scheduled'
    and (end_at is null or end_at > now());

  if not found then
    raise exception 'Event not valid for acceptance';
  end if;

  if not exists (
    select 1 from public.event_participations
    where user_id = v_invitation.sender_user_id
      and event_id = v_invitation.event_id
      and participation_status = 'going'
  ) then
    raise exception 'Sender is no longer going';
  end if;

  if not exists (
    select 1 from public.event_participations
    where user_id = v_receiver_id
      and event_id = v_invitation.event_id
      and participation_status = 'going'
  ) then
    raise exception 'Receiver is no longer going';
  end if;

  update public.invitations
  set invitation_status = 'accepted', responded_at = now()
  where invitation_id = p_invitation_id and invitation_status = 'pending';

  select conversation_id into v_conversation_id
  from public.conversations
  where related_invitation_id = p_invitation_id;

  if v_conversation_id is null then
    insert into public.conversations (
      related_invitation_id,
      event_id,
      conversation_status
    ) values (
      p_invitation_id,
      v_invitation.event_id,
      'active'
    ) returning conversation_id into v_conversation_id;

    insert into public.conversation_members (conversation_id, user_id) values (v_conversation_id, v_invitation.sender_user_id);
    insert into public.conversation_members (conversation_id, user_id) values (v_conversation_id, v_receiver_id);
  end if;

  -- Sync connection state for companion pair
  perform public.sync_connection_state(v_invitation.sender_user_id, v_receiver_id);

  return v_conversation_id;
end;
$$;
revoke execute on function public.accept_event_invitation(uuid) from public, anon;
grant execute on function public.accept_event_invitation(uuid) to authenticated, service_role;


-- 8. Enable Cancelling Accepted or Pending Event Invitations
create or replace function public.cancel_event_invitation(
  p_invitation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := auth.uid();
  v_invitation public.invitations%rowtype;
  v_conversation_id uuid;
begin
  if v_caller_id is null then
    return false;
  end if;

  select * into v_invitation
  from public.invitations
  where invitation_id = p_invitation_id
  for update;

  if not found or (v_invitation.sender_user_id <> v_caller_id and v_invitation.receiver_user_id <> v_caller_id) then
    return false;
  end if;

  if v_invitation.invitation_status = 'cancelled' then
    return true; -- idempotent
  end if;

  if v_invitation.invitation_status not in ('pending', 'accepted') then
    return false;
  end if;

  update public.invitations
  set invitation_status = 'cancelled',
      cancelled_by_user_id = v_caller_id,
      responded_at = now()
  where invitation_id = p_invitation_id;

  -- Close linked 1:1 companion conversation
  select conversation_id into v_conversation_id
  from public.conversations
  where related_invitation_id = p_invitation_id;

  if v_conversation_id is not null then
    update public.conversations
    set conversation_status = 'closed',
        closed_at = now(),
        updated_at = now()
    where conversation_id = v_conversation_id;
  end if;

  -- Sync connection state
  perform public.sync_connection_state(v_invitation.sender_user_id, v_invitation.receiver_user_id);

  return true;
end;
$$;
revoke execute on function public.cancel_event_invitation(uuid) from public, anon;
grant execute on function public.cancel_event_invitation(uuid) to authenticated, service_role;


-- 9. Complete Leave Event Cleanup in cancel_event_participation
create or replace function public.cancel_event_participation(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_created_by_user_id uuid;
  v_current_status text;
  v_inv record;
  v_group_conv_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Constraint 2: Creator MUST NOT leave their own event through normal flow
  select created_by_user_id into v_created_by_user_id
  from public.events
  where event_id = p_event_id;

  if v_created_by_user_id = v_user_id then
    raise exception 'Event creator cannot leave their own event';
  end if;

  select participation_status into v_current_status
  from public.event_participations
  where event_id = p_event_id and user_id = v_user_id;

  if not found then
    return;
  end if;

  if v_current_status in ('rejected', 'attended') then
    raise exception 'Cannot cancel: participation is %', v_current_status;
  end if;

  if v_current_status = 'cancelled' then
    return;
  end if;

  -- 1. Cancel event participation
  update public.event_participations
  set participation_status = 'cancelled',
      updated_at = now()
  where event_id = p_event_id and user_id = v_user_id;

  -- 2. Cancel all event companion invitations (pending OR accepted) involving this user for THIS event only
  for v_inv in
    select invitation_id, sender_user_id, receiver_user_id
    from public.invitations
    where event_id = p_event_id
      and invitation_type = 'event'
      and invitation_status in ('pending', 'accepted')
      and (sender_user_id = v_user_id or receiver_user_id = v_user_id)
  loop
    update public.invitations
    set invitation_status = 'cancelled',
        cancelled_by_user_id = v_user_id,
        responded_at = now()
    where invitation_id = v_inv.invitation_id;

    -- Close linked 1:1 companion conversation
    update public.conversations
    set conversation_status = 'closed',
        closed_at = now(),
        updated_at = now()
    where related_invitation_id = v_inv.invitation_id;

    -- Sync connection state for companion pair
    perform public.sync_connection_state(v_inv.sender_user_id, v_inv.receiver_user_id);
  end loop;

  -- 3. Leave active Event group conversation if present
  select conversation_id into v_group_conv_id
  from public.conversations
  where event_id = p_event_id
    and related_invitation_id is null
    and fixed_plan_id is null;

  if v_group_conv_id is not null then
    update public.conversation_members
    set left_at = now()
    where conversation_id = v_group_conv_id
      and user_id = v_user_id
      and left_at is null;
  end if;
end;
$$;
revoke execute on function public.cancel_event_participation(uuid) from public, anon;
grant execute on function public.cancel_event_participation(uuid) to authenticated, service_role;
