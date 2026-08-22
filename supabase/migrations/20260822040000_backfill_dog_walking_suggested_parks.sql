-- Backfill only legacy dog-walking invitation pairs that predate park
-- suggestions. Existing suggestions are never replaced, and a missing
-- qualifying park remains NULL.

with dog_walking_recommendations as (
  select
    pair.invitation_plan_pair_id,
    recommendation.public_place_id
  from public.invitation_plan_pairs pair
  join public.fixed_plans sender_plan
    on sender_plan.fixed_plan_id = pair.sender_fixed_plan_id
    and sender_plan.activity_type = 'dog_walking'
  join public.fixed_plans receiver_plan
    on receiver_plan.fixed_plan_id = pair.receiver_fixed_plan_id
    and receiver_plan.activity_type = 'dog_walking'
  cross join lateral public.recommend_walking_public_place(
    sender_plan.latitude,
    sender_plan.longitude,
    receiver_plan.latitude,
    receiver_plan.longitude
  ) recommendation
  where pair.suggested_public_place_id is null
)
update public.invitation_plan_pairs pair
set suggested_public_place_id = recommendation.public_place_id
from dog_walking_recommendations recommendation
where pair.invitation_plan_pair_id = recommendation.invitation_plan_pair_id
  and pair.suggested_public_place_id is null;
