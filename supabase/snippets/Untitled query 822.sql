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
  registration_required,
  registration_status,
  registration_deadline,
  registration_url,
  approval_required,
  looking_for_participants,
  event_status,
  official_url
)
values

-- 1. OPEN：应该显示「公式サイトで申し込む」
(
  gen_random_uuid(),
  'official',
  null,
  'Shinjuku City',
  '新宿中央公園 朝の散歩会',
  '朝の公園をゆっくり歩く地域交流イベントです。',
  'https://placehold.co/1200x800?text=Morning+Walk',
  '2026-08-17 08:00:00+09',
  '2026-08-17 10:00:00+09',
  '新宿中央公園',
  '東京都新宿区西新宿2-11',
  true,
  'open',
  '2026-08-16 18:00:00+09',
  'https://example.com/register/morning-walk',
  false,
  true,
  'scheduled',
  'https://example.com/events/morning-walk'
),

-- 2. NOT_STARTED：应该显示 disabled「受付前」
(
  gen_random_uuid(),
  'official',
  null,
  'Setagaya City',
  '世田谷公園 コミュニティラン',
  '初心者でも参加できる地域ランニングイベントです。',
  'https://placehold.co/1200x800?text=Community+Run',
  '2026-08-22 09:00:00+09',
  '2026-08-22 11:00:00+09',
  '世田谷公園',
  '東京都世田谷区池尻1-5-27',
  true,
  'not_started',
  '2026-08-21 18:00:00+09',
  'https://example.com/register/community-run',
  false,
  true,
  'scheduled',
  'https://example.com/events/community-run'
),

-- 3. CLOSED：应该显示 disabled「受付終了」
(
  gen_random_uuid(),
  'official',
  null,
  'Shibuya City',
  '代々木公園 ウェルネスイベント',
  '公園で行う軽い運動とウェルネス体験イベントです。',
  'https://placehold.co/1200x800?text=Wellness+Event',
  '2026-08-24 10:00:00+09',
  '2026-08-24 12:00:00+09',
  '代々木公園',
  '東京都渋谷区代々木神園町2-1',
  true,
  'closed',
  '2026-08-20 18:00:00+09',
  'https://example.com/register/wellness',
  false,
  true,
  'scheduled',
  'https://example.com/events/wellness'
),

-- 4. FULL：应该显示 disabled「受付終了」
(
  gen_random_uuid(),
  'official',
  null,
  'Meguro City',
  '目黒川まち歩き',
  '目黒川周辺を歩きながら地域を知るまち歩きイベントです。',
  'https://placehold.co/1200x800?text=Meguro+Walk',
  '2026-08-26 14:00:00+09',
  '2026-08-26 16:00:00+09',
  '中目黒駅',
  '東京都目黒区上目黒3丁目',
  true,
  'full',
  '2026-08-25 18:00:00+09',
  'https://example.com/register/meguro-walk',
  false,
  true,
  'scheduled',
  'https://example.com/events/meguro-walk'
),

-- 5. NOT_REQUIRED：不显示报名 CTA，只显示「公式サイトを見る」
(
  gen_random_uuid(),
  'official',
  null,
  'Tokyo Metropolitan Government',
  '週末オープンマーケット',
  '予約不要で自由に参加できる地域マーケットです。',
  'https://placehold.co/1200x800?text=Open+Market',
  '2026-08-29 11:00:00+09',
  '2026-08-29 17:00:00+09',
  '都立明治公園',
  '東京都新宿区霞ヶ丘町5-7',
  false,
  'not_required',
  null,
  null,
  false,
  true,
  'scheduled',
  'https://example.com/events/open-market'
),

-- 6. UNKNOWN：不能报名，只显示「公式サイトを見る」
(
  gen_random_uuid(),
  'official',
  null,
  'Local Community Center',
  '地域交流カフェ',
  '地域の人と気軽に話せる交流イベントです。',
  null,
  '2026-08-30 13:00:00+09',
  '2026-08-30 15:00:00+09',
  '地域交流センター',
  null,
  true,
  'unknown',
  null,
  null,
  false,
  true,
  'scheduled',
  'https://example.com/events/community-cafe'
),

-- 7. OPEN だけど deadline 済み：
-- status=open より deadline が優先され「受付終了」
(
  gen_random_uuid(),
  'official',
  null,
  'Suginami City',
  '高円寺まち歩きツアー',
  null,
  null,
  '2026-09-02 10:00:00+09',
  '2026-09-02 12:00:00+09',
  '高円寺駅',
  null,
  true,
  'open',

  -- 現在より過去の deadline
  '2026-08-08 18:00:00+09',

  'https://example.com/register/koenji-walk',
  false,
  true,
  'scheduled',
  'https://example.com/events/koenji-walk'
);