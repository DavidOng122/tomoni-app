import type { NotificationFeedItem, NotificationFeedKind } from './notificationTypes';

export interface InvitationNotificationSource {
  invitationId: string;
  senderUserId: string;
  receiverUserId: string;
  cancelledByUserId: string | null;
  invitationType: 'fixed_plan' | 'event';
  invitationStatus: string;
  createdAt: string;
  respondedAt: string | null;
  actorName: string;
  actorAvatarUrl: string | null;
  conversationId: string | null;
  eventId: string | null;
  eventTitle: string | null;
  eventPosterUrl: string | null;
  activitySummary: string;
}

export interface MessageNotificationSource {
  messageId: string;
  conversationId: string;
  senderUserId: string;
  messageType: string;
  content: string | null;
  createdAt: string;
  senderName: string;
  senderAvatarUrl: string | null;
}

export interface EventJoinRequestNotificationSource {
  participationId: string;
  eventId: string;
  eventTitle: string;
  eventPosterUrl: string | null;
  requesterUserId: string;
  requesterName: string;
  requesterAvatarUrl: string | null;
  requestedAt: string;
}

export function buildNotificationFeed({
  currentUserId,
  invitations,
  messages,
  eventJoinRequests = [],
}: {
  currentUserId: string;
  invitations: InvitationNotificationSource[];
  messages: MessageNotificationSource[];
  eventJoinRequests?: EventJoinRequestNotificationSource[];
}): NotificationFeedItem[] {
  const invitationItems = invitations.flatMap((invitation): NotificationFeedItem[] => {
    const isSender = invitation.senderUserId === currentUserId;
    const isReceiver = invitation.receiverUserId === currentUserId;
    let kind: NotificationFeedKind | null = null;
    let title = '';

    if (isReceiver && invitation.invitationStatus === 'pending') {
      kind = 'invitation_received';
      title = invitation.invitationType === 'event'
        ? `${invitation.actorName}さんからイベントのお誘いが届きました`
        : `${invitation.actorName}さんから同行のお誘いが届きました`;
    } else if (isSender && invitation.invitationStatus === 'accepted') {
      kind = 'invitation_accepted';
      title = `${invitation.actorName}さんが同行のお誘いを承諾しました`;
    } else if (isSender && invitation.invitationStatus === 'declined') {
      kind = 'invitation_declined';
      title = `${invitation.actorName}さんが今回は見送ることにしました`;
    } else if (
      (isSender || isReceiver)
      && invitation.invitationStatus === 'cancelled'
      && (invitation.cancelledByUserId ?? invitation.senderUserId) !== currentUserId
    ) {
      kind = 'invitation_cancelled';
      title = `${invitation.actorName}さんが今回は見送ることにしました`;
    }

    if (!kind) return [];

    const href = invitation.conversationId
      ? `/chat/${invitation.conversationId}`
      : invitation.eventId
        ? `/events/${invitation.eventId}`
        : '/connections';

    return [{
      id: `invitation:${invitation.invitationId}:${invitation.invitationStatus}`,
      kind,
      title,
      body: invitation.activitySummary,
      occurredAt: invitation.respondedAt ?? invitation.createdAt,
      href,
      actorName: invitation.actorName,
      actorAvatarUrl: invitation.actorAvatarUrl,
      thumbnailUrl: invitation.eventPosterUrl,
    }];
  });

  const messageItems = messages
    .filter((message) => message.senderUserId !== currentUserId)
    .map((message): NotificationFeedItem => ({
      id: `message:${message.messageId}`,
      kind: 'message_received',
      title: `${message.senderName}さんからメッセージ`,
      body: message.messageType === 'image'
        ? '写真が届きました'
        : message.content?.trim() || '新しいメッセージが届きました',
      occurredAt: message.createdAt,
      href: `/chat/${message.conversationId}`,
      actorName: message.senderName,
      actorAvatarUrl: message.senderAvatarUrl,
      thumbnailUrl: null,
    }));

  const eventJoinRequestItems = eventJoinRequests.map((request): NotificationFeedItem => ({
    id: `event-join-request:${request.participationId}`,
    kind: 'event_join_requested',
    title: `${request.requesterName}さんが参加を申請しました`,
    body: request.eventTitle,
    occurredAt: request.requestedAt,
    href: `/events/${request.eventId}/requests`,
    actorName: request.requesterName,
    actorAvatarUrl: request.requesterAvatarUrl,
    thumbnailUrl: request.eventPosterUrl,
  }));

  return [...eventJoinRequestItems, ...invitationItems, ...messageItems];
}
