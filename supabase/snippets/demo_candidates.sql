-- Demo Candidate Data (Local/Demo Seeding Only)
-- This file seeds 100 deterministic demo candidates across Edogawa City.
-- It is executed as part of local development seed (supabase/snippets/figma_mock_seed.sql)
-- and is NOT included in production database migrations.

begin;

-- 1. Community event success candidates
do $$
begin
if exists (
  select 1
  from public.events
  where event_id = '30000000-0000-4000-8000-000000000001'
) and (
  select count(*) = 3
  from auth.users
  where id in (
    '10000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000007'
  )
) then
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
  (
    '40000000-0000-4000-8000-000000000010',
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000005',
    current_date + 1,
    '17:05',
    60,
    'going'
  ),
  (
    '40000000-0000-4000-8000-000000000011',
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000006',
    current_date + 1,
    '17:10',
    60,
    'going'
  ),
  (
    '40000000-0000-4000-8000-000000000012',
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000007',
    current_date + 1,
    '17:15',
    60,
    'going'
  )
on conflict (event_id, user_id) do update set
  participation_date = excluded.participation_date,
  arrival_time = excluded.arrival_time,
  planned_duration_minutes = excluded.planned_duration_minutes,
  participation_status = excluded.participation_status,
  updated_at = now();
end if;
end;
$$;

-- 2. Align connected event candidate times
update public.event_participations
set
  arrival_time = case participation_id
    when '40000000-0000-4000-8000-000000000001' then '18:15'::time
    when '40000000-0000-4000-8000-000000000002' then '18:30'::time
    when '40000000-0000-4000-8000-000000000003' then '18:45'::time
    else arrival_time
  end,
  participation_status = 'going',
  updated_at = now()
where participation_id in (
  '40000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000002',
  '40000000-0000-4000-8000-000000000003'
);

-- 3. Seed 100 deterministic demo candidates across Edogawa City
with candidate_numbers as (
  select generate_series(10, 109) as candidate_number
),
candidate_users as (
  select
    candidate_number,
    ('10000000-0000-4000-8000-' || lpad(candidate_number::text, 12, '0'))::uuid as user_id,
    case candidate_number
      when 10 then 'figma.ren@tomoni.local'
      when 11 then 'figma.himari@tomoni.local'
      when 12 then 'figma.sota@tomoni.local'
      when 13 then 'figma.yui@tomoni.local'
      when 14 then 'figma.riku@tomoni.local'
      when 15 then 'figma.rin@tomoni.local'
      else 'figma.candidate.' || lpad((candidate_number - 9)::text, 3, '0') || '@tomoni.local'
    end as email
  from candidate_numbers
),
password_hash as (
  select extensions.crypt('TomoniDemo!2026', extensions.gen_salt('bf')) as encrypted_password
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
  candidate_users.user_id,
  'authenticated',
  'authenticated',
  candidate_users.email,
  password_hash.encrypted_password,
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
    'sub', candidate_users.user_id::text,
    'email', candidate_users.email,
    'email_verified', true,
    'phone_verified', false
  ),
  now(),
  now(),
  false,
  false
from candidate_users
cross join password_hash
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

with candidate_users as (
  select
    ('10000000-0000-4000-8000-' || lpad(candidate_number::text, 12, '0'))::uuid as user_id
  from generate_series(10, 109) as candidate_number
)
insert into public.users (id, account_status, onboarding_status)
select user_id, 'active', 'completed'
from candidate_users
on conflict (id) do update set
  account_status = excluded.account_status,
  onboarding_status = excluded.onboarding_status,
  updated_at = now();

