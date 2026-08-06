create function public.complete_onboarding(
  p_request_id uuid,
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
  v_normalized_payload jsonb;
  v_payload_hash text;
  v_existing_request record;
  v_completed_at timestamptz;
  v_schedule jsonb;
  v_schedule_elem jsonb;
  v_client_id uuid;
  v_seen_client_ids uuid[] := '{}';
  v_gender text;
  v_result jsonb;
  v_schedules_result jsonb[];
  v_schedules_written int := 0;
begin
  -- 1. 获取并验证身份
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = 'TM001', message = 'unauthenticated';
  end if;

  -- 2. 基础参数预检
  if p_request_id is null then
    raise exception using errcode = 'TM002', message = 'invalid_request_id';
  end if;

  -- 3. 顶层结构检查
  if p_profile is null or jsonb_typeof(p_profile) != 'object' then
    raise exception using errcode = 'TM010', message = 'invalid_profile_shape';
  end if;
  
  if p_schedules is null then
    raise exception using errcode = 'TM020', message = 'schedules_required';
  end if;

  if jsonb_typeof(p_schedules) != 'array' then
    raise exception using errcode = 'TM022', message = 'invalid_schedules_shape';
  end if;

  if jsonb_array_length(p_schedules) = 0 then
    raise exception using errcode = 'TM020', message = 'schedules_required';
  end if;
  
  if jsonb_array_length(p_schedules) > 20 then
    raise exception using errcode = 'TM021', message = 'too_many_schedules';
  end if;

  -- Profile Validation
  if p_profile ? 'avatar_url' then
     raise exception using errcode = 'TM013', message = 'invalid_avatar_value';
  end if;

  if p_profile - array['nickname', 'gender', 'age_range'] != '{}'::jsonb then
    raise exception using errcode = 'TM012', message = 'unknown_profile_field';
  end if;

  if not (p_profile ? 'nickname') or jsonb_typeof(p_profile->'nickname') != 'string' or trim(p_profile->>'nickname') = '' then
    raise exception using errcode = 'TM011', message = 'invalid_profile';
  end if;

  if not (p_profile ? 'age_range') or jsonb_typeof(p_profile->'age_range') != 'string' or p_profile->>'age_range' not in ('18_24', '25_34', '35_44', '45_54', '55_plus') then
    raise exception using errcode = 'TM011', message = 'invalid_profile';
  end if;

  v_gender := null;
  if p_profile ? 'gender' and jsonb_typeof(p_profile->'gender') != 'null' then
    if jsonb_typeof(p_profile->'gender') != 'string' or p_profile->>'gender' not in ('female', 'male', 'prefer_not_to_say') then
      raise exception using errcode = 'TM011', message = 'invalid_profile';
    end if;
    v_gender := p_profile->>'gender';
  end if;

  -- Schedules Validation
  for v_schedule_elem in select * from jsonb_array_elements(p_schedules) loop
    if jsonb_typeof(v_schedule_elem) != 'object' then
      raise exception using errcode = 'TM022', message = 'invalid_schedules_shape';
    end if;

    if v_schedule_elem - array['client_id', 'activity_type', 'days_of_week', 'time_slot', 'location_label'] != '{}'::jsonb then
      raise exception using errcode = 'TM025', message = 'unknown_schedule_field';
    end if;

    if not (v_schedule_elem ? 'client_id') or jsonb_typeof(v_schedule_elem->'client_id') != 'string' then
       raise exception using errcode = 'TM024', message = 'invalid_schedule';
    end if;
    
    begin
      v_client_id := (v_schedule_elem->>'client_id')::uuid;
    exception when others then
      raise exception using errcode = 'TM024', message = 'invalid_schedule';
    end;

    if v_client_id = any(v_seen_client_ids) then
       raise exception using errcode = 'TM023', message = 'duplicate_schedule_client_id';
    end if;
    v_seen_client_ids := array_append(v_seen_client_ids, v_client_id);

    if not (v_schedule_elem ? 'activity_type') or jsonb_typeof(v_schedule_elem->'activity_type') != 'string' or v_schedule_elem->>'activity_type' not in ('walking', 'running', 'dog_walking', 'study_reading', 'sports', 'other') then
      raise exception using errcode = 'TM024', message = 'invalid_schedule';
    end if;

    if not (v_schedule_elem ? 'location_label') or jsonb_typeof(v_schedule_elem->'location_label') != 'string' or trim(v_schedule_elem->>'location_label') = '' then
      raise exception using errcode = 'TM024', message = 'invalid_schedule';
    end if;

    if v_schedule_elem ? 'time_slot' and jsonb_typeof(v_schedule_elem->'time_slot') != 'null' then
       if jsonb_typeof(v_schedule_elem->'time_slot') != 'string' or v_schedule_elem->>'time_slot' not in ('morning', 'daytime', 'evening', 'night') then
          raise exception using errcode = 'TM024', message = 'invalid_schedule';
       end if;
    end if;

    if not (v_schedule_elem ? 'days_of_week') then
      raise exception using errcode = 'TM024', message = 'invalid_schedule';
    end if;
    
    if jsonb_typeof(v_schedule_elem->'days_of_week') != 'array' then
      raise exception using errcode = 'TM024', message = 'invalid_schedule';
    end if;
    
    if jsonb_array_length(v_schedule_elem->'days_of_week') = 0 then
      raise exception using errcode = 'TM024', message = 'invalid_schedule';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(v_schedule_elem->'days_of_week') as d(value)
      where jsonb_typeof(d.value) != 'string'
    ) then
      raise exception using errcode = 'TM024', message = 'invalid_schedule';
    end if;

    if exists (
      select 1
      from jsonb_array_elements_text(v_schedule_elem->'days_of_week') as d(day)
      where d.day not in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
    ) then
      raise exception using errcode = 'TM024', message = 'invalid_schedule';
    end if;

    if (
      select count(distinct d.day)
      from jsonb_array_elements_text(v_schedule_elem->'days_of_week') as d(day)
    ) != jsonb_array_length(v_schedule_elem->'days_of_week') then
      raise exception using errcode = 'TM024', message = 'invalid_schedule';
    end if;
  end loop;

  -- 4. 规范化与计算 Hash
  v_normalized_payload := jsonb_build_object(
    'p', jsonb_build_object(
      'nickname', trim(p_profile->>'nickname'),
      'age_range', p_profile->>'age_range',
      'gender', v_gender
    ),
    's', (
      select jsonb_agg(
        jsonb_build_object(
          'client_id', (s->>'client_id')::uuid::text,
          'activity_type', s->>'activity_type',
          'location_label', trim(s->>'location_label'),
          'time_slot', case when jsonb_typeof(s->'time_slot') = 'null' or not (s ? 'time_slot') then null else s->>'time_slot' end,
          'days_of_week', (
            select jsonb_agg(d.day)
            from (
              select x.day
              from jsonb_array_elements_text(s->'days_of_week') as x(day)
              order by case x.day
                when 'monday' then 1
                when 'tuesday' then 2
                when 'wednesday' then 3
                when 'thursday' then 4
                when 'friday' then 5
                when 'saturday' then 6
                when 'sunday' then 7
              end
            ) d
          )
        ) order by (s->>'client_id')::uuid::text
      )
      from jsonb_array_elements(p_schedules) as s
    )
  );

  v_payload_hash := md5(v_normalized_payload::text);

  -- 5. 防并发写锁
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

  -- 6. 查询 Request
  select * into v_existing_request 
  from public.onboarding_requests 
  where user_id = v_user_id and request_id = p_request_id;

  if found then
    if v_existing_request.payload_hash != v_payload_hash then
      raise exception using errcode = 'TM030', message = 'request_payload_conflict';
    end if;

    if v_existing_request.status = 'completed' then
      return v_existing_request.result;
    end if;

    if v_existing_request.status = 'processing' then
      raise exception using errcode = 'TM031', message = 'request_state_invalid';
    end if;
  end if;

  -- 7. 查 Onboarding 状态
  if v_onboarding_status = 'completed' then
    raise exception using errcode = 'TM005', message = 'onboarding_already_completed';
  end if;

  -- 8. 占位写入
  insert into public.onboarding_requests (user_id, request_id, payload_hash, status)
  values (v_user_id, p_request_id, v_payload_hash, 'processing');

  v_completed_at := now();

  -- 9. 业务写入
  insert into public.profiles (user_id, nickname, age_range, gender, avatar_url, updated_at)
  values (v_user_id, trim(p_profile->>'nickname'), p_profile->>'age_range', v_gender, null, v_completed_at)
  on conflict (user_id) do update set
    nickname = excluded.nickname,
    age_range = excluded.age_range,
    gender = excluded.gender,
    updated_at = v_completed_at;

  v_schedules_result := '{}'::jsonb[];

  for v_schedule in select * from jsonb_array_elements(v_normalized_payload->'s') loop
    v_client_id := (v_schedule->>'client_id')::uuid;
    v_schedule_elem := null;

    insert into public.fixed_schedules (
      user_id, client_id, activity_type, days_of_week, time_slot, location_label,
      location_status, location_point, area_name, status, deleted_at, updated_at
    ) values (
      v_user_id, v_client_id, v_schedule->>'activity_type', 
      array(select jsonb_array_elements_text(v_schedule->'days_of_week')),
      v_schedule->>'time_slot', v_schedule->>'location_label',
      'unverified', null, null, 'active', null, v_completed_at
    )
    on conflict (user_id, client_id) do update set
      activity_type = excluded.activity_type,
      days_of_week = excluded.days_of_week,
      time_slot = excluded.time_slot,
      location_label = excluded.location_label,
      location_status = 'unverified',
      location_point = null,
      area_name = null,
      status = 'active',
      deleted_at = null,
      updated_at = v_completed_at
    where public.fixed_schedules.status = 'draft'
    returning jsonb_build_object('id', id, 'client_id', client_id) into v_schedule_elem;

    if v_schedule_elem is null then
       raise exception using errcode = 'TM026', message = 'schedule_state_conflict';
    end if;

    v_schedules_result := array_append(v_schedules_result, v_schedule_elem);
    v_schedules_written := v_schedules_written + 1;
  end loop;

  update public.users set
    onboarding_status = 'completed',
    onboarding_completed_at = v_completed_at,
    updated_at = v_completed_at
  where id = v_user_id;

  -- 10. 组装并保存 Result
  v_result := jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'user_id', v_user_id,
    'onboarding_status', 'completed',
    'onboarding_completed_at', v_completed_at,
    'profile', jsonb_build_object('user_id', v_user_id),
    'schedules', array_to_json(v_schedules_result)::jsonb,
    'schedules_written', v_schedules_written
  );

  update public.onboarding_requests set
    status = 'completed',
    result = v_result,
    completed_at = v_completed_at
  where user_id = v_user_id and request_id = p_request_id;

  return v_result;
end;
$$;

revoke execute on function public.complete_onboarding(uuid, jsonb, jsonb) from public;
revoke execute on function public.complete_onboarding(uuid, jsonb, jsonb) from anon;
revoke execute on function public.complete_onboarding(uuid, jsonb, jsonb) from service_role;
grant execute on function public.complete_onboarding(uuid, jsonb, jsonb) to authenticated;
