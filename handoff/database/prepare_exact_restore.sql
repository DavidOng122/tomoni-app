\set ON_ERROR_STOP on

begin;

-- A normal `supabase db reset` loads the project's ordinary demo seeds. The
-- exact-current-state dump replaces that seeded state, so clear application,
-- local Auth, and Storage metadata before restoring the handoff files.
truncate table
  public.messages,
  public.conversation_members,
  public.conversations,
  public.connections,
  public.invitation_plan_pairs,
  public.invitations,
  public.event_participations,
  public.events,
  public.fixed_plans,
  public.profiles,
  public.public_places,
  public.users
restart identity cascade;

truncate table auth.users cascade;
truncate table storage.objects, storage.buckets cascade;

commit;
