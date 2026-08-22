# Storage handoff

The authoritative logical state at export time was:

| Bucket | Public | Metadata objects |
| --- | ---: | ---: |
| `avatars` | yes | 0 |
| `event-posters` | yes | 0 |
| `chat-images` | no | 0 |

No current application row references a local Supabase Storage URL/path.
Current avatars and posters resolve to version-controlled files under
`public/`.

Docker's Storage volume nevertheless contained 10 old unreferenced bytes (7
under `avatars`, 3 under `event-posters`). They were copied into
`orphaned-files/` using their logical bucket/object paths, and their source
internal version IDs and SHA-256 hashes are recorded in
`orphaned-files-manifest.json`.

These files are retained only so no local bytes are silently lost. Do not
restore them unless matching `storage.objects` metadata is deliberately created
in a future recovery task. The default exact-current-state restore correctly
leaves `storage.objects` empty.
