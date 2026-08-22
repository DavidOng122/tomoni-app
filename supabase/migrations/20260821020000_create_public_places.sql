create table public.public_places (
  public_place_id uuid primary key default gen_random_uuid(),

  source_dataset_id text not null,
  source_place_id text not null,
  source_name text not null,

  name text not null,
  category text not null,
  address text,

  latitude double precision not null,
  longitude double precision not null,
  location_point extensions.geography(Point, 4326)
    generated always as (
      extensions.st_setsrid(
        extensions.st_makepoint(longitude, latitude),
        4326
      )::extensions.geography
    ) stored,

  official_url text,
  description text,

  available_days text[],
  open_time time,
  close_time time,
  hours_note text,

  attributes jsonb not null default '{}'::jsonb,

  source_updated_at timestamptz,
  last_checked_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint public_places_source_dataset_id_check check (
    source_dataset_id = btrim(source_dataset_id)
    and source_dataset_id <> ''
    and source_dataset_id ~ '^[a-z][a-z0-9_]*$'
  ),
  constraint public_places_source_place_id_check check (
    source_place_id = btrim(source_place_id)
    and source_place_id <> ''
  ),
  constraint public_places_source_name_check check (
    source_name = btrim(source_name)
    and source_name <> ''
  ),
  constraint public_places_name_check check (
    name = btrim(name)
    and name <> ''
  ),
  constraint public_places_category_check check (
    category = btrim(category)
    and category ~ '^[a-z][a-z0-9_]*$'
  ),
  constraint public_places_latitude_check check (
    latitude between -90 and 90
  ),
  constraint public_places_longitude_check check (
    longitude between -180 and 180
  ),
  constraint public_places_available_days_check check (
    available_days is null
    or (
      cardinality(available_days) > 0
      and available_days <@ array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']::text[]
    )
  ),
  constraint public_places_attributes_object_check check (
    jsonb_typeof(attributes) = 'object'
  ),
  constraint public_places_source_identity_key unique (
    source_dataset_id,
    source_place_id
  )
);

create index public_places_location_point_gist
  on public.public_places
  using gist (location_point);

alter table public.public_places enable row level security;

revoke all on table public.public_places from public, anon, authenticated;
grant select on table public.public_places to authenticated;
grant select, insert, update, delete on table public.public_places to service_role;

create policy public_places_select_authenticated
  on public.public_places
  for select
  to authenticated
  using (true);

comment on table public.public_places is
  'Normalized public facilities imported from official public datasets.';

comment on column public.public_places.source_place_id is
  'Stable identifier assigned or exposed by the upstream official source.';

comment on column public.public_places.location_point is
  'Stored PostGIS geography generated from longitude and latitude.';
