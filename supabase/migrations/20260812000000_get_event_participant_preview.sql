CREATE OR REPLACE FUNCTION public.get_event_participant_preview(p_event_id uuid)
RETURNS TABLE (
  participant_count integer,
  user_id uuid,
  nickname text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id uuid;
  v_is_readable boolean;
  v_total_count integer;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Visibility Check
  -- Re-implement `events_select_scheduled` RLS logic locally
  SELECT true INTO v_is_readable
  FROM public.events
  WHERE event_id = p_event_id
    AND (event_status = 'scheduled' OR created_by_user_id = v_caller_id);

  IF v_is_readable IS NULL OR NOT v_is_readable THEN
    RETURN QUERY SELECT 0::integer, NULL::uuid, NULL::text, NULL::text;
    RETURN;
  END IF;

  -- 2. Count ALL "going" participations regardless of profile status
  SELECT (COUNT(*))::integer INTO v_total_count
  FROM public.event_participations ep
  WHERE ep.event_id = p_event_id
    AND ep.participation_status = 'going';

  -- 3. Return preview users (active profiles only) and guarantee at least one row
  IF v_total_count = 0 THEN
    RETURN QUERY SELECT 0::integer, NULL::uuid, NULL::text, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    v_total_count,
    p.user_id,
    p.nickname,
    p.avatar_url
  FROM public.event_participations ep
  JOIN public.profiles p ON p.user_id = ep.user_id
  WHERE ep.event_id = p_event_id
    AND ep.participation_status = 'going'
    AND p.profile_status = 'active'
  ORDER BY ep.created_at ASC, ep.participation_id ASC
  LIMIT 3;

  -- If total > 0 but NO active profiles, the above RETURN QUERY returns 0 rows.
  -- We MUST guarantee at least one row is returned.
  IF NOT FOUND THEN
    RETURN QUERY SELECT v_total_count, NULL::uuid, NULL::text, NULL::text;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_event_participant_preview(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_event_participant_preview(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_event_participant_preview(uuid) TO authenticated;
