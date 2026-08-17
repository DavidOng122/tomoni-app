-- LOCAL DEVELOPMENT ONLY.
-- Recreates the former Figma fixture data in the local Supabase database.
-- Safe to run repeatedly: all records use deterministic UUIDs and upserts.
-- Existing users and application data are not deleted or overwritten.

begin;

-- Demo login for Tomoni:
--   email:    figma.demo@tomoni.local
--   password: TomoniDemo!2026
-- The remaining accounts exist to back realistic profiles and relationships.
with demo_users(id, email) as (
  values
    ('10000000-0000-4000-8000-000000000001'::uuid, 'figma.demo@tomoni.local'),
    ('10000000-0000-4000-8000-000000000002'::uuid, 'figma.miki@tomoni.local'),
    ('10000000-0000-4000-8000-000000000003'::uuid, 'figma.julia@tomoni.local'),
    ('10000000-0000-4000-8000-000000000004'::uuid, 'figma.megan@tomoni.local'),
    ('10000000-0000-4000-8000-000000000005'::uuid, 'figma.sora@tomoni.local'),
    ('10000000-0000-4000-8000-000000000006'::uuid, 'figma.ken@tomoni.local'),
    ('10000000-0000-4000-8000-000000000007'::uuid, 'figma.aoi@tomoni.local')
)
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
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  id,
  'authenticated',
  'authenticated',
  email,
  extensions.crypt('TomoniDemo!2026', extensions.gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  jsonb_build_object(
    'sub', id::text,
    'email', email,
    'email_verified', true,
    'phone_verified', false
  ),
  now(),
  now(),
  false,
  false
from demo_users
on conflict (id) do update set
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  confirmation_token = excluded.confirmation_token,
  recovery_token = excluded.recovery_token,
  email_change_token_new = excluded.email_change_token_new,
  email_change = excluded.email_change,
  email_change_token_current = excluded.email_change_token_current,
  phone_change = excluded.phone_change,
  phone_change_token = excluded.phone_change_token,
  reauthentication_token = excluded.reauthentication_token,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

with demo_users(id, email) as (
  values
    ('10000000-0000-4000-8000-000000000001'::uuid, 'figma.demo@tomoni.local'),
    ('10000000-0000-4000-8000-000000000002'::uuid, 'figma.miki@tomoni.local'),
    ('10000000-0000-4000-8000-000000000003'::uuid, 'figma.julia@tomoni.local'),
    ('10000000-0000-4000-8000-000000000004'::uuid, 'figma.megan@tomoni.local'),
    ('10000000-0000-4000-8000-000000000005'::uuid, 'figma.sora@tomoni.local'),
    ('10000000-0000-4000-8000-000000000006'::uuid, 'figma.ken@tomoni.local'),
    ('10000000-0000-4000-8000-000000000007'::uuid, 'figma.aoi@tomoni.local')
)
insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  id,
  id::text,
  id,
  jsonb_build_object(
    'sub', id::text,
    'email', email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now()
from demo_users
on conflict (provider_id, provider) do update set
  identity_data = excluded.identity_data,
  updated_at = now();

insert into public.users (id, account_status, onboarding_status)
values
  ('10000000-0000-4000-8000-000000000001', 'active', 'completed'),
  ('10000000-0000-4000-8000-000000000002', 'active', 'completed'),
  ('10000000-0000-4000-8000-000000000003', 'active', 'completed'),
  ('10000000-0000-4000-8000-000000000004', 'active', 'completed'),
  ('10000000-0000-4000-8000-000000000005', 'active', 'completed'),
  ('10000000-0000-4000-8000-000000000006', 'active', 'completed'),
  ('10000000-0000-4000-8000-000000000007', 'active', 'completed')
on conflict (id) do update set
  account_status = excluded.account_status,
  onboarding_status = excluded.onboarding_status,
  updated_at = now();

insert into public.profiles (
  user_id,
  nickname,
  gender,
  age_range,
  avatar_url,
  tags,
  bio,
  profile_status
)
values
  ('10000000-0000-4000-8000-000000000001', 'Mika', 'prefer_not_to_say', '25-34', '/images/mypage/profile-miki.png', array['散歩', '地域交流'], '近所をゆっくり散歩するのが好きです。', 'active'),
  ('10000000-0000-4000-8000-000000000002', 'Miki', 'female', '25-34', '/images/mypage/connection-miki.png', array['散歩', 'カフェ'], '朝の散歩仲間を探しています。', 'active'),
  ('10000000-0000-4000-8000-000000000003', 'Julia', 'female', '25-34', '/images/mypage/connection-julia.png', array['散歩'], '公園を歩くことが日課です。', 'active'),
  ('10000000-0000-4000-8000-000000000004', 'Megan', 'female', '25-34', '/images/mypage/connection-megan.png', array['散歩', '写真'], '景色を楽しみながら歩きたいです。', 'active'),
  ('10000000-0000-4000-8000-000000000005', 'Sora', 'male', '25-34', '/images/discover/sora.png', array['散歩', 'スポーツ'], '気軽に声をかけてください。', 'active'),
  ('10000000-0000-4000-8000-000000000006', 'Ken', 'male', '25-34', '/images/discover/ken.png', array['散歩'], '地域のイベントにも参加しています。', 'active'),
  ('10000000-0000-4000-8000-000000000007', 'Aoi', 'female', '25-34', '/images/connections/emily.png', array['散歩', '地域交流'], '近所の人と一緒に歩くのが好きです。', 'active')
on conflict (user_id) do update set
  nickname = excluded.nickname,
  gender = excluded.gender,
  age_range = excluded.age_range,
  avatar_url = excluded.avatar_url,
  tags = excluded.tags,
  bio = excluded.bio,
  profile_status = excluded.profile_status,
  updated_at = now();

insert into public.fixed_plans (
  fixed_plan_id,
  user_id,
  activity_type,
  days_of_week,
  plan_status,
  custom_activity_name,
  start_time,
  place_id,
  place_name,
  latitude,
  longitude
)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'walking', array['tue', 'thu'], 'active', null, '09:00', 'figma-gyosen-park', '行船公園', 35.674600, 139.859100),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'study_reading', array['sat'], 'active', null, '14:00', 'figma-edogawa-library', '江戸川区立中央図書館', 35.706100, 139.868800),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'walking', array['tue'], 'active', null, '09:00', 'figma-funabori-station', '船堀駅前広場', 35.683700, 139.864300),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003', 'walking', array['tue'], 'active', null, '09:00', 'figma-nishikasai-station', '西葛西駅', 35.665900, 139.859300),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000004', 'walking', array['tue'], 'active', null, '09:15', 'figma-kasai-station', '葛西駅', 35.663500, 139.872600),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000005', 'walking', array['tue'], 'active', null, '09:30', 'figma-ukita-park', '宇喜田公園', 35.675600, 139.872500),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000006', 'walking', array['tue'], 'active', null, '09:00', 'figma-shinsakongawa', '新川千本桜', 35.686500, 139.867000),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000007', 'walking', array['tue', 'thu'], 'active', null, '09:00', 'figma-gyosen-park-aoi', '行船公園', 35.674800, 139.859300)
on conflict (fixed_plan_id) do update set
  user_id = excluded.user_id,
  activity_type = excluded.activity_type,
  days_of_week = excluded.days_of_week,
  plan_status = excluded.plan_status,
  custom_activity_name = excluded.custom_activity_name,
  start_time = excluded.start_time,
  place_id = excluded.place_id,
  place_name = excluded.place_name,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  updated_at = now();

