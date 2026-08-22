-- Migration: 20260822160000_implement_connection_lifecycle.sql
-- Implement Yorimi Connection / Tsunagari Lifecycle.

-- 1. Canonical Ordering & Unique Constraint on public.connections
-- Swap user_a_id and user_b_id for any legacy rows where user_a_id > user_b_id
update public.connections
set
  user_a_id = user_b_id,
  user_b_id = user_a_id
where user_a_id > user_b_id;

-- Deduplicate any existing duplicate connection rows before adding unique constraint
delete from public.connections c1
using public.connections c2
where c1.user_a_id = c2.user_a_id
  and c1.user_b_id = c2.user_b_id
  and c1.ctid < c2.ctid;

-- Add canonical check constraint
alter table public.connections
  drop constraint if exists connections_canonical_pair_check;

alter table public.connections
  add constraint connections_canonical_pair_check
  check (user_a_id < user_b_id);

-- Add table unique constraint on canonical user pair
alter table public.connections
  drop constraint if exists connections_user_a_user_b_key;

alter table public.connections
  add constraint connections_user_a_user_b_key
  unique (user_a_id, user_b_id);


-- 2. Core Helper Function: sync_connection_state
create or replace function public.sync_connection_state(
  p_user_1 uuid,
  p_user_2 uuid,
  p_source_invitation_id uuid default null
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_a uuid := least(p_user_1, p_user_2);
  v_user_b uuid := greatest(p_user_1, p_user_2);
  v_accepted_count integer := 0;
  v_existing_status text;
begin
  if v_user_a is null or v_user_b is null or v_user_a = v_user_b then
    return 'invalid_users';
  end if;

  -- Count remaining active accepted companion invitations between user A and user B
  select count(*)
  into v_accepted_count
  from public.invitations
  where invitation_status = 'accepted'
    and (
      (sender_user_id = v_user_a and receiver_user_id = v_user_b)
      or
      (sender_user_id = v_user_b and receiver_user_id = v_user_a)
    );

  -- Retrieve existing connection status for canonical user pair
  select connection_status
  into v_existing_status
  from public.connections
  where user_a_id = v_user_a and user_b_id = v_user_b;

  if v_accepted_count > 0 then
    if v_existing_status is null then
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
      on conflict (user_a_id, user_b_id) do update set
        connection_status = 'active',
        source_invitation_id = coalesce(p_source_invitation_id, public.connections.source_invitation_id);
      return 'created_active';
    elsif v_existing_status = 'removed' then
      -- Reactivation preserves original connected_at timestamp
      update public.connections
      set
        connection_status = 'active',
        source_invitation_id = coalesce(p_source_invitation_id, source_invitation_id)
      where user_a_id = v_user_a and user_b_id = v_user_b;
      return 'reactivated';
    else
      -- Already active
      if p_source_invitation_id is not null then
        update public.connections
        set source_invitation_id = p_source_invitation_id
        where user_a_id = v_user_a and user_b_id = v_user_b;
      end if;
      return 'remained_active';
    end if;
  else
    -- v_accepted_count == 0
    if v_existing_status = 'active' then
      update public.connections
      set connection_status = 'removed'
      where user_a_id = v_user_a and user_b_id = v_user_b;
      return 'removed';
    end if;
    return 'no_change';
  end if;
end;
$$;

revoke all on function public.sync_connection_state(uuid, uuid, uuid) from public, anon;
grant execute on function public.sync_connection_state(uuid, uuid, uuid) to authenticated, service_role;


-- 3. Update accept_fixed_schedule_invitation
create or replace function public.accept_fixed_schedule_invitation(
  p_invitation_id uuid
) returns jsonb
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
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if v_invitation.receiver_user_id <> v_receiver_id then
    raise exception 'Invitation not found, not pending, or not yours to accept';
  end if;

  if v_invitation.invitation_status = 'accepted' then
    -- Idempotent handling: sync connection state and return linked conversation
    perform public.sync_connection_state(v_invitation.sender_user_id, v_invitation.receiver_user_id, p_invitation_id);

    select conversation_id into v_conversation_id
    from public.conversations
    where related_invitation_id = p_invitation_id
      and fixed_plan_id is not null
      and event_id is null
      and conversation_status = 'active';

    return jsonb_build_object(
      'invitation_id', p_invitation_id,
      'conversation_id', v_conversation_id
    );
  end if;

  if v_invitation.invitation_status <> 'pending' then
    raise exception 'Invitation not found, not pending, or not yours to accept';
  end if;

  -- Update Invitation status to accepted
  update public.invitations
  set
    invitation_status = 'accepted',
    responded_at = now()
  where invitation_id = p_invitation_id
    and receiver_user_id = v_receiver_id
    and invitation_status = 'pending';

  -- Retrieve linked active conversation
  select conversation_id into v_conversation_id
  from public.conversations
  where related_invitation_id = p_invitation_id
    and fixed_plan_id is not null
    and event_id is null
    and conversation_status = 'active';

  if not found then
    raise exception 'Linked active conversation not found for this invitation';
  end if;

  -- Validate receiver membership
  if not exists (
    select 1 from public.conversation_members
    where conversation_id = v_conversation_id
      and user_id = v_receiver_id
      and left_at is null
  ) then
    raise exception 'Receiver is not an active member of the conversation';
  end if;

  -- Ensure/reactivate connection
  perform public.sync_connection_state(v_invitation.sender_user_id, v_invitation.receiver_user_id, p_invitation_id);

  return jsonb_build_object(
    'invitation_id', p_invitation_id,
    'conversation_id', v_conversation_id
  );
end;
$$;


-- 4. Update accept_event_invitation
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

  -- Lock the row and check state
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
    -- Idempotent return: sync connection and return conversation
    perform public.sync_connection_state(v_invitation.sender_user_id, v_invitation.receiver_user_id, p_invitation_id);
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
    )
    returning conversation_id into v_conversation_id;

    insert into public.conversation_members (conversation_id, user_id) values (v_conversation_id, v_invitation.sender_user_id);
    insert into public.conversation_members (conversation_id, user_id) values (v_conversation_id, v_receiver_id);
  end if;

  -- Ensure/reactivate connection
  perform public.sync_connection_state(v_invitation.sender_user_id, v_invitation.receiver_user_id, p_invitation_id);

  return v_conversation_id;
