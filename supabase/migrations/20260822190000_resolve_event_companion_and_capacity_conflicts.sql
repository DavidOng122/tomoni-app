-- Resolve Event companion identity, eligibility, capacity, and lifecycle conflicts.

do $$
begin
  if exists (select 1 from public.events where capacity is not null and capacity < 1) then
    raise exception 'Cannot add events_capacity_positive_check while events with capacity < 1 exist';
  end if;
end;
$$;

alter table public.events
  drop constraint if exists events_capacity_positive_check;

alter table public.events
  add constraint events_capacity_positive_check
  check (capacity is null or capacity >= 1);

drop index if exists public.idx_invitations_unique_event_pair;

do $$
begin
  if exists (
    select 1
    from public.invitations invitation
    where invitation.invitation_type = 'event'
      and invitation.event_id is not null
      and invitation.invitation_status in ('pending', 'accepted', 'declined')
    group by
      invitation.event_id,
      least(invitation.sender_user_id, invitation.receiver_user_id),
      greatest(invitation.sender_user_id, invitation.receiver_user_id)
    having count(*) > 1
  ) then
    raise exception 'Blocking duplicate Event companion pairs must be resolved before applying the canonical unique index';
  end if;
end;
$$;

create unique index idx_invitations_unique_blocking_event_pair
  on public.invitations (
    event_id,
    least(sender_user_id, receiver_user_id),
    greatest(sender_user_id, receiver_user_id)
  )
  where invitation_type = 'event'
    and event_id is not null
    and invitation_status in ('pending', 'accepted', 'declined');

create or replace function public.is_active_product_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users app_user
    join public.profiles profile on profile.user_id = app_user.id
    where app_user.id = p_user_id
      and app_user.account_status = 'active'
      and app_user.onboarding_status = 'completed'
      and profile.profile_status = 'active'
  );
$$;

revoke all on function public.is_active_product_user(uuid) from public, anon;
grant execute on function public.is_active_product_user(uuid) to authenticated, service_role;

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
  v_caller_profile public.profiles%rowtype;
  v_event public.events%rowtype;
  v_caller_datetime timestamptz;
