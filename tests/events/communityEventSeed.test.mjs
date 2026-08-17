import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const seed = await readFile(
  new URL('../../supabase/snippets/figma_mock_seed.sql', import.meta.url),
  'utf8',
);
const migration = await readFile(
  new URL('../../supabase/migrations/20260817040000_separate_community_event_from_fixed_plan.sql', import.meta.url),
  'utf8',
);
const candidateMigration = await readFile(
  new URL('../../supabase/migrations/20260817050000_seed_community_event_success_candidates.sql', import.meta.url),
  'utf8',
);
const supabaseConfig = await readFile(
  new URL('../../supabase/config.toml', import.meta.url),
  'utf8',
);

test('keeps the home community event separate from the Gyosen fixed plan', async () => {
  assert.match(seed, /篠崎公園 青空ストレッチ会/);
  assert.match(seed, /\/images\/discover\/shinozaki-park\.jpg/);
  assert.match(seed, /'篠崎公園'/);
  assert.match(seed, /'20000000-0000-4000-8000-000000000001'[\s\S]+?'行船公園'/);
  assert.match(migration, /where event_id = '30000000-0000-4000-8000-000000000001'/);
  await access(new URL('../../public/images/discover/shinozaki-park.jpg', import.meta.url));
});

test('keeps the temporary unconnected candidates as cancelled history', () => {
  assert.match(candidateMigration, /10000000-0000-4000-8000-000000000005[\s\S]+?'17:05'/);
  assert.match(candidateMigration, /10000000-0000-4000-8000-000000000006[\s\S]+?'17:10'/);
  assert.match(candidateMigration, /10000000-0000-4000-8000-000000000007[\s\S]+?'17:15'/);
  assert.match(candidateMigration, /on conflict \(event_id, user_id\) do update/);
});

test('rebuilds a fresh local Supabase with the complete Figma demo seed', () => {
  assert.match(supabaseConfig, /sql_paths = \["\.\/snippets\/figma_mock_seed\.sql"\]/);
  assert.match(candidateMigration, /if exists \([\s\S]+?from public\.events/);
  assert.match(candidateMigration, /from auth\.users/);
});
