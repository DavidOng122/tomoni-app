# Exact current local Supabase state

This directory complements, but does not replace, `supabase/migrations/`.

## Contents

- `database/local_public_data.sql` — current rows from all 12 `public` tables.
- `auth/local_auth_data.sql` — local development `auth.users` and
  `auth.identities` only. It contains password hashes for local throwaway
  accounts, so keep the repository private.
- `storage/local_storage_metadata.sql` — the three current bucket definitions;
  `storage.objects` has no rows.
- `storage/orphaned-files/` — forensic copy of 10 unreferenced volume blobs;
  not restored by default.
- `storage/orphaned-files-manifest.json` — logical path, size, internal version,
  and SHA-256 for those blobs.
- `verification/` — original/restored counts and status distributions from the
  mandatory clean restore test.

Excluded on purpose:

- Auth sessions and refresh tokens
- MFA and one-time tokens
- JWT/signing secrets
- Supabase service-role/anon/publishable keys
- database passwords
- `.env.local`

## Tested restore

From the repository root with Docker running:

```powershell
npx supabase start
powershell -ExecutionPolicy Bypass -File scripts/restore-local-handoff.ps1 -ResetDatabase
```

The script refuses to run without the destructive-intent
`-ResetDatabase` switch and targets only the local container derived from
`supabase/config.toml`.

See `HANDOFF.md` for complete setup, demo accounts, Open Data, and product-rule
notes.
