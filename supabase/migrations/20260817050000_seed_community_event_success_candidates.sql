-- The complete local demo dataset is loaded after migrations by
-- snippets/figma_mock_seed.sql. Keep this migration safe for both an existing
-- seeded database and a brand-new `supabase db reset` database.
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
