import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const css = await readFile(
  new URL('../../src/app/chat/[conversationId]/ChatClient.module.css', import.meta.url),
  'utf8',
);
const chatClient = await readFile(
  new URL('../../src/app/chat/[conversationId]/ChatClient.tsx', import.meta.url),
  'utf8',
);
const chatPage = await readFile(
  new URL('../../src/app/chat/[conversationId]/page.tsx', import.meta.url),
  'utf8',
);

test('keeps the fixed-plan composer at the Figma bottom inset', () => {
  const footerRule = css.match(/\.fixedPlanFooter\s*\{([^}]+)\}/)?.[1] ?? '';

  assert.match(footerRule, /height:\s*90px/);
  assert.match(footerRule, /flex:\s*0 0 90px/);
});

test('right-aligns the invitation card inside the centered Figma content track', () => {
  const messageListRule = css.match(/\.messageList\s*\{([^}]+)\}/)?.[1] ?? '';

  assert.match(messageListRule, /width:\s*min\(349px, calc\(100% - 32px\)\)/);
  assert.match(messageListRule, /margin:\s*0 auto/);
  assert.match(messageListRule, /align-items:\s*flex-end/);
});

test('uses the compact accepted-plan card after同行 is confirmed', () => {
  const acceptedRule = css.match(/\.acceptedPlanCard\s*\{([^}]+)\}/)?.[1] ?? '';

  assert.match(acceptedRule, /min-height:\s*123px/);
  assert.match(acceptedRule, /padding:\s*11px 20px 20px/);
  assert.match(acceptedRule, /border-radius:\s*16px/);
});

test('opens the同行 detail by clicking the accepted-plan card', () => {
  assert.match(chatClient, /className=\{styles\.acceptedPlanCard\}/);
  assert.match(chatClient, /onClick=\{onOpenDetail\}/);
  assert.match(chatClient, /\/connections\/plans\/\$\{conversationId\}/);
});

test('keeps the pending invitation card informational without navigation', () => {
  assert.match(chatClient, /<div className=\{styles\.cardBody\}>/);
  assert.doesNotMatch(chatClient, /aria-label=\{`\$\{ctx\.activityLabel\}の固定予定を見る`\}/);
});

test('redirects legacy event group chats to the participant invitation screen', () => {
  assert.match(chatPage, /if \(isGroupChat\) \{\s*redirect\(`\/events\/\$\{conversationData\.event_id\}\/people`\);\s*\}/);
  assert.ok(
    chatPage.indexOf('myMemberData.left_at !== null')
      < chatPage.indexOf('redirect(`/events/${conversationData.event_id}/people`)'),
  );
});
