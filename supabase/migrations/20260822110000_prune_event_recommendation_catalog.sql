-- Keep the local Event catalog focused on the approved outing categories.
-- User-created events and non-Event public-place categories are intentionally untouched.

delete from public.events
where event_type = 'official'
  and not (
    recommendation_tags
    && array['art_exhibition', 'film', 'music_performance']::text[]
  );

-- Retain an otherwise ordinary venue only when an approved official event still
-- references it. These retained rows are venue infrastructure and never enter
-- the facility recommendation query.
delete from public.public_places as place
where place.category = 'community_facility'
  and not exists (
    select 1
    from public.events as event
    where event.venue_public_place_id = place.public_place_id
      and event.event_type = 'official'
      and event.recommendation_tags
        && array['art_exhibition', 'film', 'music_performance']::text[]
  )
  and not exists (
    select 1
    from public.invitation_plan_pairs as pair
    where pair.suggested_public_place_id = place.public_place_id
  );

delete from public.public_places as place
where place.category = 'cultural_facility'
  and coalesce(place.attributes #>> '{cultural_facility,facility_type}', '')
    not in ('exhibition_space', 'museum', 'aquarium', 'zoo', 'cinema');
