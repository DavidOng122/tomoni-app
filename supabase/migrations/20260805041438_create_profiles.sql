create table public.profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  nickname text not null,
  gender text,
  age_range text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_nickname_check check (btrim(nickname) <> ''),
  constraint profiles_gender_check check (gender in ('female', 'male', 'prefer_not_to_say')),
  constraint profiles_age_range_check check (age_range in ('18_24', '25_34', '35_44', '45_54', '55_plus'))
);
