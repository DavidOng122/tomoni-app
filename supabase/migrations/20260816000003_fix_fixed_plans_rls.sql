-- P4: Fix RLS on fixed_plans so receivers can read the plan they are invited to

create policy "fixed_plans_select_invited" on public.fixed_plans
for select
using (
  exists (
    select 1 from public.invitations
    where invitations.fixed_plan_id = fixed_plans.fixed_plan_id
      and (invitations.sender_user_id = auth.uid() or invitations.receiver_user_id = auth.uid())
  )
);
