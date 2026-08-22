# Edogawa public-place importer

`--dataset all` is the Yorimi product default, not every implemented adapter. It imports parks,
libraries, sports facilities, and the currently approved selected destinations. Waterfront parks,
waterfront greenways, and the ordinary cultural-facility feed require an explicit dataset flag.

## Scope

This importer normalizes official Edogawa public facility information into `public.public_places`.
It does not modify Meet Card, geocode source records, create a nearby-search RPC, or delete records
that are absent from one source snapshot.

## Sources and identity

### Sports facilities

- Dataset ID: `edogawa_sports_facilities`
- Scope: 13 records in the official Edogawa map CSV.
- Coordinates: official map CSV.
- Hours and facility attributes: Tokyo Open Data standard sports CSV when a deterministic name or
  reviewed alias match exists.
- Stable source ID: the visible numeric `#tmp_pageid` on the official Edogawa facility detail page.

### Public libraries

- Dataset ID: `edogawa_public_libraries`
- Scope: 12 formal library/community-library records that match one-to-one across the standard and
  map CSV files.
- Coordinates: official map CSV.
- Official name, hours, and facility attributes: Tokyo Open Data standard library CSV.
- Stable source ID: the canonical official detail URL path.
- Ten school-library satellite points are reported as `unsupported_record` and are not imported.

Names and addresses are normalized only for deterministic cross-source matching. They are never
used as the stored machine identity. No fuzzy matching is used.

### Event destinations

- `edogawa_cultural_facilities`: all 39 official culture/community rows are retained, but only the
  deterministic `exhibition_space` subset uses `category = cultural_facility`; ordinary halls and
  community facilities use `category = community_facility` and do not enter Event recommendations.
- Recreation destination photos prefer the CSV image field. When it is empty, the importer uses a
  reviewed, destination-specific representative image from that destination's official page; it never
  substitutes a shared generic outing image.
- `edogawa_recreation_destinations`: the official recreation CSV is curated by exact official name.
  The Event recommendation pool contains 葛西臨海水族園, 自然動物園, 地下鉄博物館, and 船堀シネパル.
  Garden, pony-land, observation-wheel, and service-centre rows are reported as
  `unsupported_record`, not guessed into the product taxonomy.
- Both datasets use the canonical official URL path as stable source identity and keep official
  address, coordinates, URL, and image data.

## Commands

Dry-run is the default. It does not create a Supabase client and does not require service-role
credentials:

```bash
npm run open-data:edogawa-public-places -- --dry-run
npm run open-data:edogawa-public-places -- --dataset sports --dry-run
npm run open-data:edogawa-public-places -- --dataset libraries --dry-run
npm run open-data:edogawa-public-places -- --dataset cultural --dry-run
npm run open-data:edogawa-public-places -- --dataset destinations --dry-run
```

Write a normalized review report:

```bash
npm run open-data:edogawa-public-places -- \
  --dataset all \
  --dry-run \
  --output ./tmp/edogawa-public-places.json
```

Write mode is never the default:

```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
npm run open-data:edogawa-public-places -- --dataset all --write
```

Never expose the service-role key through a `NEXT_PUBLIC_` variable. The write client is dynamically
loaded only after fetch, parsing, normalization, validation, accounting, duplicate detection, and
MVP acceptance checks succeed.

## Report accounting

Each map CSV place receives one final classification:

```text
discovered = accepted + skipped + duplicate + parseErrors
```

Reports include per-dataset and total counts, unknown headers, unmatched source rows, ambiguous
matches, skip evidence, and normalized accepted records. Fatal CSV fetch/format failures exit with a
non-zero status instead of inventing row-level accounting.

## Database behavior

The unique constraint on `(source_dataset_id, source_place_id)` makes repeated imports update the
same row. Upsert payloads never contain `public_place_id`, `created_at`, or the generated
`location_point`, so the database-generated UUID remains stable.

The table exposes SELECT only to authenticated clients. Normal authenticated and anonymous clients
cannot write; the server-only service-role importer can insert and update.

## Data-quality policy

- Map CSV coordinates are authoritative for this MVP.
- Missing, malformed, or out-of-area coordinates are skipped; coordinates are never invented or
  silently swapped.
- Source-specific attributes use reviewed English snake_case keys.
- Arbitrary Japanese headers never enter `attributes`.
- Unknown headers and unrecognized source values are reported for manual review.
- `source_updated_at` remains null because current source rows do not expose a reliable per-record
  update timestamp.

## Dependency record

Name: `csv-parse`

Responsibility: standards-compliant CSV parsing for BOMs, quoted commas, quoted newlines, and strict
column handling.

Runtime impact: importer CLI only. Node.js 24's built-in `TextDecoder("shift_jis")` handles the map
CSV encoding, so no additional encoding dependency is required.

Removal: replace the shared CSV parser and both source adapters, then remove the package dependency.

## Local integration test

The database integration test refuses non-local Supabase URLs and is opt-in:

```bash
RUN_SUPABASE_PUBLIC_PLACES_INTEGRATION=1 \
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=... \
SUPABASE_ANON_KEY=... \
node --test tests/public-places/upsertPublicPlaces.integration.test.mjs
```

It verifies stable UUID upserts, unique source identity, generated PostGIS geography, the GiST index,
RLS read/write behavior, `ST_DWithin` filtering, and nearest ordering.
