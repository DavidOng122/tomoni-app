-- 1. Harden invitations RLS
-- Revoke insert/update/delete from authenticated so they must use RPCs
revoke insert, update, delete on table public.invitations from authenticated;

-- 2. Unique index for event pair uniqueness
create unique index idx_invitations_unique_event_pair on public.invitations (
  event_id,
  least(sender_user_id, receiver_user_id),
  greatest(sender_user_id, receiver_user_id)
) where invitation_type = 'event';

-- 3. Unique index for conversations related_invitation_id
create unique index idx_conversations_related_invitation_id on public.conversations (related_invitation_id) where related_invitation_id is not null;

-- 4. Update get_same_event_people to exclude ANY event invitation
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
  join public.profiles prof on c.user_id = prof.id
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
grant execute on function public.get_same_event_people(uuid) to authenticated;

-- 5. Create Event Invitation
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
  where id = p_receiver_user_id
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

  -- Relying on unique constraint for uniqueness. No select-before-insert check for duplicates to prevent race conditions.
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
grant execute on function public.create_event_invitation(uuid, uuid) to authenticated;

-- 6. Get Received Event Invitations
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
  join public.profiles p on i.sender_user_id = p.id
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
grant execute on function public.get_received_event_invitations() to authenticated;


-- 7. Accept Event Invitation
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
    -- Idempotent return
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

  insert into public.conversations (
    related_invitation_id,
    event_id,
    conversation_status
  ) values (
    p_invitation_id,
    v_invitation.event_id,
    'active'
  )
  on conflict (related_invitation_id) do nothing
  returning conversation_id into v_conversation_id;

  if v_conversation_id is null then
    -- Conversation already existed for some reason (race condition)
    select conversation_id into v_conversation_id from public.conversations where related_invitation_id = p_invitation_id;
  else
    insert into public.conversation_members (conversation_id, user_id) values (v_conversation_id, v_invitation.sender_user_id);
    insert into public.conversation_members (conversation_id, user_id) values (v_conversation_id, v_receiver_id);
  end if;

  return v_conversation_id;
end;
$$;
revoke all on function public.accept_event_invitation(uuid) from public, anon;
grant execute on function public.accept_event_invitation(uuid) to authenticated;

-- 8. Decline Event Invitation
create or replace function public.decline_event_invitation(
  p_invitation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receiver_id uuid := auth.uid();
  v_invitation public.invitations%rowtype;
begin
  if v_receiver_id is null then
    return false;
  end if;

  select * into v_invitation
  from public.invitations
  where invitation_id = p_invitation_id
  for update;

  if not found or v_invitation.receiver_user_id <> v_receiver_id then
    return false;
  end if;
  
  if v_invitation.invitation_status = 'declined' then
    return true; -- idempotent
  end if;

  if v_invitation.invitation_status <> 'pending' then
    return false;
  end if;

  update public.invitations
  set invitation_status = 'declined', responded_at = now()
  where invitation_id = p_invitation_id and invitation_status = 'pending';

  return true;
end;
$$;
revoke all on function public.decline_event_invitation(uuid) from public, anon;
grant execute on function public.decline_event_invitation(uuid) to authenticated;

-- 9. Cancel Event Invitation
create or replace function public.cancel_event_invitation(
  p_invitation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid := auth.uid();
  v_invitation public.invitations%rowtype;
begin
  if v_sender_id is null then
    return false;
  end if;

  select * into v_invitation
  from public.invitations
  where invitation_id = p_invitation_id
  for update;

  if not found or v_invitation.sender_user_id <> v_sender_id then
    return false;
  end if;
  
  if v_invitation.invitation_status = 'cancelled' then
    return true; -- idempotent
  end if;

  if v_invitation.invitation_status <> 'pending' then
    return false;
  end if;

  update public.invitations
  set invitation_status = 'cancelled', responded_at = now()
  where invitation_id = p_invitation_id and invitation_status = 'pending';

  return true;
end;
$$;
revoke all on function public.cancel_event_invitation(uuid) from public, anon;
grant execute on function public.cancel_event_invitation(uuid) to authenticated;
