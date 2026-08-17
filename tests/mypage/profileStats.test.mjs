import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const view = await readFile(
  new URL('../../src/app/mypage/MyPageView.tsx', import.meta.url),
  'utf8',
);
const css = await readFile(
  new URL('../../src/app/mypage/MyPageView.module.css', import.meta.url),
  'utf8',
);

test('renders all three Supabase-backed profile statistics', () => {
  assert.match(view, /displayedFixedPlanCount/);
  assert.match(view, /attendedEventCount/);
  assert.match(view, /connectionCount/);
  assert.match(view, /参加済み/);
});

test('matches the three-column Figma statistics card', () => {
  const statsRule = css.match(/\.stats\s*\{([^}]+)\}/)?.[1] ?? '';

  assert.match(statsRule, /height:\s*70px/);
  assert.match(statsRule, /grid-template-columns:\s*repeat\(3, 1fr\)/);
  assert.match(statsRule, /padding:\s*13px 28px/);
});
