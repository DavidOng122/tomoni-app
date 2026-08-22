-- Align Event participation with JST, protect chat membership, and preserve Connection provenance.

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
  v_user_id uuid := auth.uid();
  v_local_start timestamp;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_active_product_user(v_user_id) then
    raise exception 'User is not eligible to create an Event';
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

  if p_capacity is not null and p_capacity < 1 then
    raise exception 'Capacity must be at least 1';
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
    v_user_id,
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
  ) returning event_id into v_new_event_id;

  v_local_start := p_start_at at time zone 'Asia/Tokyo';

  insert into public.event_participations (
    event_id,
    user_id,
    participation_status,
    participation_date,
    arrival_time
  ) values (
    v_new_event_id,
    v_user_id,
    'going',
    v_local_start::date,
    v_local_start::time
  )
  on conflict (event_id, user_id) do update
    set participation_status = 'going',
        participation_date = excluded.participation_date,
        arrival_time = excluded.arrival_time,
        updated_at = now();

  return v_new_event_id;
end;
$$;

revoke all on function public.create_user_event(text, timestamptz, timestamptz, text, text, text, double precision, double precision, text, boolean, integer) from public, anon;
grant execute on function public.create_user_event(text, timestamptz, timestamptz, text, text, text, double precision, double precision, text, boolean, integer) to authenticated, service_role;

create or replace function public.join_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_event record;
  v_target_status text;
  v_current_status text;
  v_going_count integer;
  v_local_start timestamp;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_active_product_user(v_user_id) then
    raise exception 'User is not eligible to join an Event';
  end if;

  select event_status, event_type, approval_required, start_at, end_at, capacity, created_by_user_id
  into v_event
  from public.events
  where event_id = p_event_id
  for update;

  if not found then
    raise exception 'Event not found';
  end if;

  if v_event.event_status <> 'scheduled' then
    raise exception 'Event is not scheduled';
  end if;

  if (v_event.end_at is not null and v_event.end_at < now())
    or (v_event.end_at is null and v_event.start_at < now()) then
    raise exception 'Event has already ended';
  end if;

  if v_user_id = v_event.created_by_user_id or v_event.event_type = 'official' then
    v_target_status := 'going';
  elsif v_event.event_type = 'user_created' and v_event.approval_required then
    v_target_status := 'requested';
  else
    v_target_status := 'going';
  end if;

  select participation_status into v_current_status
  from public.event_participations
  where event_id = p_event_id and user_id = v_user_id;

  if v_current_status = v_target_status then
    return;
  end if;

  if v_current_status in ('rejected', 'attended') then
    raise exception 'Cannot join: participation is %', v_current_status;
  end if;

  if v_target_status = 'going' then
    select count(*) into v_going_count
    from public.event_participations
    where event_id = p_event_id
      and participation_status = 'going'
      and user_id <> v_user_id;

    if v_event.capacity is not null and v_going_count >= v_event.capacity then
      raise exception 'Event has reached maximum capacity';
    end if;
  end if;

  v_local_start := v_event.start_at at time zone 'Asia/Tokyo';

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
    v_local_start::date,
    v_local_start::time
  )
  on conflict (event_id, user_id) do update
    set participation_status = excluded.participation_status,
        participation_date = coalesce(public.event_participations.participation_date, excluded.participation_date),
        arrival_time = coalesce(public.event_participations.arrival_time, excluded.arrival_time),
        updated_at = now();
end;
$$;

