-- Keep the source records, but narrow Fixed Plan recommendations to
-- exhibition-led, purpose-specific outing content.
update public.events
set recommendation_tags = array(
  select tag
  from unnest(recommendation_tags) as source(tag)
  where tag = any(array[
    'art_exhibition',
    'film',
    'music_performance'
  ]::text[])
)
where not recommendation_tags <@ array[
  'art_exhibition',
  'film',
  'music_performance'
]::text[];

alter table public.events
  drop constraint events_recommendation_tags_valid_check,
  add constraint events_recommendation_tags_valid_check check (
    recommendation_tags <@ array[
      'art_exhibition',
      'film',
      'music_performance'
    ]::text[]
    and array_position(recommendation_tags, null) is null
  );

comment on column public.events.recommendation_tags is
  'Deterministic Fixed Plan recommendation categories. MVP allows exhibitions, film, and music only; broad community events and markets remain stored but are not recommended.';
