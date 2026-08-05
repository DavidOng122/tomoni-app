create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  account_status text not null default 'active',
  onboarding_status text not null default 'not_started',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint users_account_status_check check (account_status in ('active', 'suspended', 'deleted')),
  constraint users_onboarding_status_check check (onboarding_status in ('not_started', 'in_progress', 'completed')),
  constraint users_onboarding_completed_at_check check (
    (onboarding_status = 'completed' and onboarding_completed_at is not null) or
    (onboarding_status != 'completed' and onboarding_completed_at is null)
  )
);
