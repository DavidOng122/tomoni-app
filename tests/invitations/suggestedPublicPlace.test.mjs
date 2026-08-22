import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { getPublicPlaceImageUrl } from '../../src/features/public-places/domain/getPublicPlaceImageUrl.ts';

const migration = await readFile(
  new URL('../../supabase/migrations/20260821060000_add_suggested_public_place.sql', import.meta.url),
  'utf8',
);
const dogWalkingMigration = await readFile(
  new URL('../../supabase/migrations/20260822030000_restore_invitation_eligibility_guard.sql', import.meta.url),
  'utf8',
);
const dogWalkingBackfillMigration = await readFile(
  new URL('../../supabase/migrations/20260822040000_backfill_dog_walking_suggested_parks.sql', import.meta.url),
  'utf8',
);
const snapshotLifecycleMigration = await readFile(
  new URL('../../supabase/migrations/20260822170000_fixed_plan_snapshot_archive_lifecycle.sql', import.meta.url),
  'utf8',
);
const chatPage = await readFile(
  new URL('../../src/app/chat/[conversationId]/page.tsx', import.meta.url),
  'utf8',
);
const chatClient = await readFile(
  new URL('../../src/app/chat/[conversationId]/ChatClient.tsx', import.meta.url),
  'utf8',
);
const acceptedPage = await readFile(
  new URL('../../src/app/connections/plans/[conversationId]/page.tsx', import.meta.url),
  'utf8',
);
const acceptedView = await readFile(
  new URL('../../src/app/connections/plans/[conversationId]/AcceptedPlanDetailView.tsx', import.meta.url),
  'utf8',
);

test('persists one nullable suggested public place on the exact invitation plan pair', () => {
  assert.match(migration, /add column suggested_public_place_id uuid[\s\S]+references public\.public_places\(public_place_id\)/iu);
  assert.doesNotMatch(migration, /create table public\.(?:meetups|meetup_responses)/iu);
});

test('uses only qualifying large parks within 3.2km of both activity areas', () => {
  assert.match(migration, /place\.category = 'park'/iu);
  assert.match(migration, /large_park_candidate\}' = 'true'/iu);
  assert.match(migration, /area_square_meters[\s\S]+>= 10000/iu);
  assert.equal((migration.match(/st_dwithin/giu) ?? []).length, 2);
  assert.equal((migration.match(/3200/gu) ?? []).length, 2);
  assert.doesNotMatch(migration, /waterfront_park|waterfront_greenway|library|sports_facility/iu);
});

test('ranking minimizes worst distance, then total distance, then stable id', () => {
  assert.match(
    migration,
    /order by\s+greatest\(eligible\.sender_distance_meters, eligible\.receiver_distance_meters\),\s+eligible\.sender_distance_meters \+ eligible\.receiver_distance_meters,\s+eligible\.public_place_id\s+limit 1/iu,
  );
});

test('keeps Discover eligibility at 3km and recommends parks for walking and dog walking', () => {
  const invitationFunction = dogWalkingMigration.slice(
    dogWalkingMigration.indexOf('create or replace function public.create_fixed_schedule_invitation'),
  );
  assert.match(invitationFunction, /\/ 1000\.0 <= 3\.0/iu);
  assert.match(invitationFunction, /if not found then\s+raise exception 'Receiver plan is not eligible for this fixed plan'/iu);
  assert.match(invitationFunction, /if v_sender_activity_type in \('walking', 'dog_walking'\) then/iu);
  assert.match(invitationFunction, /v_suggested_public_place_id/iu);
});

test('keeps invitation creation successful when the recommendation is null and freezes idempotent retries', () => {
  const createFunction = snapshotLifecycleMigration.slice(
    snapshotLifecycleMigration.indexOf('create or replace function public.create_fixed_schedule_invitation'),
    snapshotLifecycleMigration.indexOf('-- 5.'),
  );

  assert.match(migration, /suggested_public_place_id\s+\) values[\s\S]+v_suggested_public_place_id/iu);
  assert.match(migration, /on conflict \(invitation_id\) do nothing/iu);
  assert.match(createFunction, /v_blocking_invitation\.invitation_status = 'pending'/iu);
  assert.match(createFunction, /'suggested_public_place_id', v_blocking_invitation\.suggested_public_place_id/iu);
  assert.match(createFunction, /'suggested_event_id', v_blocking_invitation\.suggested_event_id/iu);
  assert.doesNotMatch(createFunction, /update public\.invitation_plan_pairs[\s\S]+suggested_public_place_id/iu);
  assert.doesNotMatch(migration, /raise exception[^;]+suggested/iu);
});

