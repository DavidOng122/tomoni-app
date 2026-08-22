import type { NotificationFeedGroups, NotificationFeedItem } from './notificationTypes';

const RECENT_WINDOW_DAYS = 7;

export function groupNotificationFeed(
  items: NotificationFeedItem[],
  now: Date = new Date(),
): NotificationFeedGroups {
  const recentThreshold = new Date(now);
  recentThreshold.setDate(recentThreshold.getDate() - RECENT_WINDOW_DAYS);

  const sortedItems = [...items].sort((left, right) => {
    const timeDifference = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
    return timeDifference || left.id.localeCompare(right.id);
  });

  return sortedItems.reduce<NotificationFeedGroups>(
    (groups, item) => {
      const occurredAt = new Date(item.occurredAt);
      const target = !Number.isNaN(occurredAt.getTime()) && occurredAt >= recentThreshold
        ? groups.recent
        : groups.earlier;
      target.push(item);
      return groups;
    },
    { recent: [], earlier: [] },
  );
}
