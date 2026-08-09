-- Allow empty array for p_schedules in complete_onboarding RPC
create or replace function public.complete_onboarding(
  p_profile jsonb,
  p_schedules jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_account_status text;
  v_onboarding_status text;
  v_completed_at timestamptz;
  v_schedule jsonb;
  v_gender text;
  v_result jsonb;
begin
  -- 1. Auth check
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = 'TM001', message = 'unauthenticated';
  end if;

  -- 2. Basic payload validation
  if p_profile is null or jsonb_typeof(p_profile) != 'object' then
    raise exception using errcode = 'TM010', message = 'invalid_profile_shape';
  end if;
  
  if p_schedules is null or jsonb_typeof(p_schedules) != 'array' then
    raise exception using errcode = 'TM020', message = 'schedules_required';
  end if;

  -- 3. Lock user
  select account_status, onboarding_status 
  into v_account_status, v_onboarding_status
  from public.users 
  where id = v_user_id for update;

  if not found then
    raise exception using errcode = 'TM003', message = 'user_not_found';
  end if;

  if v_account_status != 'active' then
    raise exception using errcode = 'TM004', message = 'account_not_active';
  end if;

  if v_onboarding_status = 'completed' then
    raise exception using errcode = 'TM005', message = 'onboarding_already_completed';
  end if;

  v_completed_at := now();

  -- 4. Update/Insert Profile
  v_gender := coalesce(p_profile->>'gender', 'prefer_not_to_say');

  insert into public.profiles (
    user_id, nickname, avatar_url, age_range, gender, tags, bio, profile_status, created_at, updated_at
  ) values (
    v_user_id, 
    trim(p_profile->>'nickname'), 
    coalesce(p_profile->>'avatar_url', ''),
    p_profile->>'age_range', 
    v_gender, 
    coalesce(
      (select array_agg(t.value::text) from jsonb_array_elements_text(p_profile->'tags') t(value)),
      '{}'::text[]
    ),
    p_profile->>'bio',
    'active',
    v_completed_at,
    v_completed_at
  )
  on conflict (user_id) do update set
    nickname = excluded.nickname,
    avatar_url = excluded.avatar_url,
    age_range = excluded.age_range,
    gender = excluded.gender,
    tags = excluded.tags,
    bio = excluded.bio,
    updated_at = v_completed_at;

  -- 5. Insert Fixed Plans
  delete from public.fixed_plans where user_id = v_user_id;

  for v_schedule in select * from jsonb_array_elements(p_schedules) loop
    insert into public.fixed_plans (
      user_id, activity_type, custom_activity_name, days_of_week, start_time,
      place_id, place_name, latitude, longitude, plan_status, created_at, updated_at
    ) values (
      v_user_id, 
      v_schedule->>'activity_type', 
      v_schedule->>'custom_activity_name',
      array(select jsonb_array_elements_text(v_schedule->'days_of_week')),
      (v_schedule->>'start_time')::time,
      v_schedule->>'place_id',
      v_schedule->>'place_name',
      (v_schedule->>'latitude')::double precision,
      (v_schedule->>'longitude')::double precision,
      'active',
      v_completed_at,
      v_completed_at
    );
  end loop;

  -- 6. Mark user completed
  update public.users set
    onboarding_status = 'completed',
    updated_at = v_completed_at
  where id = v_user_id;

  v_result := jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'onboarding_status', 'completed',
    'completed_at', v_completed_at
  );

  return v_result;
end;
$$;
