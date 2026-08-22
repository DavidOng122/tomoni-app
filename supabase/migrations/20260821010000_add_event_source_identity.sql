alter table public.events
  add column source_dataset_id text,
  add column source_event_id text;

alter table public.events
  add constraint events_source_identity_pair_check
  check (
    (
      source_dataset_id is null
      and source_event_id is null
    )
    or
    (
      source_dataset_id is not null
      and source_event_id is not null
      and source_dataset_id = btrim(source_dataset_id)
      and source_event_id = btrim(source_event_id)
      and source_dataset_id <> ''
      and source_event_id <> ''
    )
  ),
  add constraint events_source_identity_official_check
  check (
    source_dataset_id is null
    or event_type = 'official'
  ),
  add constraint events_source_dataset_event_id_key
  unique (source_dataset_id, source_event_id);

comment on column public.events.source_dataset_id is
  'Stable machine identifier for the upstream source dataset.';

comment on column public.events.source_event_id is
  'Stable event identifier assigned by the upstream source.';
