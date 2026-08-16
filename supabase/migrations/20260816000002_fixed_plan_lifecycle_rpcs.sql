-- P4: Fixed Schedule Invitation Lifecycle RPCs
-- accept, decline, and cancel

create or replace function public.accept_fixed_schedule_invitation(
  p_invitation_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receiver_id uuid := auth.uid();
  v_conversation_id uuid;
  v_rows_affected int;
begin
  if v_receiver_id is null then
    raise exception 'Unauthenticated';
  end if;

  -- 1. Compare-And-Set on Invitation
  update public.invitations
  set 
    invitation_status = 'accepted',
    responded_at = now()
  where invitation_id = p_invitation_id
    and receiver_user_id = v_receiver_id
    and invitation_status = 'pending';

  get diagnostics v_rows_affected = row_count;
  if v_rows_affected = 0 then
    raise exception 'Invitation not found, not pending, or not yours to accept';
  end if;

  -- 2. Validate and retrieve the linked conversation
  select conversation_id into v_conversation_id
  from public.conversations
  where related_invitation_id = p_invitation_id
    and fixed_plan_id is not null
    and event_id is null
    and conversation_status = 'active';

  if not found then
    raise exception 'Linked active conversation not found for this invitation';
  end if;

  -- 3. Validate receiver is still an active member of this conversation
  if not exists (
    select 1 from public.conversation_members
    where conversation_id = v_conversation_id
      and user_id = v_receiver_id
      and left_at is null
  ) then
    raise exception 'Receiver is not an active member of the conversation';
  end if;

  return jsonb_build_object(
    'invitation_id', p_invitation_id,
    'conversation_id', v_conversation_id
  );
end;
$$;


create or replace function public.decline_fixed_schedule_invitation(
  p_invitation_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receiver_id uuid := auth.uid();
  v_conversation_id uuid;
  v_inv_rows int;
  v_conv_rows int;
begin
  if v_receiver_id is null then
    raise exception 'Unauthenticated';
  end if;

  -- 1. Compare-And-Set on Invitation
  update public.invitations
  set 
    invitation_status = 'declined',
    responded_at = now()
  where invitation_id = p_invitation_id
    and receiver_user_id = v_receiver_id
    and invitation_status = 'pending'
  returning fixed_plan_id into v_conversation_id; -- Just to check something, actually we need related_invitation_id from conversation

  get diagnostics v_inv_rows = row_count;
  if v_inv_rows = 0 then
    raise exception 'Invitation not found, not pending, or not yours to decline';
  end if;

  -- 2. Update Conversation to Closed
  update public.conversations
  set conversation_status = 'closed'
  where related_invitation_id = p_invitation_id
    and fixed_plan_id is not null
    and event_id is null
    and conversation_status = 'active'
  returning conversation_id into v_conversation_id;

  get diagnostics v_conv_rows = row_count;
  if v_conv_rows = 0 then
    raise exception 'Linked active conversation not found to close';
  end if;

  return jsonb_build_object(
    'invitation_id', p_invitation_id,
    'conversation_id', v_conversation_id
  );
end;
$$;


create or replace function public.cancel_fixed_schedule_invitation(
  p_invitation_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid := auth.uid();
  v_conversation_id uuid;
  v_inv_rows int;
  v_conv_rows int;
begin
  if v_sender_id is null then
    raise exception 'Unauthenticated';
  end if;

  -- 1. Compare-And-Set on Invitation
  update public.invitations
  set 
    invitation_status = 'cancelled',
    responded_at = now()
  where invitation_id = p_invitation_id
    and sender_user_id = v_sender_id
    and invitation_status = 'pending';

  get diagnostics v_inv_rows = row_count;
  if v_inv_rows = 0 then
    raise exception 'Invitation not found, not pending, or not yours to cancel';
  end if;

  -- 2. Update Conversation to Closed
  update public.conversations
  set conversation_status = 'closed'
  where related_invitation_id = p_invitation_id
    and fixed_plan_id is not null
    and event_id is null
    and conversation_status = 'active'
  returning conversation_id into v_conversation_id;

  get diagnostics v_conv_rows = row_count;
  if v_conv_rows = 0 then
    raise exception 'Linked active conversation not found to close';
  end if;

  return jsonb_build_object(
    'invitation_id', p_invitation_id,
    'conversation_id', v_conversation_id
  );
end;
$$;


revoke execute on function public.accept_fixed_schedule_invitation(uuid) from public;
revoke execute on function public.accept_fixed_schedule_invitation(uuid) from anon;
grant execute on function public.accept_fixed_schedule_invitation(uuid) to authenticated;

revoke execute on function public.decline_fixed_schedule_invitation(uuid) from public;
revoke execute on function public.decline_fixed_schedule_invitation(uuid) from anon;
grant execute on function public.decline_fixed_schedule_invitation(uuid) to authenticated;

revoke execute on function public.cancel_fixed_schedule_invitation(uuid) from public;
revoke execute on function public.cancel_fixed_schedule_invitation(uuid) from anon;
grant execute on function public.cancel_fixed_schedule_invitation(uuid) to authenticated;
