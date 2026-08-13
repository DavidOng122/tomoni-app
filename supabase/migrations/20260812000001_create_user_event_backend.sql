-- 1. Create event-posters bucket securely
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'event-posters', 
  'event-posters', 
  true, 
  5242880, 
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to event-posters
CREATE POLICY "Event posters are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'event-posters');

-- Allow authenticated users to upload their own event posters
CREATE POLICY "Users can upload their own event posters" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'event-posters' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own event posters
CREATE POLICY "Users can update their own event posters" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
    bucket_id = 'event-posters' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own event posters
CREATE POLICY "Users can delete their own event posters" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
    bucket_id = 'event-posters' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Revoke broad direct INSERT and UPDATE access to events table for authenticated users
REVOKE INSERT, UPDATE ON TABLE public.events FROM authenticated;

-- 3. Create secure RPC for user_created events
CREATE OR REPLACE FUNCTION public.create_user_event(
  p_title text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_place_id text,
  p_place_name text,
  p_address text,
  p_latitude double precision,
  p_longitude double precision,
  p_description text,
  p_approval_required boolean,
  p_capacity integer
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
    registration_status,
    source_name,
    registration_url,
    registration_deadline,
    official_url
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
    true, -- looking_for_participants MVP default
    'scheduled',
    false,
    'not_required',
    NULL,
    NULL,
    NULL,
    NULL
  )
  RETURNING event_id INTO v_new_event_id;

  RETURN v_new_event_id;
END;
$$;

-- Secure the RPC
REVOKE EXECUTE ON FUNCTION public.create_user_event(text, timestamptz, timestamptz, text, text, text, double precision, double precision, text, boolean, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_user_event(text, timestamptz, timestamptz, text, text, text, double precision, double precision, text, boolean, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_user_event(text, timestamptz, timestamptz, text, text, text, double precision, double precision, text, boolean, integer) TO authenticated;


-- 4. Create secure RPC for setting event poster
CREATE OR REPLACE FUNCTION public.set_user_event_poster(
  p_event_id uuid,
  p_poster_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_creator_id uuid;
BEGIN
  -- 1. Get current authenticated user
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Verify ownership
  SELECT created_by_user_id INTO v_creator_id 
  FROM public.events 
  WHERE event_id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_creator_id != v_uid THEN
    RAISE EXCEPTION 'Forbidden: Not the event creator';
  END IF;

  -- 3. Update poster
  UPDATE public.events 
  SET poster_url = p_poster_url
  WHERE event_id = p_event_id;

END;
$$;

-- Secure the RPC
REVOKE EXECUTE ON FUNCTION public.set_user_event_poster(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_user_event_poster(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_user_event_poster(uuid, text) TO authenticated;
