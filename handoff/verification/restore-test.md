# Clean restore verification — 2026-08-22

The backup was created and inspected before any reset. Then this command was
run against local Supabase only:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/restore-local-handoff.ps1 -ResetDatabase
```

All repository migrations through
`20260822220000_enforce_user_event_lifecycle.sql` applied from scratch. Auth,
public application data, and Storage bucket metadata restored without SQL
errors.

| Data | Original | Restored | Match |
| --- | ---: | ---: | --- |
| auth.users | 113 | 113 | YES |
| auth.identities | 9 | 9 | YES |
| public.users | 113 | 113 | YES |
| public.profiles | 113 | 113 | YES |
| public.fixed_plans | 442 | 442 | YES |
| public.events | 6 | 6 | YES |
| public.event_participations | 17 | 17 | YES |
| public.invitations | 14 | 14 | YES |
| public.invitation_plan_pairs | 14 | 14 | YES |
| public.connections | 6 | 6 | YES |
| public.conversations | 13 | 13 | YES |
| public.conversation_members | 26 | 26 | YES |
| public.messages | 3 | 3 | YES |
| public.public_places | 504 | 504 | YES |
| storage.buckets | 3 | 3 | YES |
| storage.objects | 0 | 0 | YES |

Event, invitation, connection, conversation, and event-participation status
distributions also matched exactly. The two documented workflow accounts
successfully authenticated after restore. With account A, authenticated API/RLS
checks returned an active Fixed Plan, 20 Discover recommendations, existing
invitation/conversation state, 6 scheduled events, and 504 public places.

All 109 distinct currently referenced local avatar/poster paths existed in the
repository. No current row referenced a Supabase Storage object.
