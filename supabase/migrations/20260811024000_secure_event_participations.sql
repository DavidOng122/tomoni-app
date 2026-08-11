-- 1. RLS Hardening for event_participations

-- Drop permissive manage_own policy
drop policy if exists event_participations_manage_own on public.event_participations;

-- Create restrictive select-only policy for current user
create policy event_participations_select_own on public.event_participations 
  for select 
  to authenticated 
  using (user_id = auth.uid());

-- Revoke direct write access from authenticated users
revoke insert, update, delete on table public.event_participations from authenticated;

-- (Select and creator_read policy remains as granted previously)

-- 2. Secure RPC: join_event
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

  -- 3. Determine target canonical status
  if v_event.event_type = 'official' then
    v_target_status := 'going';
  elsif v_event.event_type = 'user_created' then
    if v_event.approval_required = true then
      v_target_status := 'requested';
    else
      v_target_status := 'going';
    end if;
  else
    v_target_status := 'going'; -- fallback for unknown future types
  end if;

  -- 4. Check existing participation (to handle terminal states and idempotency cleanly)
  select participation_status into v_current_status
  from public.event_participations
  where event_id = p_event_id and user_id = v_user_id;

  if found then
    -- Normal users cannot self-transition out of terminal states
    if v_current_status in ('rejected', 'attended') then
      raise exception 'Cannot join: participation is %', v_current_status;
    end if;
    
    -- Idempotent success if already the correct target status
    if v_current_status = v_target_status then
      return;
    end if;

    -- Update existing (e.g., cancelled -> going/requested)
    update public.event_participations
    set participation_status = v_target_status,
        updated_at = now()
    where event_id = p_event_id and user_id = v_user_id;
  else
    -- Insert new participation
    insert into public.event_participations (event_id, user_id, participation_status)
    values (p_event_id, v_user_id, v_target_status);
  end if;
end;
$$;

-- Secure the RPC execution
revoke execute on function public.join_event(uuid) from public, anon;
grant execute on function public.join_event(uuid) to authenticated;


-- 3. Secure RPC: cancel_event_participation
create or replace function public.cancel_event_participation(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_current_status text;
begin
  -- 1. Get current authenticated user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 2. Check existing participation
  select participation_status into v_current_status
  from public.event_participations
  where event_id = p_event_id and user_id = v_user_id;

  if not found then
    -- Idempotent success (nothing to cancel)
    return;
  end if;

  -- Normal users cannot self-transition out of terminal states
  if v_current_status in ('rejected', 'attended') then
    raise exception 'Cannot cancel: participation is %', v_current_status;
  end if;

  -- Idempotent success
  if v_current_status = 'cancelled' then
    return;
  end if;

  -- Update to cancelled
  update public.event_participations
  set participation_status = 'cancelled',
      updated_at = now()
  where event_id = p_event_id and user_id = v_user_id;
end;
$$;

-- Secure the RPC execution
revoke execute on function public.cancel_event_participation(uuid) from public, anon;
grant execute on function public.cancel_event_participation(uuid) to authenticated;
