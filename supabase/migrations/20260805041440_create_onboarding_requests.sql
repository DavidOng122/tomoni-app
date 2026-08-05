create table public.onboarding_requests (
  user_id uuid not null references public.users(id) on delete cascade,
  request_id uuid not null,
  payload_hash text not null,
  status text not null,
  result jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,

  primary key (user_id, request_id),
  
  constraint onboarding_requests_status_check check (
    (
      status = 'processing'
      and result is null
      and completed_at is null
    )
    or
    (
      status = 'completed'
      and result is not null
      and completed_at is not null
    )
  ),
  constraint onboarding_requests_payload_hash_check check (btrim(payload_hash) <> '')
);
