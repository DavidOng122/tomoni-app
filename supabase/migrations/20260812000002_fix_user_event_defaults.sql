CREATE OR REPLACE FUNCTION public.create_user_event(
  p_title text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_place_id text DEFAULT NULL,
  p_place_name text DEFAULT '',
  p_address text DEFAULT NULL,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_approval_required boolean DEFAULT false,
  p_capacity integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_new_event_id uuid;
  v_uid uuid;
BEGIN
  -- 1. Get current authenticated user
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Validate essential fields
  IF trim(p_title) = '' THEN
    RAISE EXCEPTION 'Title cannot be empty';
  END IF;

  IF p_start_at IS NULL OR p_end_at IS NULL THEN
    RAISE EXCEPTION 'Start and end times are required';
  END IF;

  IF p_end_at <= p_start_at THEN
    RAISE EXCEPTION 'End time must be after start time';
  END IF;

  IF trim(p_place_name) = '' THEN
    RAISE EXCEPTION 'Place name is required';
  END IF;

  -- 3. Insert secure values
  INSERT INTO public.events (
    event_type,
    created_by_user_id,
    title,
    start_at,
    end_at,
    place_id,
    place_name,
    address,
    latitude,
    longitude,
    description,
    approval_required,
    capacity,
    looking_for_participants,
    event_status,
    registration_required,
    registration_status
  ) VALUES (
    'user_created',
    v_uid,
    trim(p_title),
    p_start_at,
    p_end_at,
    p_place_id,
    trim(p_place_name),
    p_address,
    p_latitude,
    p_longitude,
    NULLIF(trim(p_description), ''),
    p_approval_required,
    p_capacity,
    true, 
    'scheduled',
    false,
    'not_required'
  )
  RETURNING event_id INTO v_new_event_id;

  RETURN v_new_event_id;
END;
$$;
