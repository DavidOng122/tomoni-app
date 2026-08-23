-- Temporary demo-only workflow: let an invitation sender show the accepted state
-- after the recipient has had ten seconds to "respond" in the test application.

-- Keep the fixed-plan acceptance transition in one authority so manual and demo
-- acceptance always create the same connection and validate the same conversation.
create or replace function public.complete_fixed_schedule_invitation_acceptance(
  p_invitation_id uuid,
  p_receiver_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.invitations%rowtype;
  v_conversation_id uuid;
begin
  if p_receiver_id is null then
    raise exception 'Unauthenticated';
  end if;

  select * into v_invitation
  from public.invitations
  where invitation_id = p_invitation_id
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if v_invitation.receiver_user_id <> p_receiver_id then
    raise exception 'Invitation not found, not pending, or not yours to accept';
  end if;

  if v_invitation.invitation_status = 'accepted' then
    perform public.sync_connection_state(
      v_invitation.sender_user_id,
      v_invitation.receiver_user_id,
      p_invitation_id
    );

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

  update public.invitations
  set
    invitation_status = 'accepted',
    responded_at = now()
  where invitation_id = p_invitation_id
    and invitation_status = 'pending';

  select conversation_id into v_conversation_id
  from public.conversations
  where related_invitation_id = p_invitation_id
    and fixed_plan_id is not null
    and event_id is null
    and conversation_status = 'active';

  if not found then
    raise exception 'Linked active conversation not found for this invitation';
  end if;

  if not exists (
    select 1
    from public.conversation_members
    where conversation_id = v_conversation_id
      and user_id = p_receiver_id
      and left_at is null
  ) then
    raise exception 'Receiver is not an active member of the conversation';
  end if;

  perform public.sync_connection_state(
    v_invitation.sender_user_id,
    v_invitation.receiver_user_id,
    p_invitation_id
  );

  return jsonb_build_object(
    'invitation_id', p_invitation_id,
    'conversation_id', v_conversation_id
  );
end;
$$;

revoke all on function public.complete_fixed_schedule_invitation_acceptance(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.accept_fixed_schedule_invitation(
  p_invitation_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.complete_fixed_schedule_invitation_acceptance(p_invitation_id, auth.uid());
end;
$$;

revoke all on function public.accept_fixed_schedule_invitation(uuid) from public, anon;
grant execute on function public.accept_fixed_schedule_invitation(uuid) to authenticated, service_role;

create or replace function public.auto_accept_fixed_schedule_invitation_for_demo(
  p_invitation_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid := auth.uid();
  v_invitation public.invitations%rowtype;
begin
  if v_sender_id is null then
    raise exception 'Unauthenticated';
  end if;

  select * into v_invitation
  from public.invitations
  where invitation_id = p_invitation_id
  for update;

  if not found
    or v_invitation.sender_user_id <> v_sender_id
    or v_invitation.invitation_type <> 'fixed_plan' then
    raise exception 'Demo auto-accept is only available to the fixed-plan invitation sender';
  end if;

  if v_invitation.invitation_status = 'accepted' then
    return public.complete_fixed_schedule_invitation_acceptance(
      p_invitation_id,
      v_invitation.receiver_user_id
    );
  end if;

  if v_invitation.invitation_status <> 'pending' then
    raise exception 'Invitation is no longer pending';
  end if;

  if v_invitation.created_at > now() - interval '10 seconds' then
    raise exception 'Demo auto-accept is not ready';
  end if;

  return public.complete_fixed_schedule_invitation_acceptance(
    p_invitation_id,
    v_invitation.receiver_user_id
  );
end;
$$;

revoke all on function public.auto_accept_fixed_schedule_invitation_for_demo(uuid) from public, anon;
grant execute on function public.auto_accept_fixed_schedule_invitation_for_demo(uuid)
  to authenticated, service_role;

comment on function public.auto_accept_fixed_schedule_invitation_for_demo(uuid) is
  'Temporary test-app flow. Remove when real recipient responses are required.';
