BEGIN;

DO $$
DECLARE
  v_caller uuid;
  v_creator uuid;
  v_event_a uuid;
  v_event_b uuid;
  v_event_c uuid;
  v_event_d uuid;
  v_event_e uuid;
  v_users uuid[];
BEGIN
  SELECT id INTO v_caller FROM auth.users LIMIT 1;
  SELECT id INTO v_creator FROM auth.users WHERE id != v_caller LIMIT 1;
  
  SELECT array_agg(id) INTO v_users FROM auth.users WHERE id NOT IN (v_caller, v_creator);
  
  -- Create events
  INSERT INTO public.events (event_id, title, event_status, created_by_user_id) VALUES 
  (gen_random_uuid(), 'Event A', 'scheduled', v_creator) RETURNING event_id INTO v_event_a;
  INSERT INTO public.events (event_id, title, event_status, created_by_user_id) VALUES 
  (gen_random_uuid(), 'Event B', 'scheduled', v_creator) RETURNING event_id INTO v_event_b;
  INSERT INTO public.events (event_id, title, event_status, created_by_user_id) VALUES 
  (gen_random_uuid(), 'Event C', 'scheduled', v_creator) RETURNING event_id INTO v_event_c;
  INSERT INTO public.events (event_id, title, event_status, created_by_user_id) VALUES 
  (gen_random_uuid(), 'Event D', 'scheduled', v_creator) RETURNING event_id INTO v_event_d;
  INSERT INTO public.events (event_id, title, approval_required, event_status, created_by_user_id) VALUES 
  (gen_random_uuid(), 'Event E', true, 'scheduled', v_creator) RETURNING event_id INTO v_event_e;

  -- 1 going
  INSERT INTO public.event_participations (user_id, event_id, participation_status) VALUES (v_users[1], v_event_b, 'going');
  
  -- 3 going
  INSERT INTO public.event_participations (user_id, event_id, participation_status) VALUES 
  (v_users[1], v_event_c, 'going'),
  (v_users[2], v_event_c, 'going'),
  (v_users[3], v_event_c, 'going');

  -- 4 going 
  INSERT INTO public.event_participations (user_id, event_id, participation_status) VALUES 
  (v_caller, v_event_d, 'going'),
  (v_creator, v_event_d, 'going'),
  (v_users[1], v_event_d, 'going'),
  (v_users[2], v_event_d, 'going');

  -- 3 going + 2 requested + 1 cancelled + 1 rejected
  INSERT INTO public.event_participations (user_id, event_id, participation_status) VALUES 
  (v_users[1], v_event_e, 'going'),
  (v_users[2], v_event_e, 'going'),
  (v_users[3], v_event_e, 'going'),
  (v_users[4], v_event_e, 'requested'),
  (v_users[5], v_event_e, 'requested'),
  (v_users[6], v_event_e, 'cancelled'),
  (v_users[7], v_event_e, 'rejected');

  -- Impersonate caller
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"' || v_caller || '"}', true);

  RAISE NOTICE '--- Test 0 going ---';
  RAISE NOTICE '%', (SELECT json_agg(row_to_json(t)) FROM public.get_event_participant_preview(v_event_a) t);
  
  RAISE NOTICE '--- Test 1 going ---';
  RAISE NOTICE '%', (SELECT json_agg(row_to_json(t)) FROM public.get_event_participant_preview(v_event_b) t);

  RAISE NOTICE '--- Test 3 going ---';
  RAISE NOTICE '%', (SELECT json_agg(row_to_json(t)) FROM public.get_event_participant_preview(v_event_c) t);

  RAISE NOTICE '--- Test 4 going ---';
  RAISE NOTICE '%', (SELECT json_agg(row_to_json(t)) FROM public.get_event_participant_preview(v_event_d) t);

  RAISE NOTICE '--- Test 3 going + requested/cancelled/rejected ---';
  RAISE NOTICE '%', (SELECT json_agg(row_to_json(t)) FROM public.get_event_participant_preview(v_event_e) t);

END $$;
ROLLBACK;