begin
  if v_caller_id is null then
    return;
  end if;

  if not public.is_active_product_user(v_caller_id) then
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

  select * into v_caller_profile
  from public.profiles
  where public.profiles.user_id = v_caller_id
    and profile_status = 'active';

  if not found then
    return;
  end if;

  v_caller_datetime :=
    (v_caller_participation.participation_date + v_caller_participation.arrival_time)
    at time zone 'Asia/Tokyo';

  return query
  with eligible_candidates as (
    select
      candidate.user_id,
      candidate.participation_date,
      candidate.arrival_time,
      profile.nickname,
      profile.avatar_url,
      array(
        select candidate_tag.tag
        from unnest(profile.tags) with ordinality candidate_tag(tag, position)
        where candidate_tag.tag = any(v_caller_profile.tags)
        order by candidate_tag.position
      ) as shared_tags,
      abs(extract(epoch from (
        v_caller_datetime -
        ((candidate.participation_date + candidate.arrival_time) at time zone 'Asia/Tokyo')
      ))) as event_time_difference_seconds
    from public.event_participations candidate
    join public.profiles profile
      on profile.user_id = candidate.user_id
      and profile.profile_status = 'active'
    where candidate.event_id = p_event_id
      and candidate.user_id <> v_caller_id
      and candidate.participation_status = 'going'
      and candidate.participation_date is not null
      and candidate.arrival_time is not null
      and public.is_active_product_user(candidate.user_id)
      and abs(extract(epoch from (
        v_caller_datetime -
        ((candidate.participation_date + candidate.arrival_time) at time zone 'Asia/Tokyo')
      ))) <= 3600
      and not exists (
        select 1
        from public.invitations invitation
        where invitation.event_id = p_event_id
          and invitation.invitation_type = 'event'
          and invitation.invitation_status in ('pending', 'accepted', 'declined')
          and least(invitation.sender_user_id, invitation.receiver_user_id)
            = least(v_caller_id, candidate.user_id)
          and greatest(invitation.sender_user_id, invitation.receiver_user_id)
            = greatest(v_caller_id, candidate.user_id)
      )
  ),
  scored_candidates as (
    select
      eligible.*,
      exists (
        select 1
        from public.fixed_plans my_plan
        join public.fixed_plans candidate_plan
          on candidate_plan.user_id = eligible.user_id
          and candidate_plan.activity_type = my_plan.activity_type
          and candidate_plan.plan_status = 'active'
        where my_plan.user_id = v_caller_id
          and my_plan.plan_status = 'active'
          and my_plan.activity_type <> 'other'
      ) as has_same_activity,
      exists (
        select 1
        from public.fixed_plans my_plan
        join public.fixed_plans candidate_plan
          on candidate_plan.user_id = eligible.user_id
          and candidate_plan.activity_type = my_plan.activity_type
          and candidate_plan.plan_status = 'active'
        where my_plan.user_id = v_caller_id
          and my_plan.plan_status = 'active'
          and my_plan.activity_type <> 'other'
          and least(
            abs(extract(epoch from (my_plan.start_time - candidate_plan.start_time)) / 60),
            1440 - abs(extract(epoch from (my_plan.start_time - candidate_plan.start_time)) / 60)
          ) <= 30
      ) as has_same_plan_time,
      exists (
        select 1
        from public.fixed_plans my_plan
        join public.fixed_plans candidate_plan
          on candidate_plan.user_id = eligible.user_id
          and candidate_plan.activity_type = my_plan.activity_type
          and candidate_plan.plan_status = 'active'
        where my_plan.user_id = v_caller_id
          and my_plan.plan_status = 'active'
          and my_plan.activity_type <> 'other'
          and my_plan.latitude is not null
          and my_plan.longitude is not null
          and candidate_plan.latitude is not null
          and candidate_plan.longitude is not null
          and extensions.st_distance(
            extensions.st_setsrid(extensions.st_makepoint(my_plan.longitude, my_plan.latitude), 4326)::extensions.geography,
            extensions.st_setsrid(extensions.st_makepoint(candidate_plan.longitude, candidate_plan.latitude), 4326)::extensions.geography
          ) / 1000.0 <= 1.0
      ) as is_nearby,
      exists (
        select 1
        from public.fixed_plans my_plan
        join public.fixed_plans candidate_plan
          on candidate_plan.user_id = eligible.user_id
          and candidate_plan.activity_type = my_plan.activity_type
          and candidate_plan.plan_status = 'active'
        where my_plan.user_id = v_caller_id
          and my_plan.plan_status = 'active'
          and my_plan.activity_type <> 'other'
          and cardinality(array(
            select unnest(my_plan.days_of_week)
            intersect
            select unnest(candidate_plan.days_of_week)
          )) >= 2
      ) as has_shared_days
    from eligible_candidates eligible
  )
  select
    scored.user_id,
    scored.nickname,
    scored.avatar_url,
    case
      when scored.has_shared_days then '同じ曜日'
      when scored.is_nearby then '近くに住んでいる'
      when cardinality(scored.shared_tags) > 0 then scored.shared_tags[1] || 'が好き'
      when scored.has_same_plan_time then '同じ時間ごろ'
      when scored.has_same_activity then '同じ活動が好き'
      when scored.event_time_difference_seconds <= 900 then '同じ時間帯'
      else '近い時間に参加予定'
    end as compatibility_label
  from scored_candidates scored
  order by
    (
      cardinality(scored.shared_tags)
      + scored.has_same_activity::integer
      + scored.has_same_plan_time::integer
      + scored.is_nearby::integer
      + scored.has_shared_days::integer
      + (scored.event_time_difference_seconds <= 900)::integer
    ) desc,
    scored.event_time_difference_seconds asc,
    scored.user_id asc
  limit 3;
end;
$$;

revoke all on function public.get_same_event_people(uuid) from public, anon;
grant execute on function public.get_same_event_people(uuid) to authenticated, service_role;

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
  v_existing_invitation public.invitations%rowtype;
  v_invitation_id uuid;
  v_expires_at timestamptz;