end;
$$;


-- 5. Update cancel_fixed_schedule_invitation
create or replace function public.cancel_fixed_schedule_invitation(
  p_invitation_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_invitation public.invitations%rowtype;
  v_conversation_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Unauthenticated';
  end if;

  select invitation.*
  into v_invitation
  from public.invitations as invitation
  where invitation.invitation_id = p_invitation_id
    and invitation.invitation_type = 'fixed_plan'
  for update;

  if not found then
    raise exception 'Fixed-plan invitation not found';
  end if;

  if v_invitation.invitation_status = 'cancelled' then
    -- Idempotent return
    perform public.sync_connection_state(v_invitation.sender_user_id, v_invitation.receiver_user_id);
    select conversation_id into v_conversation_id from public.conversations where related_invitation_id = p_invitation_id;
    return jsonb_build_object(
      'invitation_id', p_invitation_id,
      'conversation_id', v_conversation_id,
      'previous_status', 'cancelled',
      'cancelled_by_user_id', v_invitation.cancelled_by_user_id
    );
  end if;

  if v_invitation.invitation_status = 'pending' then
    if v_invitation.sender_user_id <> v_actor_id then
      raise exception 'Only the sender can withdraw a pending invitation';
    end if;
  elsif v_invitation.invitation_status = 'accepted' then
    if v_actor_id <> v_invitation.sender_user_id
      and v_actor_id <> v_invitation.receiver_user_id then
      raise exception 'Only an invitation participant can cancel an accepted plan';
    end if;
  else
    raise exception 'Invitation cannot be cancelled from status %', v_invitation.invitation_status;
  end if;

  update public.invitations
  set
    invitation_status = 'cancelled',
    cancelled_by_user_id = v_actor_id,
    responded_at = now()
  where invitation_id = p_invitation_id;

  update public.conversations
  set conversation_status = 'closed', closed_at = now(), updated_at = now()
  where related_invitation_id = p_invitation_id
    and fixed_plan_id is not null
    and event_id is null
    and conversation_status = 'active'
  returning conversation_id into v_conversation_id;

  if v_conversation_id is null then
    select conversation_id into v_conversation_id from public.conversations where related_invitation_id = p_invitation_id;
  end if;

  -- Recalculate connection state for the user pair
  perform public.sync_connection_state(v_invitation.sender_user_id, v_invitation.receiver_user_id);

  return jsonb_build_object(
    'invitation_id', p_invitation_id,
    'conversation_id', v_conversation_id,
    'previous_status', v_invitation.invitation_status,
    'cancelled_by_user_id', v_actor_id
  );
end;
$$;


-- 6. Update cancel_event_invitation
create or replace function public.cancel_event_invitation(
  p_invitation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_invitation public.invitations%rowtype;
begin
  if v_actor_id is null then
    return false;
  end if;

  select * into v_invitation
  from public.invitations
  where invitation_id = p_invitation_id
    and invitation_type = 'event'
  for update;

  if not found then
    return false;
  end if;

  if v_actor_id <> v_invitation.sender_user_id and v_actor_id <> v_invitation.receiver_user_id then
    return false;
  end if;

  if v_invitation.invitation_status = 'cancelled' then
    perform public.sync_connection_state(v_invitation.sender_user_id, v_invitation.receiver_user_id);
    return true; -- idempotent
  end if;

  if v_invitation.invitation_status <> 'pending' and v_invitation.invitation_status <> 'accepted' then
    return false;
  end if;

  update public.invitations
  set invitation_status = 'cancelled', responded_at = now()
  where invitation_id = p_invitation_id;

  -- Close conversation if active
  update public.conversations
  set conversation_status = 'closed', closed_at = now(), updated_at = now()
  where related_invitation_id = p_invitation_id
    and conversation_status = 'active';

  -- Recalculate connection state for the user pair
  perform public.sync_connection_state(v_invitation.sender_user_id, v_invitation.receiver_user_id);

  return true;
end;
$$;


-- 7. Update archive_fixed_plan
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

  -- Cancel ONLY pending invitations for this plan.
  -- Accepted invitations MUST NOT be cancelled by archiving a fixed plan.
  with cancelled_invitations as (
    update public.invitations
    set
      invitation_status = 'cancelled',
      cancelled_by_user_id = v_user_id,
      responded_at = now()
    where fixed_plan_id = p_fixed_plan_id
      and sender_user_id = v_user_id
      and invitation_status = 'pending'
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

  -- Sync connection state for any cancelled pending invitations
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
