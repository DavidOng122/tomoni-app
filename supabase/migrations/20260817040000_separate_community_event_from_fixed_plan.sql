update public.events
set
  title = '篠崎公園 青空ストレッチ会',
  description = '篠崎公園の緑の中で、身体をゆっくりほぐす地域のストレッチ会です。運動が久しぶりの方や、ひとりでの参加も歓迎します。',
  poster_url = '/images/discover/shinozaki-park.jpg',
  place_name = '篠崎公園',
  address = '東京都江戸川区上篠崎1丁目25-1',
  latitude = 35.706900,
  longitude = 139.903600,
  updated_at = now()
where event_id = '30000000-0000-4000-8000-000000000001';
