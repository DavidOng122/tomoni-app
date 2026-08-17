import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(
  new URL('../../supabase/migrations/20260817010000_archive_fixed_plan.sql', import.meta.url),
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