begin
  if v_sender_id is null or v_sender_id = p_receiver_user_id then
    raise exception 'Invalid sender or receiver';
  end if;

  if not public.is_active_product_user(v_sender_id)
    or not public.is_active_product_user(p_receiver_user_id) then
    raise exception 'Sender or receiver is not eligible';
  end if;

  select * into v_event
  from public.events
  where event_id = p_event_id
    and event_status = 'scheduled'
    and (end_at is null or end_at > now());

  if not found then
    raise exception 'Event not valid for invitation';
  end if;

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

  v_sender_datetime := (v_sender_participation.participation_date + v_sender_participation.arrival_time) at time zone 'Asia/Tokyo';
  v_receiver_datetime := (v_receiver_participation.participation_date + v_receiver_participation.arrival_time) at time zone 'Asia/Tokyo';

  if abs(extract(epoch from (v_sender_datetime - v_receiver_datetime))) > 3600 then
    raise exception 'Time difference too large';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_event_id::text || ':' || least(v_sender_id, p_receiver_user_id)::text || ':' || greatest(v_sender_id, p_receiver_user_id)::text,
      0
    )
  );

  select invitation.* into v_existing_invitation
  from public.invitations invitation
  where invitation.event_id = p_event_id
    and invitation.invitation_type = 'event'
    and invitation.invitation_status in ('pending', 'accepted', 'declined')
    and least(invitation.sender_user_id, invitation.receiver_user_id) = least(v_sender_id, p_receiver_user_id)
    and greatest(invitation.sender_user_id, invitation.receiver_user_id) = greatest(v_sender_id, p_receiver_user_id)
  for update;

  if found then
    if v_existing_invitation.invitation_status = 'pending' then
      return v_existing_invitation.invitation_id;
    end if;
    raise exception 'Event companion pair is blocked by invitation status %', v_existing_invitation.invitation_status;
  end if;

  v_expires_at := coalesce(v_event.end_at, v_event.start_at + interval '1 day');

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
  v_conversation_id uuid;
begin
  if v_receiver_id is null then
    raise exception 'Unauthorized';
  end if;

  select * into v_invitation
  from public.invitations
  where invitation_id = p_invitation_id
    and invitation_type = 'event'
  for update;

  if not found or v_invitation.receiver_user_id <> v_receiver_id then
    raise exception 'Invitation not found or unauthorized';
  end if;

  if v_invitation.invitation_status = 'accepted' then
    select conversation_id into v_conversation_id
    from public.conversations
    where related_invitation_id = p_invitation_id;
    if v_conversation_id is null then
      raise exception 'Conversation missing for accepted invitation';
    end if;
    return v_conversation_id;
  end if;

  if v_invitation.invitation_status <> 'pending' then
    raise exception 'Invitation not pending';
  end if;

  if v_invitation.expires_at is not null and v_invitation.expires_at < now() then
    raise exception 'Invitation expired';
  end if;

  if not exists (
    select 1
    from public.events event
    where event.event_id = v_invitation.event_id
      and event.event_status = 'scheduled'
      and (event.end_at is null or event.end_at > now())
  ) then
    raise exception 'Event not valid for acceptance';
  end if;

  if not public.is_active_product_user(v_invitation.sender_user_id)
    or not public.is_active_product_user(v_receiver_id)
    or not exists (
      select 1 from public.event_participations participation
      where participation.user_id = v_invitation.sender_user_id
        and participation.event_id = v_invitation.event_id
        and participation.participation_status = 'going'
    )
    or not exists (
      select 1 from public.event_participations participation
      where participation.user_id = v_receiver_id
        and participation.event_id = v_invitation.event_id
        and participation.participation_status = 'going'
    ) then
    raise exception 'Sender or receiver is no longer eligible';
  end if;

  update public.invitations
  set invitation_status = 'accepted', responded_at = now()
  where invitation_id = p_invitation_id
    and invitation_status = 'pending';

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

    insert into public.conversation_members (conversation_id, user_id)
    values
      (v_conversation_id, v_invitation.sender_user_id),
      (v_conversation_id, v_receiver_id)
    on conflict do nothing;
  end if;

  perform public.sync_connection_state(v_invitation.sender_user_id, v_receiver_id, p_invitation_id);

  return v_conversation_id;