revoke all on function public.join_event(uuid) from public, anon;
grant execute on function public.join_event(uuid) to authenticated, service_role;

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
  v_user_id uuid := auth.uid();
  v_event record;
  v_target_status text;
  v_current_status text;
  v_going_count integer;
  v_participation_date date;
  v_arrival_timestamp timestamptz;
  v_local_start timestamp;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_active_product_user(v_user_id) then
    raise exception 'User is not eligible to join an Event';
  end if;

  if p_arrival_time is null then
    raise exception 'Arrival time is required';
  end if;

  select event_status, event_type, approval_required, start_at, end_at, capacity, created_by_user_id
  into v_event
  from public.events
  where event_id = p_event_id
  for update;

  if not found then
    raise exception 'Event not found';
  end if;

  if v_event.event_status <> 'scheduled' then
    raise exception 'Event is not scheduled';
  end if;

  if (v_event.end_at is not null and v_event.end_at < now())
    or (v_event.end_at is null and v_event.start_at < now()) then
    raise exception 'Event has already ended';
  end if;

  v_local_start := v_event.start_at at time zone 'Asia/Tokyo';
  v_participation_date := v_local_start::date;

  if p_arrival_time < '12:00:00'::time and v_local_start::time >= '12:00:00'::time then
    v_participation_date := v_participation_date + 1;
  end if;

  v_arrival_timestamp := (v_participation_date + p_arrival_time) at time zone 'Asia/Tokyo';

  if v_arrival_timestamp < v_event.start_at then
    raise exception 'Arrival time is before event start';
  end if;

  if v_event.end_at is not null and v_arrival_timestamp > v_event.end_at then
    raise exception 'Arrival time is after event end';
  end if;

  if v_user_id = v_event.created_by_user_id or v_event.event_type = 'official' then
    v_target_status := 'going';
  elsif v_event.event_type = 'user_created' and v_event.approval_required then
    v_target_status := 'requested';
  else
    v_target_status := 'going';
  end if;

  select participation_status into v_current_status
  from public.event_participations
  where event_id = p_event_id and user_id = v_user_id;

  if v_current_status in ('rejected', 'attended') then
    raise exception 'Cannot join: participation is %', v_current_status;
  end if;

  if v_target_status = 'going' and v_current_status is distinct from 'going' then
    select count(*) into v_going_count
    from public.event_participations
    where event_id = p_event_id
      and participation_status = 'going'
      and user_id <> v_user_id;

    if v_event.capacity is not null and v_going_count >= v_event.capacity then
      raise exception 'Event has reached maximum capacity';
    end if;
  end if;

  insert into public.event_participations (
    event_id,
    user_id,
    participation_status,
    participation_date,
    arrival_time,
    planned_duration_minutes
  ) values (
    p_event_id,
    v_user_id,
    v_target_status,
    v_participation_date,
    p_arrival_time,
    p_planned_duration_minutes
  )
  on conflict (event_id, user_id) do update
    set participation_status = excluded.participation_status,
        participation_date = excluded.participation_date,
        arrival_time = excluded.arrival_time,
        planned_duration_minutes = excluded.planned_duration_minutes,
        updated_at = now();
end;
$$;

revoke all on function public.join_event_with_plan(uuid, time, integer) from public, anon;
grant execute on function public.join_event_with_plan(uuid, time, integer) to authenticated, service_role;