test('backfills only legacy dog-walking pairs with a qualifying park', () => {
  assert.match(dogWalkingBackfillMigration, /sender_plan\.activity_type = 'dog_walking'/iu);
  assert.match(dogWalkingBackfillMigration, /receiver_plan\.activity_type = 'dog_walking'/iu);
  assert.match(dogWalkingBackfillMigration, /cross join lateral public\.recommend_walking_public_place/iu);
  assert.match(dogWalkingBackfillMigration, /where pair\.suggested_public_place_id is null/iu);
  assert.doesNotMatch(dogWalkingBackfillMigration, /coalesce|default|fallback/iu);
});

test('pending invitation separates activity areas from the suggested park', () => {
  assert.match(chatPage, /get_fixed_plan_invitation_suggested_place/iu);
  assert.match(chatPage, /from\('public_places'\)[\s\S]+select\('attributes'\)/iu);
  assert.match(chatClient, /sender_area_name/iu);
  assert.match(chatClient, /receiver_area_name/iu);
  assert.match(chatClient, /imageUrl: string \| null/iu);
  assert.match(chatClient, /className=\{styles\.invitationSummary\}/iu);
  assert.doesNotMatch(chatClient, /className=\{styles\.invitationSummaryLabel\}/iu);
  assert.doesNotMatch(chatClient, /<h3>\{ctx\.activityLabel\}<\/h3>/iu);
  assert.match(chatClient, /SuggestedPlaceVisual/iu);
  assert.match(chatClient, /おすすめの場所/iu);
  assert.match(chatClient, /集合場所は同行成立後に確定します/iu);
  assert.match(chatClient, /同行成立後に集合場所を確認できます/iu);
  assert.doesNotMatch(chatClient, /event-walk\.png/iu);
  assert.match(migration, /invitation\.invitation_status = 'accepted' then place\.latitude/iu);
  assert.match(migration, /invitation\.invitation_status = 'accepted' then place\.longitude/iu);
});

test('uses only a trusted Edogawa park photo and upgrades legacy HTTP URLs', () => {
  assert.equal(
    getPublicPlaceImageUrl({
      walking_place: {
        image_urls: ['http://www.city.edogawa.tokyo.jp/edg/park/20140807_30.jpg'],
      },
    }),
    'https://www.city.edogawa.tokyo.jp/edg/park/20140807_30.jpg',
  );
  assert.equal(
    getPublicPlaceImageUrl({
      walking_place: {
        image_urls: ['https://untrusted.example/park.jpg'],
      },
    }),
    null,
  );
  assert.equal(getPublicPlaceImageUrl({ walking_place: {} }), null);
});

test('uses the official Edogawa library image for study and reading suggestions', () => {
  assert.equal(
    getPublicPlaceImageUrl({
      media: {
        image_url: 'https://www.library.city.edogawa.tokyo.jp/toshow/introduction/images/chuo_01.jpg',
      },
    }),
    'https://www.library.city.edogawa.tokyo.jp/toshow/introduction/images/chuo_01.jpg',
  );
  assert.equal(
    getPublicPlaceImageUrl({ media: { image_url: 'https://untrusted.example/library.jpg' } }),
    null,
  );
});

test('uses the official Edogawa sports facility image for sports suggestions', () => {
  assert.equal(
    getPublicPlaceImageUrl({
      media: {
        image_url: 'http://www.city.edogawa.tokyo.jp/edg/map/sports/01.jpg',
      },
    }),
    'https://www.city.edogawa.tokyo.jp/edg/map/sports/01.jpg',
  );
});

test('accepted detail uses public-place coordinates and keeps both activity areas visible', () => {
  assert.match(acceptedPage, /suggested_place_latitude/iu);
  assert.match(acceptedPage, /suggested_place_longitude/iu);
  assert.match(acceptedView, /activityAreas\.sender\} × \{activityAreas\.receiver/iu);
  assert.match(acceptedView, /latitude=\{suggestedPlace\.latitude\}/iu);
  assert.match(acceptedView, /longitude=\{suggestedPlace\.longitude\}/iu);
  assert.doesNotMatch(acceptedView, /latitude=\{plan\.latitude\}|longitude=\{plan\.longitude\}/iu);
  assert.match(acceptedView, /入口の位置とは限りません/iu);
  assert.match(acceptedView, /おすすめできる大型公園が見つかりませんでした/iu);
});

test('event invitation functions are outside the migration scope', () => {
  assert.doesNotMatch(migration, /create or replace function public\.(?:create|accept|decline|cancel)_event_invitation/iu);
});
