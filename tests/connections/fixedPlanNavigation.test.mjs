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
const connectionsPage = await readFile(
  new URL('../../src/app/connections/page.tsx', import.meta.url),
  'utf8',
);

test('does not repeat accepted fixed-plan conversations in あいさつ', () => {
  assert.match(
    connectionsView,
    /activeConversations\.filter\(\(conv\) => !conv\.is_fixed_plan\)\.map/,
  );
});

test('keeps pending fixed-plan invitations in あいさつ until they are accepted', () => {
  const greetingStart = connectionsView.indexOf("activeTab === 'あいさつ'");
  const pendingInvitationSection = connectionsView.indexOf('<ReceivedPlanInvitationsSection');
  const acceptedPlansStart = connectionsView.indexOf(
    "{activeTab === '同行予定' && (",
    greetingStart,
  );

  assert.ok(greetingStart >= 0);
  assert.ok(pendingInvitationSection > greetingStart);
  assert.ok(pendingInvitationSection < acceptedPlansStart);
  assert.match(connectionsPage, /\.eq\('invitation_status', 'pending'\)/);
  assert.match(connectionsPage, /return inv\?\.invitation_status === 'accepted'/);
  assert.doesNotMatch(
    connectionsView.slice(acceptedPlansStart),
    /<ReceivedPlanInvitationsSection/,
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

test('moves the orange notice dot with the active connection tab', () => {
  assert.match(
    connectionsView,
    /activeTab === 'あいさつ' \? \(\s*<span className=\{styles\.tabNotice\}/,
  );
  assert.match(
    connectionsView,
    /activeTab === '同行予定' \? \(\s*<span className=\{styles\.tabNotice\}/,
  );
  assert.equal(connectionsView.match(/styles\.tabNotice/g)?.length, 2);
});

test('does not show message timestamps in the connection lists', () => {
  assert.doesNotMatch(connectionsView, /<time/);
  assert.doesNotMatch(connectionsView, /formatMessageTime/);
});

test('does not duplicate declined or cancelled results in あいさつ', () => {
  assert.doesNotMatch(connectionsView, /closedPlanConversations/);
  assert.doesNotMatch(connectionsPage, /closedFixedConvs/);
  assert.doesNotMatch(connectionsPage, /closedPlanConversations=/);
});

test('shows the accepted suggested public place as the meeting location', () => {
  assert.match(connectionsPage, /get_fixed_plan_invitation_suggested_place/);
  assert.match(connectionsPage, /meetingPlaceName = suggestedPlace\?\.suggested_place_name \?\? null/);
  assert.match(connectionsView, /conv\.meeting_place_name \?\? '集合場所を調整中'/);
  assert.match(connectionsView, /fixedPlanConversationTopline/);
  assert.doesNotMatch(connectionsView, /conv\.place_name/);
});