insert into public.events (
  event_id,
  event_type,
  created_by_user_id,
  source_name,
  title,
  description,
  poster_url,
  start_at,
  end_at,
  place_name,
  address,
  latitude,
  longitude,
  registration_required,
  registration_status,
  registration_deadline,
  registration_url,
  approval_required,
  looking_for_participants,
  capacity,
  event_status,
  official_url
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    'user_created',
    '10000000-0000-4000-8000-000000000002',
    'Miki',
    '篠崎公園 青空ストレッチ会',
    '篠崎公園の緑の中で、身体をゆっくりほぐす地域のストレッチ会です。運動が久しぶりの方や、ひとりでの参加も歓迎します。',
    '/images/discover/shinozaki-park.jpg',
    date_trunc('day', now()) + interval '1 day 8 hours',
    date_trunc('day', now()) + interval '1 day 10 hours',
    '篠崎公園',
    '東京都江戸川区上篠崎1丁目25-1',
    35.706900,
    139.903600,
    false,
    'not_required',
    null,
    null,
    false,
    true,
    20,
    'scheduled',
    null
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    'official',
    null,
    '江戸川区公式',
    '防災まち歩きワークショップ',
    '地域を歩きながら、防災の視点でまちを見直すワークショップです。避難場所や身近な危険箇所を確認し、災害時に役立つ知識を学びます。',
    '/images/events/detail/disaster-workshop.png',
    date_trunc('day', now()) + interval '7 days 10 hours',
    date_trunc('day', now()) + interval '7 days 12 hours',
    '船堀駅前広場',
    '東京都江戸川区船堀3丁目6',
    35.683700,
    139.864300,
    true,
    'open',
    date_trunc('day', now()) + interval '6 days 18 hours',
    'https://example.com/register/disaster-workshop',
    false,
    true,
    30,
    'scheduled',
    'https://example.com/events/disaster-workshop'
  )
on conflict (event_id) do update set
  event_type = excluded.event_type,
  created_by_user_id = excluded.created_by_user_id,
  source_name = excluded.source_name,
  title = excluded.title,
  description = excluded.description,
  poster_url = excluded.poster_url,
  start_at = excluded.start_at,
  end_at = excluded.end_at,
  place_name = excluded.place_name,
  address = excluded.address,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  registration_required = excluded.registration_required,
  registration_status = excluded.registration_status,
  registration_deadline = excluded.registration_deadline,
  registration_url = excluded.registration_url,
  approval_required = excluded.approval_required,
  looking_for_participants = excluded.looking_for_participants,
  capacity = excluded.capacity,
  event_status = excluded.event_status,
  official_url = excluded.official_url,
  updated_at = now();

