import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const connectionsView = await readFile(
  new URL('../../src/app/connections/ConnectionsView.tsx', import.meta.url),
  'utf8',
);
const chatClient = await readFile(
  new URL('../../src/app/chat/[conversationId]/ChatClient.tsx', import.meta.url),
  'utf8',
);

test('does not repeat accepted fixed-plan conversations in あいさつ', () => {
  assert.match(
    connectionsView,
    /activeConversations\.filter\(\(conv\) => !conv\.is_fixed_plan\)\.map/,
  );
});

test('opens chat from 同行予定 and opens detail from the accepted card', () => {
  assert.match(
    connectionsView,
    /router\.push\(`\/chat\/\$\{conv\.conversation_id\}`\)/,
  );
  assert.match(chatClient, /onClick=\{onOpenDetail\}/);
  assert.match(chatClient, /\/connections\/plans\/\$\{conversationId\}/);
});
