-- Prevent published Event hard deletion and route cancellation through a lifecycle RPC.

create or replace function public.can_view_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events event
    where event.event_id = p_event_id
      and (
        event.event_status = 'scheduled'
        or event.created_by_user_id = auth.uid()
        or exists (
          select 1
          from public.event_participations participation
          where participation.event_id = event.event_id
            and participation.user_id = auth.uid()
        )
        or exists (
          select 1
          from public.invitations invitation
          where invitation.event_id = event.event_id
            and auth.uid() in (invitation.sender_user_id, invitation.receiver_user_id)
        )
      )
  );
$$;

revoke all on function public.can_view_event(uuid) from public, anon;
grant execute on function public.can_view_event(uuid) to authenticated, service_role;

drop policy if exists events_manage_own on public.events;
drop policy if exists events_select_scheduled on public.events;

create policy events_select_visible
on public.events for select to authenticated
using (public.can_view_event(event_id));

revoke insert, update, delete on table public.events from authenticated;
grant select on table public.events to authenticated;
grant select, insert, update, delete on table public.events to service_role;

create or replace function public.cancel_user_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_id uuid := auth.uid();
  v_event public.events%rowtype;
  v_invitation record;
begin
  if v_creator_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_event
  from public.events
  where event_id = p_event_id
    and event_type = 'user_created'
    and created_by_user_id = v_creator_id
  for update;

  if not found then
    raise exception 'Event not found or not owned by caller';
  end if;

  if v_event.event_status = 'cancelled' then
    return true;
  end if;

  if v_event.event_status <> 'scheduled' then
    raise exception 'Only a scheduled Event can be cancelled';
  end if;

  update public.events
  set event_status = 'cancelled',
      looking_for_participants = false,
      updated_at = now()
  where event_id = p_event_id;

  for v_invitation in
    select invitation_id, sender_user_id, receiver_user_id
    from public.invitations
    where event_id = p_event_id
      and invitation_type = 'event'
      and invitation_status in ('pending', 'accepted')
  loop
    update public.invitations
    set invitation_status = 'cancelled',
        cancelled_by_user_id = v_creator_id,
        responded_at = now()
    where invitation_id = v_invitation.invitation_id;

    update public.conversations
    set conversation_status = 'closed', closed_at = now(), updated_at = now()
    where related_invitation_id = v_invitation.invitation_id
      and conversation_status = 'active';

    perform public.sync_connection_state(v_invitation.sender_user_id, v_invitation.receiver_user_id);
  end loop;

  update public.conversations
  set conversation_status = 'closed', closed_at = now(), updated_at = now()
  where event_id = p_event_id
    and related_invitation_id is null
    and conversation_status = 'active';

  return true;
end;
$$;

revoke all on function public.cancel_user_event(uuid) from public, anon;
grant execute on function public.cancel_user_event(uuid) to authenticated, service_role;
