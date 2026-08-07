-- 1. `users` Table Modifications
-- Drop old check constraints and columns
alter table public.users drop constraint if exists users_onboarding_status_check;
alter table public.users drop constraint if exists users_onboarding_completed_at_check;
alter table public.users drop column if exists onboarding_completed_at;

-- Update existing data
update public.users set onboarding_status = 'pending' where onboarding_status in ('not_started', 'in_progress');

-- Add new constraints and defaults
alter table public.users alter column onboarding_status set default 'pending';
alter table public.users add constraint users_onboarding_status_check check (onboarding_status in ('pending', 'completed'));
alter table public.users alter column account_status set default 'active';


-- 2. `profiles` Table Modifications
-- Drop existing constraints
alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles drop constraint if exists profiles_age_range_check;
alter table public.profiles drop constraint if exists profiles_pkey cascade; -- Drops PK on user_id

-- Add new columns and constraints
alter table public.profiles 
  add column profile_id uuid primary key default gen_random_uuid(),
  add column tags text[] not null default '{}',
  add column bio text,
  add column profile_status text not null default 'active';

alter table public.profiles add constraint profiles_user_id_key unique (user_id);
-- Restore user_id FK just in case the pkey drop removed it
alter table public.profiles drop constraint if exists profiles_user_id_fkey;
alter table public.profiles add constraint profiles_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;

-- Update existing data
update public.profiles set age_range = replace(age_range, '_', '-');
update public.profiles set tags = '{}' where tags is null;
update public.profiles set avatar_url = '' where avatar_url is null;
alter table public.profiles alter column avatar_url set not null;

-- Add check constraints
alter table public.profiles add constraint profiles_gender_check check (gender in ('male', 'female', 'other', 'prefer_not_to_say'));
alter table public.profiles add constraint profiles_age_range_check check (age_range in ('18-24', '25-34', '35-44', '45-54', '55+'));
alter table public.profiles add constraint profiles_profile_status_check check (profile_status in ('active', 'hidden', 'deleted'));
alter table public.profiles add constraint profiles_tags_check check (cardinality(tags) <= 5);


-- 3. `fixed_schedules` -> `fixed_plans` Migration
-- Rename table and core components
alter table public.fixed_schedules rename to fixed_plans;
alter index if exists idx_fixed_schedules_user_status rename to idx_fixed_plans_user_status;
-- Drop old indexes
drop index if exists idx_fixed_schedules_active_user;
drop index if exists idx_fixed_schedules_location;

-- Rename ID column
alter table public.fixed_plans rename column id to fixed_plan_id;
alter table public.fixed_plans rename column status to plan_status;

-- Drop constraints related to old columns
alter table public.fixed_plans drop constraint if exists fixed_schedules_time_slot_check;
alter table public.fixed_plans drop constraint if exists fixed_schedules_location_label_check;
alter table public.fixed_plans drop constraint if exists fixed_schedules_location_status_check;
alter table public.fixed_plans drop constraint if exists fixed_schedules_location_point_unverified_check;
alter table public.fixed_plans drop constraint if exists fixed_schedules_location_point_normalized_check;
alter table public.fixed_plans drop constraint if exists fixed_schedules_status_check;
alter table public.fixed_plans drop constraint if exists fixed_schedules_deleted_at_not_null_check;
alter table public.fixed_plans drop constraint if exists fixed_schedules_deleted_at_null_check;
alter table public.fixed_plans drop constraint if exists fixed_schedules_activity_type_check;
alter table public.fixed_plans drop constraint if exists fixed_schedules_days_of_week_valid_check;
alter table public.fixed_plans drop constraint if exists fixed_schedules_days_of_week_not_empty_check;
alter table public.fixed_plans drop constraint if exists fixed_schedules_days_of_week_unique_check;
alter table public.fixed_plans drop constraint if exists fixed_schedules_user_id_client_id_key;

-- We drop the legacy columns
alter table public.fixed_plans 
  drop column client_id,
  drop column time_slot,
  drop column location_label,
  drop column location_point,
  drop column area_name,
  drop column location_status,
  drop column deleted_at;

-- Add new columns
-- Delete existing rows to accommodate adding not-null columns safely (as agreed per MVP migration)
delete from public.fixed_plans;

alter table public.fixed_plans
  add column custom_activity_name text,
  add column start_time time not null,
  add column place_id text,
  add column place_name text not null,
  add column latitude double precision not null,
  add column longitude double precision not null;

-- Add constraints back
alter table public.fixed_plans alter column plan_status set default 'active';

