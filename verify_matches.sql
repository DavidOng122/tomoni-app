-- verify_matches.sql

-- Clear any previous test data
do $$ 
declare 
  r record;
begin
  for r in select id from auth.users where email like 'test_%@example.com' loop
    delete from auth.users where id = r.id;
  end loop;
end $$;

-- 1. Create test users
insert into auth.users (id, email, encrypted_password, email_confirmed_at)
values 
  ('00000000-0000-0000-0000-00000000000a', 'test_a@example.com', 'pwd', now()),
  ('00000000-0000-0000-0000-00000000000b', 'test_b@example.com', 'pwd', now()),
  ('00000000-0000-0000-0000-00000000000c', 'test_c@example.com', 'pwd', now()),
  ('00000000-0000-0000-0000-00000000000d', 'test_d@example.com', 'pwd', now()),
  ('00000000-0000-0000-0000-00000000000e', 'test_e@example.com', 'pwd', now());

-- Update status
update public.users set onboarding_status = 'completed', account_status = 'active' where id in (
  '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b',
  '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d',
  '00000000-0000-0000-0000-00000000000e'
);

-- Profiles
insert into public.profiles (user_id, nickname, profile_status)
values 
  ('00000000-0000-0000-0000-00000000000a', 'User A', 'active'),
  ('00000000-0000-0000-0000-00000000000b', 'User B', 'active'),
  ('00000000-0000-0000-0000-00000000000c', 'User C', 'active'),
  ('00000000-0000-0000-0000-00000000000d', 'User D', 'active'),
  ('00000000-0000-0000-0000-00000000000e', 'User E', 'active');

-- Fixed Plans
insert into public.fixed_plans (fixed_plan_id, user_id, activity_type, days_of_week, start_time, latitude, longitude, place_name, plan_status)
values 
  -- User A: walking, Wed, 18:00
  ('11111111-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'walking', array['wed'], '18:00', 35.658, 139.702, 'Loc A', 'active'),
  -- User A: 2nd plan for deduplication test
  ('11111111-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'running', array['mon'], '07:00', 35.658, 139.702, 'Loc A', 'active'),
  
  -- User B: walking, Wed, 18:30 (Valid Match for A) -> Time diff 30m, Dist small
  ('22222222-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'walking', array['wed'], '18:30', 35.660, 139.704, 'Loc B', 'active'),
  -- User B: 2nd plan (also matches A's 2nd plan) for deduplication
  ('22222222-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'running', array['mon'], '07:15', 35.660, 139.704, 'Loc B', 'active'),

  -- User C: sports, Wed, 18:00 (Activity mismatch)
  ('33333333-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'sports', array['wed'], '18:00', 35.658, 139.702, 'Loc C', 'active'),

  -- User D: walking, Thu, 18:00 (Weekday mismatch)
  ('44444444-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', 'walking', array['thu'], '18:00', 35.658, 139.702, 'Loc D', 'active'),

  -- User E: walking, Wed, 19:10 (Time diff 70m -> EXCLUDED)
  ('55555555-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', 'walking', array['wed'], '19:10', 35.658, 139.702, 'Loc E', 'active');


-- Test Cases Execution
\echo '--- TEST A: UNAUTHENTICATED ---'
-- Clear auth context
set local role postgres;
set local request.jwt.claims = '';
select get_discover_recommendations() as result;

\echo '--- TEST B: OWN PLAN AUTHENTICATED ---'
-- Authenticate as User A
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a"}';
select get_discover_recommendations() as result;

\echo '--- TEST C: FOREIGN PLAN ID ---'
select get_discover_recommendations('22222222-0000-0000-0000-000000000001') as result;

\echo '--- TEST D: DIRECT RLS ---'
select user_id, activity_type from public.fixed_plans where user_id = '00000000-0000-0000-0000-00000000000b';

\echo '--- TEST: MIDNIGHT WRAPAROUND ---'
set local role postgres;
insert into public.fixed_plans (fixed_plan_id, user_id, activity_type, days_of_week, start_time, latitude, longitude, place_name, plan_status)
values 
  ('11111111-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', 'dining', array['fri'], '23:40', 35.6, 139.7, 'A', 'active'),
  ('22222222-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000b', 'dining', array['fri'], '00:10', 35.6, 139.7, 'B', 'active');

set local role authenticated;
select get_discover_recommendations('11111111-0000-0000-0000-000000000003') as result;

\echo '--- TEST: CONNECTIONS EXCLUSION ---'
set local role postgres;
insert into public.connections (user_a_id, user_b_id, connection_status) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'active');
set local role authenticated;
select get_discover_recommendations('11111111-0000-0000-0000-000000000001') as result;

