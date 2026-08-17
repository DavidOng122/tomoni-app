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