alter table public.fixed_plans add constraint fixed_plans_activity_type_check check (
  activity_type in ('walking', 'dog_walking', 'event', 'study_reading', 'sports', 'other')
);
alter table public.fixed_plans add constraint fixed_plans_days_of_week_valid_check check (
  days_of_week <@ array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']::text[]
);
alter table public.fixed_plans add constraint fixed_plans_days_of_week_not_empty_check check (
  cardinality(days_of_week) > 0
);
alter table public.fixed_plans add constraint fixed_plans_plan_status_check check (
  plan_status in ('active', 'paused', 'deleted')
);
alter table public.fixed_plans add constraint fixed_plans_custom_activity_check check (
  (activity_type = 'other' and custom_activity_name is not null) or
  (activity_type != 'other' and custom_activity_name is null)
);


-- 4. Drop `onboarding_requests`
drop table if exists public.onboarding_requests;


-- 5. Create `events`
create table public.events (
  event_id uuid primary key default gen_random_uuid(),
  event_type text not null,
  created_by_user_id uuid references public.users(id) on delete set null,
  source_name text,
  title text not null,
  description text,
  poster_url text,
  start_at timestamptz not null,
  end_at timestamptz,
  place_id text,
  place_name text not null,
  address text,
  latitude double precision,
  longitude double precision,
  registration_required boolean not null default false,
  registration_status text,
  registration_deadline timestamptz,
  registration_url text,
  approval_required boolean not null default false,
  looking_for_participants boolean not null default true,
  capacity integer,
  event_status text not null,
  status_message text,
  official_url text,
  source_updated_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint events_event_type_check check (event_type in ('official', 'user_created')),
  constraint events_registration_status_check check (registration_status in ('not_required', 'not_started', 'open', 'closed', 'full', 'unknown')),
  constraint events_event_status_check check (event_status in ('scheduled', 'cancelled', 'postponed', 'rescheduled', 'ended', 'unknown'))
);