end;
$$;

revoke all on function public.accept_event_invitation(uuid) from public, anon;
grant execute on function public.accept_event_invitation(uuid) to authenticated, service_role;

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
    and invitation_type = 'event'
  for update;

  if not found or v_invitation.receiver_user_id <> v_receiver_id then
    return false;
  end if;

  if v_invitation.invitation_status = 'declined' then
    return true;
  end if;

  if v_invitation.invitation_status <> 'pending' then
    return false;
  end if;

  update public.invitations
  set invitation_status = 'declined', responded_at = now()
  where invitation_id = p_invitation_id;

  update public.conversations
  set conversation_status = 'closed', closed_at = now(), updated_at = now()
  where related_invitation_id = p_invitation_id
    and conversation_status = 'active';

  return true;
end;
$$;

revoke all on function public.decline_event_invitation(uuid) from public, anon;
grant execute on function public.decline_event_invitation(uuid) to authenticated, service_role;

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

  if not found or v_actor_id not in (v_invitation.sender_user_id, v_invitation.receiver_user_id) then
    return false;
  end if;

  if v_invitation.invitation_status = 'cancelled' then
    perform public.sync_connection_state(v_invitation.sender_user_id, v_invitation.receiver_user_id);
    return true;
  end if;

  if v_invitation.invitation_status not in ('pending', 'accepted') then
    return false;
  end if;

  update public.invitations
  set invitation_status = 'cancelled',
      cancelled_by_user_id = v_actor_id,
      responded_at = now()
  where invitation_id = p_invitation_id;

  update public.conversations
  set conversation_status = 'closed', closed_at = now(), updated_at = now()
  where related_invitation_id = p_invitation_id
    and conversation_status = 'active';

  perform public.sync_connection_state(v_invitation.sender_user_id, v_invitation.receiver_user_id);
  return true;
end;
$$;

revoke all on function public.cancel_event_invitation(uuid) from public, anon;
grant execute on function public.cancel_event_invitation(uuid) to authenticated, service_role;

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
  v_invitation record;
  v_group_conversation_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select created_by_user_id into v_created_by_user_id
  from public.events
  where event_id = p_event_id;

  if not found then
    raise exception 'Event not found';
  end if;

  if v_created_by_user_id = v_user_id then
    raise exception 'Event creator cannot leave their own event';
  end if;

  select participation_status into v_current_status
  from public.event_participations
  where event_id = p_event_id and user_id = v_user_id;

  if not found or v_current_status = 'cancelled' then
    return;
  end if;

  if v_current_status in ('rejected', 'attended') then
    raise exception 'Cannot cancel: participation is %', v_current_status;
  end if;

  update public.event_participations
  set participation_status = 'cancelled', updated_at = now()
  where event_id = p_event_id and user_id = v_user_id;

  for v_invitation in
    select invitation_id, sender_user_id, receiver_user_id
    from public.invitations
    where event_id = p_event_id
      and invitation_type = 'event'
      and invitation_status in ('pending', 'accepted')
      and v_user_id in (sender_user_id, receiver_user_id)
  loop
    update public.invitations
    set invitation_status = 'cancelled',
        cancelled_by_user_id = v_user_id,
        responded_at = now()
    where invitation_id = v_invitation.invitation_id;

    update public.conversations
    set conversation_status = 'closed', closed_at = now(), updated_at = now()
    where related_invitation_id = v_invitation.invitation_id
      and conversation_status = 'active';

    perform public.sync_connection_state(v_invitation.sender_user_id, v_invitation.receiver_user_id);
  end loop;

  select conversation_id into v_group_conversation_id
  from public.conversations
  where event_id = p_event_id
    and related_invitation_id is null
    and fixed_plan_id is null;

  if v_group_conversation_id is not null then
    update public.conversation_members
    set left_at = now()
    where conversation_id = v_group_conversation_id
      and user_id = v_user_id
      and left_at is null;
  end if;
end;
$$;

revoke all on function public.cancel_event_participation(uuid) from public, anon;
grant execute on function public.cancel_event_participation(uuid) to authenticated, service_role;