insert into public.event_participations (
  participation_id,
  event_id,
  user_id,
  participation_date,
  arrival_time,
  planned_duration_minutes,
  participation_status
)
values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', (current_date + 1), '18:15', 60, 'going'),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', (current_date + 1), '18:30', 60, 'going'),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', (current_date + 1), '18:45', 60, 'going'),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', (current_date + 7), '19:00', 60, 'going'),
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', (current_date + 7), '19:15', 60, 'going'),
  ('40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', (current_date + 7), '19:30', 60, 'going'),
  ('40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000005', (current_date + 7), '19:10', 60, 'going'),
  ('40000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000006', (current_date + 7), '19:25', 60, 'going'),
  ('40000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000007', (current_date + 7), '19:05', 60, 'going'),
  ('40000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', (current_date + 1), '17:05', 60, 'cancelled'),
  ('40000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000006', (current_date + 1), '17:10', 60, 'cancelled'),
  ('40000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000007', (current_date + 1), '17:15', 60, 'cancelled')
on conflict (event_id, user_id) do update set
  participation_date = excluded.participation_date,
  arrival_time = excluded.arrival_time,
  planned_duration_minutes = excluded.planned_duration_minutes,
  participation_status = excluded.participation_status,
  updated_at = now();

-- One pending invitation powers the sent-invitation detail screen.
-- Three accepted invitations create the My Page connection preview.
insert into public.invitations (
  invitation_id,
  sender_user_id,
  receiver_user_id,
  invitation_type,
  fixed_plan_id,
  event_id,
  message,
  invitation_status,
  created_at,
  responded_at
)
values
  ('50000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000006', 'fixed_plan', '20000000-0000-4000-8000-000000000001', null, '一緒に朝の散歩に行きませんか？', 'pending', now() - interval '1 hour', null),
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'fixed_plan', '20000000-0000-4000-8000-000000000001', null, '火曜日の朝、一緒に散歩しませんか？', 'accepted', now() - interval '4 days', now() - interval '3 days'),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'fixed_plan', '20000000-0000-4000-8000-000000000001', null, '行船公園で一緒に歩きませんか？', 'accepted', now() - interval '3 days', now() - interval '2 days'),
  ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'fixed_plan', '20000000-0000-4000-8000-000000000001', null, '朝の散歩をご一緒しませんか？', 'accepted', now() - interval '2 days', now() - interval '1 day')
on conflict (invitation_id) do update set
  message = excluded.message,
  invitation_status = excluded.invitation_status,
  responded_at = excluded.responded_at;

insert into public.connections (
  connection_id,
  user_a_id,
  user_b_id,
  source_invitation_id,
  connection_status,
  connected_at
)
values
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', 'active', now() - interval '3 days'),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000002', 'active', now() - interval '2 days'),
  ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000003', 'active', now() - interval '1 day')
on conflict (user_a_id, user_b_id) do update set
  source_invitation_id = excluded.source_invitation_id,
  connection_status = excluded.connection_status,
  connected_at = excluded.connected_at;

insert into public.conversations (
  conversation_id,
  related_invitation_id,
  fixed_plan_id,
  event_id,
  conversation_status,
  created_at,
  updated_at
)
values
  ('70000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', null, 'active', now() - interval '1 hour', now()),
  ('70000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', null, 'active', now() - interval '4 days', now()),
  ('70000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', null, 'active', now() - interval '3 days', now()),
  ('70000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', null, 'active', now() - interval '2 days', now())
on conflict (conversation_id) do update set
  related_invitation_id = excluded.related_invitation_id,
  fixed_plan_id = excluded.fixed_plan_id,
  event_id = excluded.event_id,
  conversation_status = excluded.conversation_status,
  updated_at = now(),
  closed_at = null;

insert into public.conversation_members (conversation_id, user_id, joined_at, left_at)
values
  ('70000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', now() - interval '1 hour', null),
  ('70000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000006', now() - interval '1 hour', null),
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', now() - interval '2 days', null),
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', now() - interval '2 days', null),
  ('70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', now() - interval '2 days', null),
  ('70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', now() - interval '2 days', null),
  ('70000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', now() - interval '2 days', null),
  ('70000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004', now() - interval '2 days', null)
on conflict (conversation_id, user_id) do update set
  left_at = null;

insert into public.messages (
  message_id,
  conversation_id,
  sender_user_id,
  message_type,
  content,
  created_at
)
values
  ('80000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'text', '火曜日の朝、一緒に散歩しませんか？', now() - interval '2 days'),
  ('80000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'text', 'ぜひ！9時に行船公園で会いましょう。', now() - interval '1 day'),
  ('80000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'text', '楽しみにしています！', now())
on conflict (message_id) do update set
  content = excluded.content,
  created_at = excluded.created_at;

commit;

-- Optional cleanup for this seed only (run separately if needed):
-- delete from auth.users
-- where id between '10000000-0000-4000-8000-000000000001'::uuid
--              and '10000000-0000-4000-8000-000000000006'::uuid;