-- 6. Create `event_participations`
create table public.event_participations (
  participation_id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(event_id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  participation_date date,
  arrival_time time,
  participation_status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_participations_status_check check (participation_status in ('requested', 'going', 'rejected', 'cancelled', 'attended')),
  unique(event_id, user_id)
);


-- 7. Create `invitations`
create table public.invitations (
  invitation_id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references public.users(id) on delete cascade,
  receiver_user_id uuid not null references public.users(id) on delete cascade,
  invitation_type text not null,
  fixed_plan_id uuid references public.fixed_plans(fixed_plan_id) on delete cascade,
  event_id uuid references public.events(event_id) on delete cascade,
  message text,
  invitation_status text not null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  expires_at timestamptz,

  constraint invitations_sender_receiver_check check (sender_user_id <> receiver_user_id),
  constraint invitations_type_check check (invitation_type in ('fixed_plan', 'event')),
  constraint invitations_status_check check (invitation_status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  constraint invitations_target_check check (
    (invitation_type = 'fixed_plan' and fixed_plan_id is not null and event_id is null) or
    (invitation_type = 'event' and event_id is not null and fixed_plan_id is null)
  )
);


-- 8. Create `connections`
create table public.connections (
  connection_id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.users(id) on delete cascade,
  user_b_id uuid not null references public.users(id) on delete cascade,
  source_invitation_id uuid references public.invitations(invitation_id) on delete set null,
  connection_status text not null,
  connected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint connections_user_order_check check (user_a_id < user_b_id),
  constraint connections_status_check check (connection_status in ('active', 'removed')),
  unique(user_a_id, user_b_id)
);


-- 9. Create `conversations`
create table public.conversations (
  conversation_id uuid primary key default gen_random_uuid(),
  related_invitation_id uuid references public.invitations(invitation_id) on delete set null,
  fixed_plan_id uuid references public.fixed_plans(fixed_plan_id) on delete set null,
  event_id uuid references public.events(event_id) on delete set null,
  conversation_status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,

  constraint conversations_status_check check (conversation_status in ('active', 'closed'))
);


-- 10. Create `conversation_members`
create table public.conversation_members (
  conversation_id uuid not null references public.conversations(conversation_id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,

  primary key (conversation_id, user_id)
);


-- 11. Create `messages`
create table public.messages (
  message_id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(conversation_id) on delete cascade,
  sender_user_id uuid not null references public.users(id) on delete cascade,
  message_type text not null,
  content text,
  created_at timestamptz not null default now(),

  constraint messages_type_check check (message_type in ('text', 'system')),
  constraint messages_content_check check (
    (message_type = 'text' and content is not null) or
    (message_type != 'text')
  )
);


-- 12. Indexes
create index if not exists idx_fixed_plans_activity_status on public.fixed_plans(activity_type, plan_status);

create index if not exists idx_events_type_status_start on public.events(event_type, event_status, start_at);

create index if not exists idx_event_participations_event_status on public.event_participations(event_id, participation_status);
create index if not exists idx_event_participations_user_status on public.event_participations(user_id, participation_status);

create index if not exists idx_invitations_receiver_status on public.invitations(receiver_user_id, invitation_status);
create index if not exists idx_invitations_sender_status on public.invitations(sender_user_id, invitation_status);

create index if not exists idx_connections_usera_status on public.connections(user_a_id, connection_status);
create index if not exists idx_connections_userb_status on public.connections(user_b_id, connection_status);

create index if not exists idx_conversation_members_user_conversation on public.conversation_members(user_id, conversation_id);

create index if not exists idx_messages_conversation_created on public.messages(conversation_id, created_at);


-- 13. RLS Policies
-- fixed_plans RLS renaming/re-applying
alter table public.fixed_plans enable row level security;
drop policy if exists fixed_schedules_select_own on public.fixed_plans;
create policy fixed_plans_select_own on public.fixed_plans for select to authenticated using (user_id = auth.uid());
create policy fixed_plans_insert_own on public.fixed_plans for insert to authenticated with check (user_id = auth.uid());
create policy fixed_plans_update_own on public.fixed_plans for update to authenticated using (user_id = auth.uid());
create policy fixed_plans_delete_own on public.fixed_plans for delete to authenticated using (user_id = auth.uid());
revoke all on table public.fixed_plans from public, anon;
grant select, insert, update, delete on table public.fixed_plans to authenticated, service_role;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_active on public.profiles for select to authenticated using (profile_status = 'active' or user_id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated using (user_id = auth.uid());
create policy profiles_insert_own on public.profiles for insert to authenticated with check (user_id = auth.uid());

-- events
alter table public.events enable row level security;
create policy events_select_scheduled on public.events for select to authenticated using (event_status = 'scheduled' or created_by_user_id = auth.uid());
create policy events_manage_own on public.events for all to authenticated using (created_by_user_id = auth.uid());
revoke all on table public.events from public, anon;
grant select, insert, update, delete on table public.events to authenticated, service_role;

-- event_participations
alter table public.event_participations enable row level security;
create policy event_participations_manage_own on public.event_participations for all to authenticated using (user_id = auth.uid());
create policy event_participations_creator_read on public.event_participations for select to authenticated using (
  exists (select 1 from public.events where events.event_id = event_participations.event_id and events.created_by_user_id = auth.uid())
);
revoke all on table public.event_participations from public, anon;
grant select, insert, update, delete on table public.event_participations to authenticated, service_role;

-- invitations
alter table public.invitations enable row level security;
create policy invitations_select_involved on public.invitations for select to authenticated using (sender_user_id = auth.uid() or receiver_user_id = auth.uid());
create policy invitations_insert_sender on public.invitations for insert to authenticated with check (sender_user_id = auth.uid());
create policy invitations_update_involved on public.invitations for update to authenticated using (sender_user_id = auth.uid() or receiver_user_id = auth.uid());
revoke all on table public.invitations from public, anon;
grant select, insert, update, delete on table public.invitations to authenticated, service_role;

-- connections
alter table public.connections enable row level security;
create policy connections_select_involved on public.connections for select to authenticated using (user_a_id = auth.uid() or user_b_id = auth.uid());
revoke all on table public.connections from public, anon;
grant select on table public.connections to authenticated;
grant select, insert, update, delete on table public.connections to service_role;

-- conversations
alter table public.conversations enable row level security;
create policy conversations_select_member on public.conversations for select to authenticated using (
  exists (select 1 from public.conversation_members where conversation_members.conversation_id = conversations.conversation_id and conversation_members.user_id = auth.uid())
);
revoke all on table public.conversations from public, anon;
grant select on table public.conversations to authenticated;
grant select, insert, update, delete on table public.conversations to service_role;

-- conversation_members
alter table public.conversation_members enable row level security;
create policy conversation_members_select_member on public.conversation_members for select to authenticated using (
  exists (select 1 from public.conversation_members cm where cm.conversation_id = conversation_members.conversation_id and cm.user_id = auth.uid())
);
revoke all on table public.conversation_members from public, anon;
grant select on table public.conversation_members to authenticated;
grant select, insert, update, delete on table public.conversation_members to service_role;

-- messages
alter table public.messages enable row level security;
create policy messages_select_member on public.messages for select to authenticated using (
  exists (select 1 from public.conversation_members where conversation_members.conversation_id = messages.conversation_id and conversation_members.user_id = auth.uid())
);
create policy messages_insert_member on public.messages for insert to authenticated with check (
  sender_user_id = auth.uid() and 
  exists (select 1 from public.conversations where conversations.conversation_id = messages.conversation_id and conversations.conversation_status = 'active') and
  exists (select 1 from public.conversation_members where conversation_members.conversation_id = messages.conversation_id and conversation_members.user_id = auth.uid())
);
revoke all on table public.messages from public, anon;
grant select, insert on table public.messages to authenticated;
grant select, insert, update, delete on table public.messages to service_role;


-- 14. Trigger Function Adjustments
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, onboarding_status, account_status)
  values (new.id, 'pending', 'active');
  return new;
end;
$$;


-- 15. RPC Adjustments (complete_onboarding)
-- Drop old RPC first as we change its signature/logic heavily
drop function if exists public.complete_onboarding(uuid, jsonb, jsonb);

create or replace function public.complete_onboarding(
  p_profile jsonb,
  p_schedules jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_account_status text;
  v_onboarding_status text;
  v_completed_at timestamptz;
  v_schedule jsonb;
  v_gender text;
  v_result jsonb;
begin
  -- 1. Auth check
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = 'TM001', message = 'unauthenticated';
  end if;

  -- 2. Basic payload validation
  if p_profile is null or jsonb_typeof(p_profile) != 'object' then
    raise exception using errcode = 'TM010', message = 'invalid_profile_shape';
  end if;
  
  if p_schedules is null or jsonb_typeof(p_schedules) != 'array' or jsonb_array_length(p_schedules) = 0 then
    raise exception using errcode = 'TM020', message = 'schedules_required';
  end if;

  -- 3. Lock user
  select account_status, onboarding_status 
  into v_account_status, v_onboarding_status
  from public.users 
  where id = v_user_id for update;

  if not found then
    raise exception using errcode = 'TM003', message = 'user_not_found';
  end if;

  if v_account_status != 'active' then
    raise exception using errcode = 'TM004', message = 'account_not_active';
  end if;

  if v_onboarding_status = 'completed' then
    raise exception using errcode = 'TM005', message = 'onboarding_already_completed';
  end if;

  v_completed_at := now();

  -- 4. Update/Insert Profile
  v_gender := coalesce(p_profile->>'gender', 'prefer_not_to_say');

  insert into public.profiles (
    user_id, nickname, avatar_url, age_range, gender, tags, bio, profile_status, created_at, updated_at
  ) values (
    v_user_id, 
    trim(p_profile->>'nickname'), 
    coalesce(p_profile->>'avatar_url', ''),
    p_profile->>'age_range', 
    v_gender, 
    coalesce(
      (select array_agg(t.value::text) from jsonb_array_elements_text(p_profile->'tags') t(value)),
      '{}'::text[]
    ),
    p_profile->>'bio',
    'active',
    v_completed_at,
    v_completed_at
  )
  on conflict (user_id) do update set
    nickname = excluded.nickname,
    avatar_url = excluded.avatar_url,
    age_range = excluded.age_range,
    gender = excluded.gender,
    tags = excluded.tags,
    bio = excluded.bio,
    updated_at = v_completed_at;

  -- 5. Insert Fixed Plans
  delete from public.fixed_plans where user_id = v_user_id;

  for v_schedule in select * from jsonb_array_elements(p_schedules) loop
    insert into public.fixed_plans (
      user_id, activity_type, custom_activity_name, days_of_week, start_time,
      place_id, place_name, latitude, longitude, plan_status, created_at, updated_at
    ) values (
      v_user_id, 
      v_schedule->>'activity_type', 
      v_schedule->>'custom_activity_name',
      array(select jsonb_array_elements_text(v_schedule->'days_of_week')),
      (v_schedule->>'start_time')::time,
      v_schedule->>'place_id',
      v_schedule->>'place_name',
      (v_schedule->>'latitude')::double precision,
      (v_schedule->>'longitude')::double precision,
      'active',
      v_completed_at,
      v_completed_at
    );
  end loop;

  -- 6. Mark user completed
  update public.users set
    onboarding_status = 'completed',
    updated_at = v_completed_at
  where id = v_user_id;

  v_result := jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'onboarding_status', 'completed',
    'completed_at', v_completed_at
  );

  return v_result;
end;
$$;

revoke execute on function public.complete_onboarding(jsonb, jsonb) from public;
revoke execute on function public.complete_onboarding(jsonb, jsonb) from anon;
revoke execute on function public.complete_onboarding(jsonb, jsonb) from service_role;
grant execute on function public.complete_onboarding(jsonb, jsonb) to authenticated;