create or replace function public.approve_event_participant(p_participation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := auth.uid();
  v_event_id uuid;
  v_created_by_user_id uuid;
  v_current_status text;
  v_capacity integer;
  v_going_count integer;
  v_target_user_id uuid;
begin
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select participation.participation_status,
         participation.event_id,
         event.created_by_user_id,
         event.capacity,
         participation.user_id
  into v_current_status, v_event_id, v_created_by_user_id, v_capacity, v_target_user_id
  from public.event_participations participation
  join public.events event on event.event_id = participation.event_id
  where participation.participation_id = p_participation_id
  for update of event;

  if not found then
    raise exception 'Participation not found';
  end if;

  if v_created_by_user_id <> v_caller_id then
    raise exception 'Not authorized';
  end if;

  if not public.is_active_product_user(v_target_user_id) then
    raise exception 'Participant is not eligible';
  end if;

  if v_current_status = 'going' then
    return v_event_id;
  end if;

  if v_current_status <> 'requested' then
    raise exception 'Participation is not pending approval';
  end if;

  select count(*) into v_going_count
  from public.event_participations
  where event_id = v_event_id
    and participation_status = 'going'
    and user_id <> v_target_user_id;

  if v_capacity is not null and v_going_count >= v_capacity then
    raise exception 'Event has reached maximum capacity. Cannot approve request.';
  end if;

  update public.event_participations participation
  set participation_status = 'going', updated_at = now()
  from public.events event
  where participation.event_id = event.event_id
    and participation.participation_id = p_participation_id
    and event.created_by_user_id = v_caller_id
    and participation.participation_status = 'requested'
    and event.event_status = 'scheduled'
    and (event.end_at >= now() or (event.end_at is null and event.start_at >= now()))
  returning participation.event_id into v_event_id;

  if v_event_id is null then
    raise exception 'Approve failed. Request may have been cancelled or event is ineligible.';
  end if;

  return v_event_id;
end;
$$;

revoke all on function public.approve_event_participant(uuid) from public, anon;
grant execute on function public.approve_event_participant(uuid) to authenticated, service_role;

create or replace function public.sync_connection_state(
  p_user_1 uuid,
  p_user_2 uuid,
  p_source_invitation_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_a uuid := least(p_user_1, p_user_2);
  v_user_b uuid := greatest(p_user_1, p_user_2);
  v_accepted_count integer;
  v_existing_status text;
begin
  if v_user_a is null or v_user_b is null or v_user_a = v_user_b then
    return 'invalid_users';
  end if;

  select count(*) into v_accepted_count
  from public.invitations
  where invitation_status = 'accepted'
    and least(sender_user_id, receiver_user_id) = v_user_a
    and greatest(sender_user_id, receiver_user_id) = v_user_b;

  select connection_status into v_existing_status
  from public.connections
  where user_a_id = v_user_a and user_b_id = v_user_b
  for update;

  if v_accepted_count > 0 then
    if not found then
      insert into public.connections (
        user_a_id,
        user_b_id,
        connection_status,
        connected_at,
        source_invitation_id
      ) values (
        v_user_a,
        v_user_b,
        'active',
        now(),
        p_source_invitation_id
      )
      on conflict (user_a_id, user_b_id) do update
        set connection_status = 'active',
            source_invitation_id = case
              when public.connections.connection_status = 'removed'
                then coalesce(excluded.source_invitation_id, public.connections.source_invitation_id)
              else public.connections.source_invitation_id
            end;
      return 'created_active';
    end if;

    if v_existing_status = 'removed' then
      update public.connections
      set connection_status = 'active',
          source_invitation_id = coalesce(p_source_invitation_id, source_invitation_id)
      where user_a_id = v_user_a and user_b_id = v_user_b;
      return 'reactivated';
    end if;

    return 'remained_active';
  end if;

  if v_existing_status = 'active' then
    update public.connections
    set connection_status = 'removed'
    where user_a_id = v_user_a and user_b_id = v_user_b;
    return 'removed';
  end if;

  return 'no_change';
end;
$$;

revoke all on function public.sync_connection_state(uuid, uuid, uuid) from public, anon;
grant execute on function public.sync_connection_state(uuid, uuid, uuid) to authenticated, service_role;

create or replace function public.decline_fixed_schedule_invitation(
  p_invitation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receiver_id uuid := auth.uid();
  v_invitation public.invitations%rowtype;
  v_conversation_id uuid;
begin
  if v_receiver_id is null then
    raise exception 'Unauthenticated';
  end if;

  select * into v_invitation
  from public.invitations
  where invitation_id = p_invitation_id
    and invitation_type = 'fixed_plan'
  for update;

  if not found or v_invitation.receiver_user_id <> v_receiver_id then
    raise exception 'Invitation not found, not pending, or not yours to decline';
  end if;

  if v_invitation.invitation_status = 'declined' then
    select conversation_id into v_conversation_id
    from public.conversations
    where related_invitation_id = p_invitation_id;
    return jsonb_build_object('invitation_id', p_invitation_id, 'conversation_id', v_conversation_id);
  end if;

  if v_invitation.invitation_status <> 'pending' then
    raise exception 'Invitation not found, not pending, or not yours to decline';
  end if;

  update public.invitations
  set invitation_status = 'declined', responded_at = now()
  where invitation_id = p_invitation_id;

  update public.conversations
  set conversation_status = 'closed', closed_at = now(), updated_at = now()
  where related_invitation_id = p_invitation_id
    and fixed_plan_id is not null
    and event_id is null
    and conversation_status = 'active'
  returning conversation_id into v_conversation_id;

  if v_conversation_id is null then
    raise exception 'Linked active conversation not found to close';
  end if;

  return jsonb_build_object('invitation_id', p_invitation_id, 'conversation_id', v_conversation_id);
end;
$$;

revoke all on function public.decline_fixed_schedule_invitation(uuid) from public, anon;
grant execute on function public.decline_fixed_schedule_invitation(uuid) to authenticated, service_role;

create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members member
    where member.conversation_id = p_conversation_id
      and member.user_id = auth.uid()
      and member.left_at is null
  );
$$;

revoke all on function public.is_conversation_member(uuid) from public, anon;
grant execute on function public.is_conversation_member(uuid) to authenticated, service_role;

drop policy if exists conversations_select_member on public.conversations;
create policy conversations_select_member
on public.conversations for select to authenticated
using (public.is_conversation_member(conversation_id));

drop policy if exists conversation_members_select_member on public.conversation_members;
create policy conversation_members_select_member
on public.conversation_members for select to authenticated
using (public.is_conversation_member(conversation_id));

drop policy if exists messages_select_member on public.messages;
create policy messages_select_member
on public.messages for select to authenticated
using (public.is_conversation_member(conversation_id));
