import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(
  new URL('../../supabase/migrations/20260817010000_archive_fixed_plan.sql', import.meta.url),
  'utf8',
);
const acceptedCancellationMigration = await readFile(
  new URL('../../supabase/migrations/20260822100000_cancel_accepted_fixed_plan.sql', import.meta.url),
  'utf8',
);
const myPageView = await readFile(
  new URL('../../src/app/mypage/MyPageView.tsx', import.meta.url),
  'utf8',
);

test('archives a fixed plan without physically deleting it', () => {
  assert.match(migration, /plan_status\s*=\s*'deleted'/);
  assert.doesNotMatch(migration, /delete\s+from\s+public\.fixed_plans/i);
});

test('cancels only pending invitations when their plan is archived', () => {
  assert.match(migration, /invitation_status\s*=\s*'cancelled'/);
  assert.match(migration, /invitation_status\s*=\s*'pending'/);
  assert.match(migration, /conversation_status\s*=\s*'closed'/);
});

test('keeps delete outside the editable fixed-plan card and opens an app dialog', () => {
  const cardEnd = myPageView.indexOf('</button>', myPageView.indexOf('className={styles.planCard}'));
  const deleteButton = myPageView.indexOf('className={styles.deletePlanButton}');

  assert.ok(cardEnd > -1);
  assert.ok(deleteButton > cardEnd);
  assert.doesNotMatch(myPageView, /window\.confirm/);
  assert.match(myPageView, /role="dialog"/);
  assert.match(myPageView, /固定予定を削除しますか？/);
  assert.match(myPageView, /\/mypage\/schedule\/\$\{plan\.fixed_plan_id\}\/edit/);
  assert.match(myPageView, /\/connections\?tab=plans/);
});

test('keeps accepted companion cancellation as terminal history and records its actor', () => {
  assert.match(acceptedCancellationMigration, /add column cancelled_by_user_id uuid null/i);
  assert.match(acceptedCancellationMigration, /invitation_status = 'cancelled'/i);
  assert.match(acceptedCancellationMigration, /cancelled_by_user_id = v_actor_id/i);
  assert.match(acceptedCancellationMigration, /conversation_status = 'closed'/i);
  assert.doesNotMatch(
    acceptedCancellationMigration,
    /delete\s+from\s+public\.(?:invitations|conversations)/i,
  );
});

test('allows either participant to cancel accepted plans while preserving pending withdrawal rules', () => {
  assert.match(
    acceptedCancellationMigration,
    /invitation_status = 'pending'[\s\S]+sender_user_id <> v_actor_id/i,
  );
  assert.match(
    acceptedCancellationMigration,
    /invitation_status = 'accepted'[\s\S]+sender_user_id[\s\S]+receiver_user_id/i,
  );
  assert.match(acceptedCancellationMigration, /invitation_type = 'fixed_plan'/i);
});
