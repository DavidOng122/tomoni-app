create table public.invitation_plan_pairs (
  invitation_plan_pair_id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null unique
    references public.invitations(invitation_id) on delete cascade,
  sender_fixed_plan_id uuid not null
    references public.fixed_plans(fixed_plan_id) on delete restrict,
  receiver_fixed_plan_id uuid not null
    references public.fixed_plans(fixed_plan_id) on delete restrict,
  created_at timestamptz not null default now(),

  constraint invitation_plan_pairs_distinct_plans_check check (
    sender_fixed_plan_id <> receiver_fixed_plan_id
  )
);

create index invitation_plan_pairs_sender_fixed_plan_id_idx
  on public.invitation_plan_pairs(sender_fixed_plan_id);

create index invitation_plan_pairs_receiver_fixed_plan_id_idx
  on public.invitation_plan_pairs(receiver_fixed_plan_id);

alter table public.invitation_plan_pairs enable row level security;

revoke all on table public.invitation_plan_pairs from public, anon, authenticated;
grant select on table public.invitation_plan_pairs to authenticated;
grant select on table public.invitation_plan_pairs to service_role;

create policy invitation_plan_pairs_select_participant
  on public.invitation_plan_pairs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.invitations invitation
      where invitation.invitation_id = invitation_plan_pairs.invitation_id
        and auth.uid() in (invitation.sender_user_id, invitation.receiver_user_id)
    )
  );

comment on table public.invitation_plan_pairs is
  'The exact sender and receiver Fixed Plans validated for one fixed-plan invitation.';

drop function if exists public.create_fixed_schedule_invitation(uuid, uuid);

create function public.create_fixed_schedule_invitation(
  p_fixed_plan_id uuid,
  p_receiver_id uuid,
  p_receiver_fixed_plan_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid := auth.uid();
  v_existing_invitation record;
  v_existing_pair record;
  v_new_invitation_id uuid;
  v_new_conversation_id uuid;
begin
  if v_sender_id is null then
    raise exception 'Unauthenticated';
  end if;

  if v_sender_id = p_receiver_id then
    raise exception 'Cannot invite yourself';
  end if;

  if not exists (
    select 1
    from public.fixed_plans sender_plan
    join public.fixed_plans receiver_plan
      on receiver_plan.fixed_plan_id = p_receiver_fixed_plan_id
      and receiver_plan.user_id = p_receiver_id
      and receiver_plan.plan_status = 'active'
      and receiver_plan.activity_type = sender_plan.activity_type
    join public.users receiver_user
      on receiver_user.id = receiver_plan.user_id
      and receiver_user.account_status = 'active'
      and receiver_user.onboarding_status = 'completed'
    join public.profiles receiver_profile
      on receiver_profile.user_id = receiver_plan.user_id
      and receiver_profile.profile_status = 'active'
    where sender_plan.fixed_plan_id = p_fixed_plan_id
      and sender_plan.user_id = v_sender_id
      and sender_plan.plan_status = 'active'
      and sender_plan.latitude is not null
      and sender_plan.longitude is not null
      and receiver_plan.latitude is not null
      and receiver_plan.longitude is not null
      and extensions.st_distance(
        extensions.st_setsrid(
          extensions.st_makepoint(sender_plan.longitude, sender_plan.latitude),
          4326
        )::extensions.geography,
        extensions.st_setsrid(
          extensions.st_makepoint(receiver_plan.longitude, receiver_plan.latitude),
          4326
        )::extensions.geography
      ) / 1000.0 <= 3.0
      and least(
        abs(extract(epoch from (sender_plan.start_time - receiver_plan.start_time)) / 60.0),
        1440 - abs(extract(epoch from (sender_plan.start_time - receiver_plan.start_time)) / 60.0)
      ) <= 90
      and cardinality(array(
        select unnest(sender_plan.days_of_week)
        intersect
        select unnest(receiver_plan.days_of_week)
      )) > 0
      and not exists (
        select 1
        from public.connections connection
        where connection.connection_status = 'active'
          and (
            (connection.user_a_id = v_sender_id and connection.user_b_id = p_receiver_id)
            or (connection.user_b_id = v_sender_id and connection.user_a_id = p_receiver_id)
          )
      )
  ) then
    raise exception 'Receiver plan is not eligible for this fixed plan';
  end if;

  select invitation.invitation_id, invitation.fixed_plan_id, conversation.conversation_id
  into v_existing_invitation
  from public.invitations invitation
  join public.conversations conversation
    on conversation.related_invitation_id = invitation.invitation_id
  where invitation.invitation_type = 'fixed_plan'
    and invitation.invitation_status in ('pending', 'accepted')
    and (
      (invitation.sender_user_id = v_sender_id and invitation.receiver_user_id = p_receiver_id)
      or (invitation.sender_user_id = p_receiver_id and invitation.receiver_user_id = v_sender_id)
    )
  limit 1;

  if found then
    if v_existing_invitation.fixed_plan_id <> p_fixed_plan_id then
      raise exception 'An active invitation already exists for a different fixed plan';
    end if;

    insert into public.invitation_plan_pairs (
      invitation_id,
      sender_fixed_plan_id,
      receiver_fixed_plan_id
    ) values (
      v_existing_invitation.invitation_id,
      p_fixed_plan_id,
      p_receiver_fixed_plan_id
    )
    on conflict (invitation_id) do nothing;

    select sender_fixed_plan_id, receiver_fixed_plan_id
    into v_existing_pair
    from public.invitation_plan_pairs
    where invitation_id = v_existing_invitation.invitation_id;

    if v_existing_pair.sender_fixed_plan_id <> p_fixed_plan_id
      or v_existing_pair.receiver_fixed_plan_id <> p_receiver_fixed_plan_id then
      raise exception 'An active invitation already exists for a different plan pair';
    end if;

    return jsonb_build_object(
      'invitation_id', v_existing_invitation.invitation_id,
      'conversation_id', v_existing_invitation.conversation_id
    );
  end if;

  v_new_invitation_id := gen_random_uuid();
  v_new_conversation_id := gen_random_uuid();

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

  insert into public.invitation_plan_pairs (
    invitation_id,
    sender_fixed_plan_id,
    receiver_fixed_plan_id
  ) values (
    v_new_invitation_id,
    p_fixed_plan_id,
    p_receiver_fixed_plan_id
  );

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

revoke execute on function public.create_fixed_schedule_invitation(uuid, uuid, uuid) from public;
revoke execute on function public.create_fixed_schedule_invitation(uuid, uuid, uuid) from anon;
grant execute on function public.create_fixed_schedule_invitation(uuid, uuid, uuid) to authenticated;
