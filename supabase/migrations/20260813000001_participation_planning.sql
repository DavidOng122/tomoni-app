-- 1. Privacy Fix: Drop the permissive creator read policy
drop policy if exists event_participations_creator_read on public.event_participations;

-- 2. Add duration column and constraint
alter table public.event_participations
add column if not exists planned_duration_minutes integer;

alter table public.event_participations
drop constraint if exists event_participations_duration_check;

alter table public.event_participations
add constraint event_participations_duration_check 
check (planned_duration_minutes is null or planned_duration_minutes in (30, 60));

-- 3. Create join_event_with_plan RPC
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
  v_participation_date date;
  v_arrival_timestamp timestamptz;
begin
  -- 1. Get current authenticated user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 2. Get event & validate eligibility
  select event_status, event_type, approval_required, start_at, end_at 
  into v_event 
  from public.events 
  where event_id = p_event_id;

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

  -- 3. Derive participation date (Cross-midnight handling)
  -- The event start_at determines the base date.
  v_participation_date := (v_event.start_at at time zone 'Asia/Tokyo')::date;
  
  -- If arrival time is very early (e.g., < 12:00) and start_at time is later (e.g. >= 12:00),
  -- it implies the arrival is the next day for a cross-midnight event.
  if p_arrival_time < '12:00:00'::time and (v_event.start_at at time zone 'Asia/Tokyo')::time >= '12:00:00'::time then
    v_participation_date := v_participation_date + interval '1 day';
  end if;
  
  -- 4. Validate arrival time is within [start_at, end_at] locally.
  v_arrival_timestamp := (v_participation_date + p_arrival_time) at time zone 'Asia/Tokyo';
  
  if v_arrival_timestamp < v_event.start_at then
    raise exception 'Arrival time % is before event start %', p_arrival_time, v_event.start_at;
  end if;
  
  if v_event.end_at is not null and v_arrival_timestamp > v_event.end_at then
    raise exception 'Arrival time % is after event end %', p_arrival_time, v_event.end_at;
  end if;

  -- 5. Determine target canonical status
  if v_event.event_type = 'official' then
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

  -- 6. Check existing participation
  select participation_status into v_current_status
  from public.event_participations
  where event_id = p_event_id and user_id = v_user_id;

  if found then
    if v_current_status in ('rejected', 'attended') then
      raise exception 'Cannot join: participation is %', v_current_status;
    end if;
    
    -- Update existing (including updating the planning metadata for cancelled -> going/requested)
    update public.event_participations
    set participation_status = v_target_status,
        participation_date = v_participation_date,
        arrival_time = p_arrival_time,
        planned_duration_minutes = p_planned_duration_minutes,
        updated_at = now()
    where event_id = p_event_id and user_id = v_user_id;
  else
    -- Insert new participation
    insert into public.event_participations (event_id, user_id, participation_status, participation_date, arrival_time, planned_duration_minutes)
    values (p_event_id, v_user_id, v_target_status, v_participation_date, p_arrival_time, p_planned_duration_minutes);
  end if;
end;
$$;

-- Secure the RPC execution
revoke execute on function public.join_event_with_plan(uuid, time, integer) from public, anon;
grant execute on function public.join_event_with_plan(uuid, time, integer) to authenticated;
