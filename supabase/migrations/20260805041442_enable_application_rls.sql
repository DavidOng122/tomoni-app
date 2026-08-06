-- Enable RLS on all 4 tables
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.fixed_schedules enable row level security;
alter table public.onboarding_requests enable row level security;

-- Create SELECT-own policies
create policy users_select_own on public.users
for select
to authenticated
using (id = (select auth.uid()));

create policy profiles_select_own on public.profiles
for select
to authenticated
using (user_id = (select auth.uid()));

create policy fixed_schedules_select_own on public.fixed_schedules
for select
to authenticated
using (user_id = (select auth.uid()));

-- Revoke all from public
revoke all on table public.users from public;
revoke all on table public.profiles from public;
revoke all on table public.fixed_schedules from public;
revoke all on table public.onboarding_requests from public;

-- Revoke all from anon
revoke all on table public.users from anon;
revoke all on table public.profiles from anon;
revoke all on table public.fixed_schedules from anon;
revoke all on table public.onboarding_requests from anon;

-- Configure authenticated grants
revoke all on table public.users from authenticated;
grant select on table public.users to authenticated;

revoke all on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;

revoke all on table public.fixed_schedules from authenticated;
grant select on table public.fixed_schedules to authenticated;

revoke all on table public.onboarding_requests from authenticated;

-- Configure service_role grants explicitly
revoke all on table public.users from service_role;
grant select, insert, update, delete on table public.users to service_role;

revoke all on table public.profiles from service_role;
grant select, insert, update, delete on table public.profiles to service_role;

revoke all on table public.fixed_schedules from service_role;
grant select, insert, update, delete on table public.fixed_schedules to service_role;

revoke all on table public.onboarding_requests from service_role;
grant select, insert, update, delete on table public.onboarding_requests to service_role;
