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
