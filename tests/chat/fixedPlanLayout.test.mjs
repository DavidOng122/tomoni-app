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
const chatMessage = await readFile(
  new URL('../../src/features/chat/components/ChatMessage.tsx', import.meta.url),
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

test('uses white incoming bubbles and keeps sent timestamps in chat', () => {
  assert.match(chatMessage, /backgroundColor: isImage \? '#FFF' : mine \? '#FF8861' : '#FFF'/);
  assert.match(chatMessage, /<time dateTime=\{time\}/);
  assert.match(chatClient, /formatMessageTime/);
  assert.match(chatClient, /time=\{formatMessageTime\(msg\.created_at\)\}/);
});

test('keeps the closed conversation visible beneath a non-interactive gray scrim', () => {
  const scrimRule = css.match(/\.terminalScrim\s*\{([^}]+)\}/)?.[1] ?? '';

  assert.match(chatClient, /className=\{styles\.terminalBackground\} aria-hidden="true" inert/);
  assert.match(chatClient, /invitationStatus: 'pending'/);
  assert.match(chatClient, /className=\{styles\.terminalScrim\}/);
  assert.match(scrimRule, /background:\s*rgb\(0 0 0 \/ 31%\)/);
});

test('matches the Figma terminal sheet dimensions and local cancelled-state assets', () => {
  const sheetRule = css.match(/\.terminalSheet\s*\{([^}]+)\}/)?.[1] ?? '';
  const summaryRule = css.match(/\.terminalPlanSummary\s*\{([^}]+)\}/)?.[1] ?? '';

  assert.match(sheetRule, /width:\s*min\(342px, calc\(100% - 32px\)\)/);
  assert.match(sheetRule, /min-height:\s*314px/);
  assert.match(sheetRule, /border-radius:\s*26px/);
  assert.match(summaryRule, /min-height:\s*110px/);
  assert.match(chatClient, /declined-calendar\.svg/);
  assert.match(chatClient, /declined-x\.svg/);
  assert.match(chatClient, /declined-people\.svg/);
  assert.match(chatClient, /declined-close\.svg/);
  assert.match(chatClient, /role="dialog"/);
  assert.match(chatClient, /同行予定はキャンセルされました/);
  assert.match(chatClient, /src=\{ctx\.suggestedPlace\.imageUrl\}/);
  assert.match(chatClient, /styles\.terminalPlanSummaryWithImage/);
});

test('returns pending and cancelled invitations to あいさつ while accepted plans return to 同行予定', () => {
  assert.match(
    chatClient,
    /ctx\.invitationStatus === 'accepted' && !ctx\.isConversationClosed\s*\? '\/connections\?tab=plans'\s*:\s*'\/connections'/,
  );
  assert.match(chatClient, /onBack=\{\(\) => router\.push\(connectionsBackUrl\)\}/);
  assert.match(chatClient, /onClose=\{\(\) => router\.push\('\/connections'\)\}/);
});

test('opens an explicit cancellation confirmation from the accepted-plan more menu', () => {
  assert.match(chatClient, /aria-label="同行予定のメニューを開く"/);
  assert.match(chatClient, /同行予定をキャンセルしますか？/);
  assert.match(chatClient, /さんに見送りの通知が届きます/);
  assert.match(chatClient, /setIsCancelDialogOpen\(true\)/);
  assert.match(chatClient, /await cancelFixedScheduleInvitation\(ctx\.invitationId\)/);
  assert.match(chatClient, /router\.refresh\(\)/);
  assert.match(chatClient, /今回は見送ることにしました/);
});
