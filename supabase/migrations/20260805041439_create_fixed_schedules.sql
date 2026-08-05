

create table public.fixed_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  client_id uuid not null,
  activity_type text not null,
  days_of_week text[] not null,
  time_slot text,
  location_label text not null,
  location_point extensions.geography(Point, 4326),
  area_name text,
  location_status text not null default 'unverified',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  unique(user_id, client_id),

  constraint fixed_schedules_activity_type_check check (
    activity_type in ('walking', 'running', 'dog_walking', 'study_reading', 'sports', 'other')
  ),
  constraint fixed_schedules_days_of_week_not_empty_check check (
    cardinality(days_of_week) > 0
  ),
  constraint fixed_schedules_days_of_week_valid_check check (
    days_of_week <@ array['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']::text[]
  ),
  constraint fixed_schedules_days_of_week_unique_check check (
    extensions.is_array_unique(days_of_week)
  ),
  constraint fixed_schedules_time_slot_check check (
    time_slot in ('morning', 'daytime', 'evening', 'night')
  ),
  constraint fixed_schedules_location_label_check check (
    btrim(location_label) <> ''
  ),
  constraint fixed_schedules_location_status_check check (
    location_status in ('unverified', 'normalized')
  ),
  constraint fixed_schedules_location_point_unverified_check check (
    location_status != 'unverified' or location_point is null
  ),
  constraint fixed_schedules_location_point_normalized_check check (
    location_status != 'normalized' or location_point is not null
  ),
  constraint fixed_schedules_status_check check (
    status in ('draft', 'active', 'paused', 'deleted')
  ),
  constraint fixed_schedules_deleted_at_not_null_check check (
    status != 'deleted' or deleted_at is not null
  ),
  constraint fixed_schedules_deleted_at_null_check check (
    status = 'deleted' or deleted_at is null
  )
);

-- Indexes
create index idx_fixed_schedules_user_status on public.fixed_schedules(user_id, status);
create index idx_fixed_schedules_active_user on public.fixed_schedules(user_id) where deleted_at is null;
create index idx_fixed_schedules_location on public.fixed_schedules using gist(location_point) where location_point is not null;