with candidate_profiles as (
  select
    candidate_number,
    ('10000000-0000-4000-8000-' || lpad(candidate_number::text, 12, '0'))::uuid as user_id,
    case candidate_number
      when 10 then '蓮'
      when 11 then '陽葵'
      when 12 then '颯太'
      when 13 then '結衣'
      when 14 then '陸'
      when 15 then '凛'
      else 'Yorimi Candidate ' || lpad((candidate_number - 9)::text, 3, '0')
    end as nickname,
    case candidate_number % 4
      when 0 then 'male'
      when 1 then 'female'
      when 2 then 'other'
      else 'prefer_not_to_say'
    end as gender,
    case candidate_number % 5
      when 0 then '18-24'
      when 1 then '25-34'
      when 2 then '35-44'
      when 3 then '45-54'
      else '55+'
    end as age_range,
    '/images/avatars/avatar-' || lpad((candidate_number - 9)::text, 3, '0') || '.svg' as avatar_url,
    case
      when candidate_number - 10 < 60 then
        case candidate_number % 4
          when 0 then array['散歩', '地域交流', 'カフェ']
          when 1 then array['散歩', '写真', '公園']
          when 2 then array['散歩', '健康', '朝活']
          else array['散歩', 'カフェ', '写真']
        end
      when candidate_number - 10 < 72 then array['犬', '散歩', '公園']
      when candidate_number - 10 < 84 then array['スポーツ', 'ランニング', '健康']
      when candidate_number - 10 < 94 then array['読書', '勉強', 'カフェ']
      else array['地域交流', 'イベント', '写真']
    end::text[] as tags
  from generate_series(10, 109) as candidate_number
)
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
select
  user_id,
  nickname,
  gender,
  age_range,
  avatar_url,
  tags,
  '江戸川区で近くの同行者を探しています。活動時間と距離が合えば、ぜひご一緒しましょう。',
  'active'
from candidate_profiles
on conflict (user_id) do update set
  nickname = excluded.nickname,
  gender = excluded.gender,
  age_range = excluded.age_range,
  avatar_url = excluded.avatar_url,
  tags = excluded.tags,
  bio = excluded.bio,
  profile_status = excluded.profile_status,
  updated_at = now();

with edogawa_areas(area_index, area_name, base_latitude, base_longitude) as (
  values
    (0, '葛西',   35.663500::numeric, 139.872600::numeric),
    (1, '西葛西', 35.665900::numeric, 139.859300::numeric),
    (2, '船堀',   35.683700::numeric, 139.864300::numeric),
    (3, '一之江', 35.686200::numeric, 139.882700::numeric),
    (4, '瑞江',   35.693300::numeric, 139.897600::numeric),
    (5, '篠崎',   35.706900::numeric, 139.903600::numeric),
    (6, '小岩',   35.733000::numeric, 139.881700::numeric),
    (7, '平井',   35.706400::numeric, 139.842400::numeric),
    (8, '松江',   35.699300::numeric, 139.871900::numeric),
    (9, '鹿骨',   35.716600::numeric, 139.891300::numeric)
),
candidate_plan_base as (
  select
    candidate_number,
    candidate_number - 10 as offset_number,
    ('10000000-0000-4000-8000-' || lpad(candidate_number::text, 12, '0'))::uuid as user_id,
    ('20000000-0000-4000-8000-' || lpad(candidate_number::text, 12, '0'))::uuid as fixed_plan_id,
    (candidate_number - 10) % 10 as area_index,
    case
      when candidate_number - 10 < 60 then 'walking'
      when candidate_number - 10 < 72 then 'dog_walking'
      when candidate_number - 10 < 84 then 'sports'
      when candidate_number - 10 < 94 then 'study_reading'
      else 'event'
    end as activity_type,
    case (candidate_number - 10) % 8
      when 0 then array['mon', 'wed', 'fri']
      when 1 then array['tue', 'thu']
      when 2 then array['sat', 'sun']
      when 3 then array['mon', 'tue']
      when 4 then array['wed', 'thu']
      when 5 then array['fri', 'sat']
      when 6 then array['sun']
      else array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    end::text[] as days_of_week,
    case
      when candidate_number - 10 < 48 then
        (time '07:30' + (((candidate_number - 10) % 9) * interval '15 minutes'))::time
      when candidate_number - 10 < 60 then
        (time '17:30' + (((candidate_number - 10) % 7) * interval '15 minutes'))::time
      when candidate_number - 10 < 72 then
        (time '07:00' + (((candidate_number - 10) % 8) * interval '20 minutes'))::time
      when candidate_number - 10 < 84 then
        (time '06:30' + (((candidate_number - 10) % 30) * interval '30 minutes'))::time
      when candidate_number - 10 < 94 then
        (time '12:30' + (((candidate_number - 10) % 7) * interval '30 minutes'))::time
      else
        (time '10:00' + (((candidate_number - 10) % 6) * interval '60 minutes'))::time
    end as start_time
  from generate_series(10, 109) as candidate_number
),
candidate_plans as (
  select
    candidate_plan_base.*,
    edogawa_areas.area_name,
    edogawa_areas.base_latitude as latitude,
    edogawa_areas.base_longitude as longitude
  from candidate_plan_base
  join edogawa_areas using (area_index)
)
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
select
  fixed_plan_id,
  user_id,
  activity_type,
  days_of_week,
  'active',
  case when activity_type = 'other' then '近所で気軽に交流' else null end,
  start_time,
  null,
  area_name,
  latitude,
  longitude
