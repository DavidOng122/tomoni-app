# Yorimi local developer handoff

## 1. Repository

- Repository: `https://github.com/DavidOng122/tomoni-app.git`
- Branch: `vincent`

This is a local-development handoff. Do not link this checkout to a remote
Supabase project just to restore the included state.

## 2. Tech stack

- Next.js 16 App Router, React 19, TypeScript
- Supabase CLI/local Docker stack
- PostgreSQL with PostGIS
- Supabase Auth and Storage
- Google Maps/Places for map UI

Repository migrations are the schema source of truth. Files under `handoff/`
are the current local **data** source of truth.

## 3. Required software

- Node.js 24 (`package.json` requires `>=24 <25`)
- npm
- Docker Desktop / Docker Engine with Docker Compose
- Supabase CLI (the verified environment used CLI 2.111.0)
- PowerShell for the verified one-command restore helper

Verified workstation versions were Node 24.19.0, npm 11.17.0, Docker 29.6.2,
Docker Compose 5.3.1, and Supabase CLI 2.111.0.

## 4. Clone and install

```powershell
git clone https://github.com/DavidOng122/tomoni-app.git
cd tomoni-app
git switch vincent
npm install
```

## 5. Environment

```powershell
Copy-Item .env.example .env.local
npx supabase start
npx supabase status
```

Fill `.env.local` using the values from the newly started **local** Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (needed only for Google map/Places UI)
- `SUPABASE_SERVICE_ROLE_KEY` is optional for normal app runtime and exact
  restore. It is required only for explicitly approved local importer write
  mode or backend integration tests. Never expose it to browser code.

Do not copy another developer's `.env.local`. It is intentionally ignored.

## 6. Exact current-state restore

The following command was tested from a clean local database on 2026-08-22:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/restore-local-handoff.ps1 -ResetDatabase
```

It performs these steps:

1. `npx supabase db reset` to create the schema from all repository migrations.
2. Removes the ordinary seeded state loaded by `supabase/config.toml`.
3. Restores `auth.users` and `auth.identities` from the safe local Auth export.
4. Removes only the placeholder `public.users` rows created by
   `on_auth_user_created` during Auth restore.
5. Restores all current `public` application rows.
6. Restores Storage bucket metadata.
7. Compares every important restored row count with the recorded original.

The explicit `-ResetDatabase` switch is required because this operation
replaces all data in the local Supabase instance. It never links to or writes
to a remote Supabase project.

To rerun only the count comparison:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-local-handoff.ps1
```

## 7. Demo accounts

These are throwaway local-only workflow accounts in the Auth backup:

| Account | Email | Password |
| --- | --- | --- |
| A | `demo.workflow.a@yorimi.local` | `YorimiDemo!A2026` |
| B | `demo.workflow.b@yorimi.local` | `YorimiDemo!B2026` |

Both were confirmed login-capable after the clean restore. The exact current
state has onboarding completed and one Fixed Plan for each account. Most of
the 100 recommendation-candidate users are data-only candidates and do not
have `auth.identities`, so they are not intended for interactive login.

## 8. Storage

The current logical state contains three buckets:

- `avatars` — public
- `event-posters` — public
- `chat-images` — private

`storage.objects` currently contains zero rows, and no profile, event, or
message references a local Supabase Storage object. The app's current avatars
and posters are repository assets under `public/`; all 109 distinct referenced
asset paths were verified present.

The Docker volume contained 10 unreferenced physical blobs left over from
earlier local testing. They are preserved for audit under
`handoff/storage/orphaned-files/` with a SHA-256 manifest, but the restore
script deliberately does not load them because doing so would not reproduce
the authoritative `storage.objects = 0` state.

## 9. Current demo seeds versus exact restore

`supabase/config.toml` normally loads:

- `supabase/snippets/figma_mock_seed.sql`
- `supabase/snippets/demo_candidates.sql`

A normal `npx supabase db reset` is useful for a fresh reproducible demo. It is
not the same as the exact current state. Use the restore helper when the
current users, 442 Fixed Plans, events, invitations, connections, chats, and
Open Data must be reproduced exactly.

## 10. Edogawa Open Data

The exact backup already contains the current imported data:

- 475 parks (`edogawa_parks`)
- 12 public libraries (`edogawa_public_libraries`)
- 13 sports facilities (`edogawa_sports_facilities`)
- 4 selected recreation/event destinations (`edogawa_recreation_destinations`)
- 4 imported official event-calendar rows plus one legacy official event

Do not rerun importers merely to restore this snapshot. Importers default to
dry-run and use deterministic source identities for idempotent upsert.

Review current source data without writing:

```powershell
npm run open-data:edogawa-public-places -- --dataset all --dry-run
npm run open-data:edogawa-events -- --month YYYY-MM --dry-run
npm run open-data:edogawa-flea-markets -- --dry-run
```

Local write mode requires an explicitly supplied local service-role key and an
explicit `--write` flag. Never use it against a remote project without separate
approval.

## 11. Run the app

```powershell
npm run dev
```

Open `http://localhost:3000`.

## 12. Verification

```powershell
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

Integration test groups that require local Supabase are opt-in; see the test
files for their environment switches. The handoff restore itself performs a
real local database comparison.

## 13. Core product rules

### Fixed Plan matching

- Normal Fixed Plan: same activity + shared weekday + (distance nearby OR time
  nearby).
- Event Fixed Plan: same activity + shared weekday; user-to-user distance/time
  are not hard filters.

### Plan Pair

- `pending`, `accepted`, or `declined` blocks the same direction-independent
  exact Plan Pair.
- `cancelled` or `expired` permits retry.
- Different Plan Pairs between the same users remain eligible.

### Connection and lifecycle

- Accepted companion relationships aggregate into a user-level Connection.
- Archiving a plan cancels related pending invitations.
- Accepted companion relationships survive plan archive.
- Historical invitation display is snapshot-first.

### Events

- The creator automatically participates.
- Capacity is enforced as a hard database limit.
- An active Connection from event companionship is not a global exclusion from
  other matching.

## 14. Known limitations

- The 10 orphaned Storage-volume blobs are not logical Storage objects and are
  not restored by default; see the Storage section above.
- Auth sessions and refresh tokens are intentionally excluded. Developers sign
  in again after restore.
- Lint currently completes with no errors and existing non-blocking warnings,
  mainly Next.js recommendations to migrate raw `<img>` usage.
