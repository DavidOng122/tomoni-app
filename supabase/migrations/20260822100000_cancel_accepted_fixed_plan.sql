-- Allow either participant to cancel an accepted fixed-plan companion schedule.
-- The invitation and conversation are retained as terminal history.

alter table public.invitations
  add column cancelled_by_user_id uuid null
    references public.users(id) on delete set null;

alter table public.invitations
  add constraint invitations_cancelled_by_status_check
  check (cancelled_by_user_id is null or invitation_status = 'cancelled');

create index idx_invitations_cancelled_by_user_id
  on public.invitations(cancelled_by_user_id)
  where cancelled_by_user_id is not null;

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
  set conversation_status = 'closed'
  where related_invitation_id = p_invitation_id
    and fixed_plan_id is not null
    and event_id is null
    and conversation_status = 'active'
  returning conversation_id into v_conversation_id;

  if v_conversation_id is null then
    raise exception 'Linked active conversation not found to close';
  end if;

  return jsonb_build_object(
    'invitation_id', p_invitation_id,
    'conversation_id', v_conversation_id,
    'previous_status', v_invitation.invitation_status,
    'cancelled_by_user_id', v_actor_id
  );
end;
$$;

revoke execute on function public.cancel_fixed_schedule_invitation(uuid) from public;
revoke execute on function public.cancel_fixed_schedule_invitation(uuid) from anon;
grant execute on function public.cancel_fixed_schedule_invitation(uuid) to authenticated;
