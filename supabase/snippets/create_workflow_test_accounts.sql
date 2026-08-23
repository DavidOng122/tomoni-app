-- Three test accounts for exercising onboarding through companion invites.
-- All accounts use the shared password: TomoniDemo!2026
-- The auth trigger creates public.users with onboarding_status = 'pending'.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '40000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated',
    'onboarding.test1@tomoni.local',
    extensions.crypt('TomoniDemo!2026', extensions.gen_salt('bf')),
    now(), '', '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"test_account":true,"test_label":"Workflow tester 1","email_verified":true,"phone_verified":false}',
    now(), now(), false, false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '40000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated',
    'onboarding.test2@tomoni.local',
    extensions.crypt('TomoniDemo!2026', extensions.gen_salt('bf')),
    now(), '', '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"test_account":true,"test_label":"Workflow tester 2","email_verified":true,"phone_verified":false}',
    now(), now(), false, false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '40000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated',
    'onboarding.test3@tomoni.local',
    extensions.crypt('TomoniDemo!2026', extensions.gen_salt('bf')),
    now(), '', '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"test_account":true,"test_label":"Workflow tester 3","email_verified":true,"phone_verified":false}',
    now(), now(), false, false
  )
returning id, email, email_confirmed_at;
