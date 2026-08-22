\set ON_ERROR_STOP on

-- Restoring auth.users correctly fires on_auth_user_created. The public.users
-- rows in the application dump are the authoritative current-state copies, so
-- remove only the trigger-created placeholders before loading public data.
truncate table public.users cascade;
