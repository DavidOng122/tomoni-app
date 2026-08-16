-- Fix create_fixed_schedule_invitation: correct PostGIS schema reference (extensions not public.extensions)
create or replace function public.create_fixed_schedule_invitation(
  p_fixed_plan_id uuid,
  p_receiver_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid := auth.uid();
  v_existing_invitation record;
  v_new_invitation_id uuid;
  v_new_conversation_id uuid;
begin
  if v_sender_id is null then
    raise exception 'Unauthenticated';
  end if;

  if v_sender_id = p_receiver_id then
    raise exception 'Cannot invite yourself';
  end if;

  -- 1. Validate sender's fixed plan
  if not exists (
    select 1 from public.fixed_plans
    where fixed_plan_id = p_fixed_plan_id
      and user_id = v_sender_id
      and plan_status = 'active'
  ) then
    raise exception 'Invalid or inactive fixed plan';
  end if;

  -- 2. Handle Idempotency / Existing active relationship (Reciprocal Race Prevention)
  select i.invitation_id, c.conversation_id
  into v_existing_invitation
  from public.invitations i
  join public.conversations c on c.related_invitation_id = i.invitation_id
  where i.invitation_status in ('pending', 'accepted')
    and (
      (i.sender_user_id = v_sender_id and i.receiver_user_id = p_receiver_id) or
      (i.sender_user_id = p_receiver_id and i.receiver_user_id = v_sender_id)
    )
  limit 1;

  if found then
    return jsonb_build_object(
      'invitation_id', v_existing_invitation.invitation_id,
      'conversation_id', v_existing_invitation.conversation_id
    );
  end if;

  -- 3. Validate Receiver Eligibility (Must perfectly match get_discover_recommendations rules)
  -- Uses extensions.st_distance (not public.extensions.st_distance)
  if not exists (
    select 1
    from public.fixed_plans m
    join public.fixed_plans c on m.activity_type = c.activity_type
    join public.users u on u.id = c.user_id
    join public.profiles p on p.user_id = c.user_id
    where m.fixed_plan_id = p_fixed_plan_id
      and m.user_id = v_sender_id
      and m.plan_status = 'active'
      and c.user_id = p_receiver_id
      and c.plan_status = 'active'
      and u.account_status = 'active'
      and u.onboarding_status = 'completed'
      and p.profile_status = 'active'
      and m.activity_type != 'other'
      and c.activity_type != 'other'
      and m.latitude is not null and m.longitude is not null
      and c.latitude is not null and c.longitude is not null
      -- Distance <= 3km (using correct extensions schema)
      and extensions.st_distance(
        extensions.st_setsrid(extensions.st_makepoint(m.longitude, m.latitude), 4326)::extensions.geography,
        extensions.st_setsrid(extensions.st_makepoint(c.longitude, c.latitude), 4326)::extensions.geography
      ) / 1000.0 <= 3.0
      -- Time difference <= 60m
      and least(
        abs(extract(epoch from (m.start_time - c.start_time))/60.0),
        1440 - abs(extract(epoch from (m.start_time - c.start_time))/60.0)
      ) <= 60
      -- Shared days > 0
      and cardinality(array(select unnest(m.days_of_week) intersect select unnest(c.days_of_week))) > 0
      -- Bidirectional Connection Exclusion
      and not exists (
        select 1 from public.connections conn
        where conn.connection_status = 'active'
          and (
            (conn.user_a_id = v_sender_id and conn.user_b_id = c.user_id) or
            (conn.user_b_id = v_sender_id and conn.user_a_id = c.user_id)
          )
      )
  ) then
    raise exception 'Receiver is not eligible for this fixed plan';
  end if;

  -- 4. Atomic Insert
  v_new_invitation_id := gen_random_uuid();
  v_new_conversation_id := gen_random_uuid();

  -- Insert Invitation
  insert into public.invitations (
    invitation_id,
    sender_user_id,
    receiver_user_id,
    invitation_type,
    fixed_plan_id,
    invitation_status
  ) values (
    v_new_invitation_id,
    v_sender_id,
    p_receiver_id,
    'fixed_plan',
    p_fixed_plan_id,
    'pending'
  );

  -- Insert Conversation
  insert into public.conversations (
    conversation_id,
    conversation_status,
    fixed_plan_id,
    related_invitation_id,
    event_id
  ) values (
    v_new_conversation_id,
    'active',
    p_fixed_plan_id,
    v_new_invitation_id,
    null
  );

  -- Insert Members
  insert into public.conversation_members (conversation_id, user_id)
  values 
    (v_new_conversation_id, v_sender_id),
    (v_new_conversation_id, p_receiver_id);

  return jsonb_build_object(
    'invitation_id', v_new_invitation_id,
    'conversation_id', v_new_conversation_id
  );
end;
$$;

revoke execute on function public.create_fixed_schedule_invitation(uuid, uuid) from public;
revoke execute on function public.create_fixed_schedule_invitation(uuid, uuid) from anon;
grant execute on function public.create_fixed_schedule_invitation(uuid, uuid) to authenticated;
