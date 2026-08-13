-- 1. Create get_same_event_people RPC
CREATE OR REPLACE FUNCTION public.get_same_event_people(p_event_id uuid)
RETURNS TABLE (
  user_id uuid,
  nickname text,
  avatar_url text,
  compatibility_label text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id uuid;
  v_event_status text;
  v_event_start_at timestamptz;
  v_event_end_at timestamptz;
  v_caller_participation public.event_participations%ROWTYPE;
  v_caller_ts timestamptz;
BEGIN
  -- 1. Identity Check
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Event Eligibility Check (same temporal check as join_event)
  SELECT event_status, start_at, end_at
  INTO v_event_status, v_event_start_at, v_event_end_at
  FROM public.events
  WHERE event_id = p_event_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_event_status != 'scheduled' THEN
    RETURN;
  END IF;

  IF (v_event_end_at IS NOT NULL AND v_event_end_at < now()) OR
     (v_event_end_at IS NULL AND v_event_start_at < now()) THEN
    RETURN;
  END IF;

  -- 3. Caller Eligibility Check
  SELECT *
  INTO v_caller_participation
  FROM public.event_participations
  WHERE event_id = p_event_id 
    AND user_id = v_caller_id;

  IF NOT FOUND OR 
     v_caller_participation.participation_status != 'going' OR
     v_caller_participation.participation_date IS NULL OR
     v_caller_participation.arrival_time IS NULL THEN
    RETURN;
  END IF;

  v_caller_ts := (v_caller_participation.participation_date + v_caller_participation.arrival_time) AT TIME ZONE 'Asia/Tokyo';

  -- 4. Candidate Query
  RETURN QUERY
  SELECT 
    p.user_id,
    p.nickname,
    p.avatar_url,
    CASE 
      WHEN abs(extract(epoch from ((ep.participation_date + ep.arrival_time) AT TIME ZONE 'Asia/Tokyo' - v_caller_ts))) / 60 <= 15 THEN '同じ時間帯'
      ELSE '近い時間に参加予定'
    END AS compatibility_label
  FROM public.event_participations ep
  JOIN public.profiles p ON p.user_id = ep.user_id
  WHERE ep.event_id = p_event_id
    AND ep.participation_status = 'going'
    AND ep.user_id != v_caller_id
    AND ep.participation_date IS NOT NULL
    AND ep.arrival_time IS NOT NULL
    AND p.profile_status = 'active'
    -- Exclusion 1: Active existing connection in either direction
    AND NOT EXISTS (
      SELECT 1 FROM public.connections c
      WHERE c.connection_status = 'active'
        AND ((c.user_a_id = v_caller_id AND c.user_b_id = ep.user_id) OR
             (c.user_a_id = ep.user_id AND c.user_b_id = v_caller_id))
    )
    -- Exclusion 2: Pending event invitation for THIS event in either direction
    AND NOT EXISTS (
      SELECT 1 FROM public.invitations i
      WHERE i.event_id = p_event_id
        AND i.invitation_type = 'event'
        AND i.invitation_status = 'pending'
        AND ((i.sender_user_id = v_caller_id AND i.receiver_user_id = ep.user_id) OR
             (i.sender_user_id = ep.user_id AND i.receiver_user_id = v_caller_id))
    )
    -- Threshold filter: absolute difference <= 60 minutes
    AND abs(extract(epoch from ((ep.participation_date + ep.arrival_time) AT TIME ZONE 'Asia/Tokyo' - v_caller_ts))) / 60 <= 60
  ORDER BY 
    abs(extract(epoch from ((ep.participation_date + ep.arrival_time) AT TIME ZONE 'Asia/Tokyo' - v_caller_ts))) ASC,
    ep.user_id ASC
  LIMIT 5;

END;
$$;

-- Secure the RPC execution
REVOKE EXECUTE ON FUNCTION public.get_same_event_people(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_same_event_people(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_same_event_people(uuid) TO authenticated;
