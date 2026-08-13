-- 1. get_event_join_requests RPC
CREATE OR REPLACE FUNCTION public.get_event_join_requests(p_event_id uuid)
RETURNS TABLE (
  participation_id uuid,
  user_id uuid,
  nickname text,
  avatar_url text,
  requested_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id uuid;
  v_created_by_user_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify event ownership
  SELECT created_by_user_id INTO v_created_by_user_id
  FROM public.events
  WHERE event_id = p_event_id;

  IF NOT FOUND OR v_created_by_user_id != v_caller_id THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    ep.participation_id,
    p.user_id,
    p.nickname,
    p.avatar_url,
    ep.created_at AS requested_at
  FROM public.event_participations ep
  JOIN public.profiles p ON p.user_id = ep.user_id
  WHERE ep.event_id = p_event_id
    AND ep.participation_status = 'requested'
  ORDER BY ep.created_at ASC, ep.participation_id ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_event_join_requests(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_event_join_requests(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_event_join_requests(uuid) TO authenticated;

-- 2. approve_event_participant RPC
CREATE OR REPLACE FUNCTION public.approve_event_participant(p_participation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id uuid;
  v_event_id uuid;
  v_created_by_user_id uuid;
  v_current_status text;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check existence and idempotency
  SELECT ep.participation_status, ep.event_id, e.created_by_user_id
  INTO v_current_status, v_event_id, v_created_by_user_id
  FROM public.event_participations ep
  JOIN public.events e ON e.event_id = ep.event_id
  WHERE ep.participation_id = p_participation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participation not found';
  END IF;

  IF v_created_by_user_id != v_caller_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_current_status = 'going' THEN
    RETURN v_event_id;
  END IF;

  -- Atomic update with state validation
  UPDATE public.event_participations ep
  SET participation_status = 'going',
      updated_at = now()
  FROM public.events e
  WHERE ep.event_id = e.event_id
    AND ep.participation_id = p_participation_id
    AND e.created_by_user_id = v_caller_id
    AND ep.participation_status = 'requested'
    AND e.event_status = 'scheduled'
    AND (e.end_at >= now() OR (e.end_at IS NULL AND e.start_at >= now()))
  RETURNING ep.event_id INTO v_event_id;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Approve failed. Request may have been cancelled or event is ineligible.';
  END IF;

  RETURN v_event_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_event_participant(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_event_participant(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_event_participant(uuid) TO authenticated;

-- 3. reject_event_participant RPC
CREATE OR REPLACE FUNCTION public.reject_event_participant(p_participation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id uuid;
  v_event_id uuid;
  v_created_by_user_id uuid;
  v_current_status text;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check existence and idempotency
  SELECT ep.participation_status, ep.event_id, e.created_by_user_id
  INTO v_current_status, v_event_id, v_created_by_user_id
  FROM public.event_participations ep
  JOIN public.events e ON e.event_id = ep.event_id
  WHERE ep.participation_id = p_participation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participation not found';
  END IF;

  IF v_created_by_user_id != v_caller_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_current_status = 'rejected' THEN
    RETURN v_event_id;
  END IF;

  -- Atomic update with state validation
  UPDATE public.event_participations ep
  SET participation_status = 'rejected',
      updated_at = now()
  FROM public.events e
  WHERE ep.event_id = e.event_id
    AND ep.participation_id = p_participation_id
    AND e.created_by_user_id = v_caller_id
    AND ep.participation_status = 'requested'
    AND e.event_status = 'scheduled'
    AND (e.end_at >= now() OR (e.end_at IS NULL AND e.start_at >= now()))
  RETURNING ep.event_id INTO v_event_id;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Reject failed. Request may have been cancelled or event is ineligible.';
  END IF;

  RETURN v_event_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reject_event_participant(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_event_participant(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.reject_event_participant(uuid) TO authenticated;
