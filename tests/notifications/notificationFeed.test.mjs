import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { buildNotificationFeed } from '../../src/features/notifications/domain/buildNotificationFeed.ts';
import { groupNotificationFeed } from '../../src/features/notifications/domain/groupNotificationFeed.ts';

const baseInvitation = {
  invitationId: 'invitation-1',
  senderUserId: 'user-a',
  receiverUserId: 'user-b',
  cancelledByUserId: null,
  invitationType: 'fixed_plan',
  invitationStatus: 'pending',
  createdAt: '2026-08-20T10:00:00.000Z',
  respondedAt: null,
  actorName: 'Aoi',
  actorAvatarUrl: '/aoi.jpg',
  conversationId: 'conversation-1',
  eventId: null,
  eventTitle: null,
  eventPosterUrl: null,
  activitySummary: '散歩 · 火 09:30ごろ',
};

test('builds the feed from actual invitation states relevant to the current user', () => {
  const received = buildNotificationFeed({
    currentUserId: 'user-b',
    invitations: [baseInvitation],
    messages: [],
  });
  const sentPending = buildNotificationFeed({
    currentUserId: 'user-a',
    invitations: [baseInvitation],
    messages: [],
  });
  const accepted = buildNotificationFeed({
    currentUserId: 'user-a',
    invitations: [{
      ...baseInvitation,
      invitationStatus: 'accepted',
      respondedAt: '2026-08-21T09:00:00.000Z',
    }],
    messages: [],
  });

  assert.equal(received[0]?.kind, 'invitation_received');
  assert.equal(received[0]?.href, '/chat/conversation-1');
  assert.equal(sentPending.length, 0);
  assert.equal(accepted[0]?.kind, 'invitation_accepted');
  assert.equal(accepted[0]?.occurredAt, '2026-08-21T09:00:00.000Z');
});

test('notifies only the other participant when an accepted companion plan is cancelled', () => {
  const cancelled = {
    ...baseInvitation,
    invitationStatus: 'cancelled',
    cancelledByUserId: 'user-b',
    respondedAt: '2026-08-21T10:00:00.000Z',
  };
  const recipientFeed = buildNotificationFeed({
    currentUserId: 'user-a',
    invitations: [cancelled],
    messages: [],
  });
  const actorFeed = buildNotificationFeed({
    currentUserId: 'user-b',
    invitations: [cancelled],
    messages: [],
  });

  assert.equal(recipientFeed[0]?.kind, 'invitation_cancelled');
  assert.equal(recipientFeed[0]?.title, 'Aoiさんが今回は見送ることにしました');
  assert.equal(recipientFeed[0]?.href, '/chat/conversation-1');
  assert.equal(actorFeed.length, 0);
});

test('uses real incoming message content without labelling it unread', () => {
  const feed = buildNotificationFeed({
    currentUserId: 'user-b',
    invitations: [],
    messages: [{
      messageId: 'message-1',
      conversationId: 'conversation-1',
      senderUserId: 'user-a',
      messageType: 'text',
      content: '公園で会いましょう',
      createdAt: '2026-08-21T09:00:00.000Z',
      senderName: 'Aoi',
      senderAvatarUrl: '/aoi.jpg',
    }],
  });

  assert.equal(feed[0]?.body, '公園で会いましょう');
  assert.equal(feed[0]?.href, '/chat/conversation-1');
  assert.doesNotMatch(feed[0]?.title ?? '', /未読/);
});

test('turns a real pending event join request into a link to the organizer manager', () => {
  const feed = buildNotificationFeed({
    currentUserId: 'organizer-1',
    invitations: [],
    messages: [],
    eventJoinRequests: [{
      participationId: 'participation-1',
      eventId: 'event-1',
      eventTitle: '篠崎公園 青空ストレッチ会',
      eventPosterUrl: '/event.jpg',
      requesterUserId: 'requester-1',
      requesterName: 'Aoi',
      requesterAvatarUrl: '/aoi.jpg',
      requestedAt: '2026-08-21T09:30:00.000Z',
    }],
  });

  assert.equal(feed[0]?.kind, 'event_join_requested');
  assert.equal(feed[0]?.title, 'Aoiさんが参加を申請しました');
  assert.equal(feed[0]?.body, '篠崎公園 青空ストレッチ会');
  assert.equal(feed[0]?.href, '/events/event-1/requests');
  assert.equal(feed[0]?.thumbnailUrl, '/event.jpg');
});

test('groups and sorts notifications into the recent seven-day window', () => {
  const items = [
    { ...buildNotificationFeed({ currentUserId: 'user-b', invitations: [baseInvitation], messages: [] })[0], id: 'recent' },
    { ...buildNotificationFeed({ currentUserId: 'user-b', invitations: [baseInvitation], messages: [] })[0], id: 'earlier', occurredAt: '2026-08-01T10:00:00.000Z' },
  ];
  const grouped = groupNotificationFeed(items, new Date('2026-08-21T12:00:00.000Z'));

  assert.deepEqual(grouped.recent.map((item) => item.id), ['recent']);
  assert.deepEqual(grouped.earlier.map((item) => item.id), ['earlier']);
});

test('notification page reads existing Supabase records and the discover bell opens it', async () => {
  const [page, view, discover] = await Promise.all([
    readFile(new URL('../../src/app/notifications/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/app/notifications/NotificationsView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../src/app/discover/DiscoverView.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(page, /\.from\('invitations'\)/);
  assert.match(page, /\.from\('messages'\)/);
  assert.match(page, /\.from\('profiles'\)/);
  assert.match(page, /getPendingEventJoinRequests\(user\.id\)/);
  assert.match(view, /最近7日/);
  assert.match(view, /Notification\.requestPermission/);
  assert.match(view, /onClick=\{\(\) => router\.push\('\/discover'\)\}/);
  assert.doesNotMatch(view, /router\.back\(\)/);
  assert.doesNotMatch(view, /BottomNavigation/);
  assert.doesNotMatch(view, /bottomInset="nav"/);
  assert.match(discover, /router\.push\('\/notifications'\)/);
});