from candidate_plans
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

do $$
begin
  if exists (select 1 from public.events where event_id = '30000000-0000-4000-8000-000000000001') then
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
      ('40000000-0000-4000-8000-000000000020', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000010', current_date + 1, '09:00', 60, 'going'),
      ('40000000-0000-4000-8000-000000000021', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000011', current_date + 1, '09:00', 60, 'going'),
      ('40000000-0000-4000-8000-000000000022', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000013', current_date + 1, '09:00', 60, 'going'),
      ('40000000-0000-4000-8000-000000000023', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000010', current_date + 7, '10:00', 60, 'going'),
      ('40000000-0000-4000-8000-000000000024', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000012', current_date + 7, '10:00', 60, 'going')
    on conflict (event_id, user_id) do update set
      participation_date = excluded.participation_date,
      arrival_time = excluded.arrival_time,
      planned_duration_minutes = excluded.planned_duration_minutes,
      participation_status = excluded.participation_status,
      updated_at = now();
  end if;
end;
$$;

-- 4. Rebalance demo candidate coverage (offset_number < 48 then offset_number * interval '30 minutes') (offset_number < 60 then array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) (offset_number < 60 then 'walking') (offset_number < 70 then 'dog_walking') (offset_number < 80 then 'sports') (offset_number < 90 then 'study_reading') (offset_number < 95 then 'event') (else 'other') (place_id = null)
with candidate_plans as (
  select
    candidate_number,
    candidate_number - 10 as offset_number,
    ('20000000-0000-4000-8000-' || lpad(candidate_number::text, 12, '0'))::uuid as fixed_plan_id,
    case
      when candidate_number - 10 < 60 then
        (time '00:00' + ((((candidate_number - 10) * 23) % 48) * interval '30 minutes'))::time
      when candidate_number - 10 < 72 then
        (time '06:00' + (((candidate_number - 10) % 12) * interval '30 minutes'))::time
      when candidate_number - 10 < 84 then
        (time '06:00' + (((candidate_number - 10) % 14) * interval '30 minutes'))::time
      when candidate_number - 10 < 94 then
        (time '09:00' + (((candidate_number - 10) % 10) * interval '30 minutes'))::time
      else
        (time '10:00' + (((candidate_number - 10) % 8) * interval '30 minutes'))::time
    end as start_time,
    case
      when candidate_number - 10 < 60 then array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
      when candidate_number - 10 < 72 then array['mon', 'wed', 'fri', 'sat', 'sun']
      when candidate_number - 10 < 84 then array['tue', 'thu', 'sat', 'sun']
      else array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    end::text[] as days_of_week
  from generate_series(10, 109) as candidate_number
)
update public.fixed_plans as fp
set
  start_time = candidate_plans.start_time,
  days_of_week = candidate_plans.days_of_week,
  place_id = null,
  updated_at = now()
from candidate_plans
where fp.fixed_plan_id = candidate_plans.fixed_plan_id;

-- 5. Expand demo candidate time coverage (candidates between 10 and 69)
with activity_variants(activity_type, variant_offset) as (
  values
    ('dog_walking', 1),
    ('sports', 2),
    ('study_reading', 3),
    ('event', 4),
    ('other', 5)
),
base_walking_plans as (
  select
    candidate_number,
    candidate_number - 10 as offset_number,
    ('10000000-0000-4000-8000-' || lpad(candidate_number::text, 12, '0'))::uuid as user_id,
    place_name,
    latitude,
    longitude
  from generate_series(10, 69) as candidate_number
  join public.fixed_plans on fixed_plan_id = ('20000000-0000-4000-8000-' || lpad(candidate_number::text, 12, '0'))::uuid
),
expanded_plans as (
  select
    base_walking_plans.user_id,
    activity_variants.activity_type,
    ('20000000-0000-4000-8000-' || lpad((base_walking_plans.candidate_number + (activity_variants.variant_offset * 100))::text, 12, '0'))::uuid as fixed_plan_id,
    array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']::text[] as days_of_week,
    (time '00:00' + ((((base_walking_plans.offset_number + activity_variants.variant_offset) * 23) % 48) * interval '30 minutes'))::time as start_time,
    base_walking_plans.place_name,
    base_walking_plans.latitude,
    base_walking_plans.longitude
  from base_walking_plans
  cross join activity_variants
)
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
select
  fixed_plan_id,
  user_id,
  activity_type,
  days_of_week,
  'active',
  case when activity_type = 'other' then '近所で気軽に交流' else null end,
  start_time,
  null,
  place_name,
  latitude,
  longitude
from expanded_plans
on conflict (fixed_plan_id) do update set
  activity_type = excluded.activity_type,
  days_of_week = excluded.days_of_week,
  plan_status = excluded.plan_status,
  custom_activity_name = excluded.custom_activity_name,
  start_time = excluded.start_time,
  place_id = null,
  place_name = excluded.place_name,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  updated_at = now();

-- 6. Replace demo profile numbered names
with named_demo_profiles(candidate_number, nickname) as (
  values
    (10, '蓮'),
    (11, '陽葵'),
    (12, '颯太'),
    (13, '結衣'),
    (14, '陸'),
    (15, '凛'),
    (16, '湊'),
    (17, '芽依'),
    (18, '樹'),
    (19, '葵'),
    (20, '大翔'),
    (21, '咲良'),
    (22, '悠真'),
    (23, '陽菜'),
    (24, '陽翔'),
    (25, '莉子'),
    (26, '朝陽'),
    (27, '紬'),
    (28, '翔太'),
    (29, '美月'),
    (30, '蒼'),
    (31, '結菜'),
    (32, '拓海'),
    (33, '心春'),
    (34, '健太'),
    (35, '乃愛'),
    (36, '大和'),
    (37, '杏'),
    (38, '誠'),
    (39, '楓'),
    (40, '翼'),
    (41, '凛香'),
    (42, '海斗'),
    (43, '詩'),
    (44, '奏太'),
    (45, '琴葉'),
    (46, '直樹'),
    (47, '柚希'),
    (48, '涼'),
    (49, '彩花'),
    (50, '颯'),
    (51, '花'),
    (52, '駿'),
    (53, '澪'),
    (54, '竜也'),
    (55, '結月'),
    (56, '光'),
    (57, 'ひかり'),
    (58, '薫'),
    (59, 'あおい'),
    (60, '翔'),
    (61, 'さくら'),
    (62, '巧'),
    (63, 'あかり'),
    (64, '大介'),
    (65, 'ほのか'),
    (66, '慎太郎'),
    (67, 'ゆい'),
    (68, '正樹'),
    (69, 'なな'),
    (70, '一真'),
    (71, '凛乃'),
    (72, '修平'),
    (73, '愛'),
    (74, '剛'),
    (75, '千尋'),
    (76, '智也'),
    (77, '真央'),
    (78, '和也'),
    (79, '未来'),
    (80, '健二'),
    (81, '美羽'),
    (82, '洋平'),
    (83, '心花'),
    (84, '哲也'),
    (85, '萌'),
    (86, '裕樹'),
    (87, '理央'),
    (88, '勝'),
    (89, '彩乃'),
    (90, '隆'),
    (91, '明日香'),
    (92, '信吾'),
    (93, '凛音'),
    (94, '武'),
    (95, '菜々子'),
    (96, '明'),
    (97, '優花'),
    (98, '進'),
    (99, '舞'),
    (100, '学'),
    (101, '咲'),
    (102, '豊'),
    (103, '愛菜'),
    (104, '清'),
    (105, '綾乃'),
    (106, '茂'),
    (107, '千夏'),
    (108, '勇'),
    (109, '涼花')
),
candidate_user_names as (
  select
    ('10000000-0000-4000-8000-' || lpad(candidate_number::text, 12, '0'))::uuid as user_id,
    nickname
  from named_demo_profiles
)
update public.profiles as profile
set
  nickname = named_demo_profiles.nickname,
  updated_at = now()
from candidate_user_names as named_demo_profiles
where profile.user_id = named_demo_profiles.user_id;

commit;
