# Edogawa official event importer

## Scope

This importer reads official public event information from Edogawa City's Event Calendar and event detail pages. The source is public official information; it is not described as a downloadable Open Data CSV dataset.

The importer only handles events that can be represented by the existing single `start_at` / `end_at` event model. It does not implement geocoding or event occurrences. An exact normalized venue-name/address match can attach an event to an existing official `public_places` row for Fixed Plan recommendations; ambiguous and unmatched venues remain unlinked and are reported.

For Event Fixed Plans, deterministic recommendation tags are intentionally narrow: exhibitions/art,
film, and music performances. General workshops, community festivals, flea markets, health content,
and administrative events remain valid imported events but do not enter this recommendation pool.
No AI classification is used.

## Source identity

Imported records use:

```text
source_dataset_id = edogawa_event_calendar
source_event_id   = visible ページID
```

The database unique constraint on `(source_dataset_id, source_event_id)` makes repeated imports update the existing record. Import payloads never contain `event_id` or `created_at`, so the database-generated UUID remains stable.

## Commands

Dry-run is the default and does not create a Supabase client or require Supabase credentials:

```bash
npm run open-data:edogawa-events -- --month 2026-09 --dry-run
```

Write a normalized review report without saving source HTML:

```bash
npm run open-data:edogawa-events -- \
  --month 2026-09 \
  --dry-run \
  --output ./tmp/edogawa-events-2026-09.json
```

Write mode must be explicitly requested:

```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
npm run open-data:edogawa-events -- --month 2026-09 --write
```

Never prefix the service-role key with `NEXT_PUBLIC_`. The write client is only dynamically loaded after parsing, validation, accounting, and duplicate detection have succeeded.

## Accepted source shape

The first version accepts:

- one event with a reliable start date and time;
- an optional same-day end time;
- one continuous cross-day range;
- a start time without an end time;
- a non-empty title and place name;
- a visible numeric `#tmp_pageid`.

It skips:

- date-only events without a reliable start time;
- multiple independent dates or periods;
- repeated sessions such as `全6回` or `各日`;
- malformed dates and unsupported page templates.

The parser reads semantic H2/H3 labels. It does not depend on section position and does not use regular expressions to parse HTML. A hidden `page_id`, when present, is only a consistency check against the visible page ID.

## Skip reasons

```text
missing_source_event_id
missing_title
missing_start_at
missing_place_name
multiple_occurrences
invalid_datetime
unsupported_page_format
```

Fetch failures and page-ID mismatches are parse errors rather than domain skips. Duplicate identities are reported separately and abort write mode before any Supabase connection or write.

## Time and status rules

- Source times are interpreted in `Asia/Tokyo` and stored as ISO timestamps with `+09:00`.
- A date-only source update is represented as midnight in Tokyo on that date. This preserves source date precision; it is not an assertion about the exact update time.
- A registration deadline is stored only when the source provides an end date and time.
- Date-only application periods can determine `not_started`, `open`, or `closed` using inclusive Tokyo calendar days, without inventing a database deadline.
- `full` requires explicit full/capacity-reached wording.
- Cancellation, postponement, and rescheduling use a controlled set of explicit source notices. No AI classification is used.
- A past event with no reliable end time is `unknown`, not automatically `ended`.

## Report accounting

Every discovered detail URL has exactly one final classification:

```text
discovered = accepted + skipped + duplicate + parseErrors
```

Raw HTML is not saved by the importer. Sanitized, minimal HTML exists only under `tests/fixtures/edogawa-events`.

## Dependency record

Name: Cheerio

Responsibility: Parse server-side HTML into a DOM for semantic section extraction.

Used by: The Edogawa calendar and detail-page adapters only.

Why existing capabilities are insufficient: Node.js `fetch` provides response text but not a server-side HTML DOM parser. Parsing HTML with regular expressions would be brittle.

Alternative: A different maintained server-side DOM parser.

Deployment impact: The CLI requires Cheerio at runtime. It is not imported by browser components.

Removal: Replace the two source adapter parsers and remove the package dependency.

## Local database integration test

The integration test refuses non-local URLs and is opt-in:

```bash
RUN_SUPABASE_EVENT_IMPORT_INTEGRATION=1 \
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=... \
node --test tests/events/upsertOfficialEvents.integration.test.mjs
```

It verifies stable UUID upserts, an attached participation foreign key, unique identity enforcement, nullable source identity for user-created events, and rejection of source identity on user-created events.

## Fixed Plan recommendation behavior

- Official events remain subject to the future 24-hour/60-day window, shared weekday, both plan
  times within 120 minutes, scheduled status, supported registration status, and exact venue link.
- Event destination distance is a soft ranking signal only; an Edogawa event or curated destination
  is not removed because it is more than 5km from either broad activity-area reference point.
- Real eligible events fill the Top 3 first. Remaining slots use curated exhibition, aquarium, zoo,
  museum, or cinema destinations from `public_places`.
- Recommendation tags are intentionally limited to `art_exhibition`, `film`, and
  `music_performance`. Broad workshops, community festivals, and flea markets stay in the official
  event catalogue but are excluded from Fixed Plan recommendations. Exhibition content is the MVP
  focus; curated aquarium, zoo, museum, and cinema destinations provide purpose-specific alternatives.
- Event Fixed Plans ask for weekdays only. Their stored `12:00` value is a compatibility sentinel for
  the established non-null column and is neither displayed nor used by Event matching or destination
  ranking.
- The shared Top 3 is art-led: art exhibitions, reviewed exhibition spaces, museums, then film/music
  events and other curated destinations. Distance ranks candidates only inside the same focus tier.
- Selection is revalidated inside `create_fixed_schedule_invitation`; arbitrary IDs are rejected.
- Exact address, coordinates, map, and official link are released only after acceptance.
- Accepting a companion invitation never inserts `event_participations` or registers either user for
  the official event.
