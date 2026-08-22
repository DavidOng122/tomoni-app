export type NotificationFeedKind =
  | 'event_join_requested'
  | 'invitation_received'
  | 'invitation_accepted'
  | 'invitation_declined'
  | 'invitation_cancelled'
  | 'message_received';

export interface NotificationFeedItem {
  id: string;
  kind: NotificationFeedKind;
  title: string;
  body: string;
  occurredAt: string;
  href: string;
  actorName: string;
  actorAvatarUrl: string | null;
  thumbnailUrl: string | null;
}

export interface NotificationFeedGroups {
  recent: NotificationFeedItem[];
  earlier: NotificationFeedItem[];
}
