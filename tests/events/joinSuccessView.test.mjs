import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { getEventSuccessCandidates } from '../../src/features/events/domain/getEventSuccessCandidates.ts';

test('uses only the first three Supabase candidates in the success design', () => {
  const candidates = Array.from({ length: 5 }, (_, index) => ({
    user_id: `user-${index + 1}`,
    nickname: `User ${index + 1}`,
    avatar_url: `/avatar-${index + 1}.png`,
    compatibility_label: '同じ時間帯',
  }));

  assert.deepEqual(
    getEventSuccessCandidates(candidates).map((candidate) => candidate.user_id),
    ['user-1', 'user-2', 'user-3'],
  );
});

test('fetches existing matching logic after joining and renders Supabase candidate fields', async () => {
  const action = await readFile(
    new URL('../../src/app/actions/joinEventWithPlan.ts', import.meta.url),
    'utf8',
  );
  const view = await readFile(
    new URL('../../src/app/events/[eventId]/join/JoinEventView.tsx', import.meta.url),
    'utf8',
  );
  const page = await readFile(
    new URL('../../src/app/events/[eventId]/join/page.tsx', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(action, /redirect\(/);
  assert.match(action, /return \{ success: true \}/);
  assert.match(view, /window\.location\.assign\(`\/events\/\$\{event\.event_id\}\/join\?completed=1`\)/);
  assert.match(page, /supabase\.rpc\('get_same_event_people'/);
  assert.match(page, /getEventSuccessCandidates/);
  assert.match(view, /candidate\.avatar_url/);
  assert.match(view, /candidate\.nickname/);
  assert.match(view, /candidate\.compatibility_label/);
  assert.match(view, /createEventInvitationAction/);
  assert.match(view, /参加申込が完了しました/);
});

test('opens the participant invitation screen instead of joining an event group chat', async () => {
  const detailView = await readFile(
    new URL('../../src/app/events/[eventId]/EventDetailView.tsx', import.meta.url),
    'utf8',
  );

  assert.match(detailView, /router\.push\(`\/events\/\$\{event\.event_id\}\/people`\)/);
  assert.match(detailView, /同じ時間に参加する人を見る/);
  assert.doesNotMatch(detailView, /joinEventGroupChat/);
  assert.doesNotMatch(detailView, /router\.push\(`\/chat\/\$\{result\.conversationId\}`\)/);
});

test('joins event candidates through the current profiles user_id schema', async () => {
  const migration = await readFile(
    new URL(
      '../../supabase/migrations/20260817020000_fix_same_event_people_profile_join.sql',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(migration, /profile\.user_id\s*=\s*candidate\.user_id/);
  assert.doesNotMatch(migration, /profile\.id\s*=\s*candidate\.user_id/);
  assert.match(migration, /invitation\.invitation_type\s*=\s*'event'/);
});

test('ranks the three strongest eligible candidates by shared interests and plan reasons', async () => {
  const migration = await readFile(
    new URL(
      '../../supabase/migrations/20260822190000_resolve_event_companion_and_capacity_conflicts.sql',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(migration, /cardinality\(scored\.shared_tags\)/);
  assert.match(migration, /scored\.has_same_activity::integer/);
  assert.match(migration, /scored\.has_same_plan_time::integer/);
  assert.match(migration, /scored\.is_nearby::integer/);
  assert.match(migration, /scored\.has_shared_days::integer/);
  assert.match(migration, /\) desc,[\s\S]*event_time_difference_seconds asc/);
  assert.match(migration, /limit 3;/);
  assert.doesNotMatch(migration, /connection\.connection_status\s*=\s*'active'/);
  assert.match(migration, /invitation\.invitation_type\s*=\s*'event'/);
  assert.match(migration, /invitation\.invitation_status in \('pending', 'accepted', 'declined'\)/);
  assert.match(migration, /public\.is_active_product_user\(candidate\.user_id\)/);
});
