'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { groupNotificationFeed } from '@/features/notifications/domain/groupNotificationFeed';
import type { NotificationFeedItem } from '@/features/notifications/domain/notificationTypes';
import styles from './NotificationsView.module.css';

function NotificationBell({ hasDot = false }: { hasDot?: boolean }) {
  return (
    <span className={styles.bellVisual} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {hasDot ? <span className={styles.bellDot} /> : null}
    </span>
  );
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  }).format(date);
}

function NotificationRow({ item, onOpen }: { item: NotificationFeedItem; onOpen: () => void }) {
  return (
    <li className={styles.notificationItem}>
      <button type="button" className={styles.notificationRow} onClick={onOpen}>
        <span className={styles.actorAvatar}>
          {item.actorAvatarUrl ? (
            // Avatar URLs may come from local Supabase Storage or an external provider.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.actorAvatarUrl} alt="" />
          ) : (
            <span className={styles.actorFallback}>{item.actorName.slice(0, 1)}</span>
          )}
          <span className={styles.itemKindBadge} aria-hidden="true">
            {item.kind === 'message_received' ? '●' : '↗'}
          </span>
        </span>
        <span className={styles.notificationCopy}>
          <strong>{item.title}</strong>
          <span className={styles.notificationBody}>{item.body}</span>
          <time dateTime={item.occurredAt}>{formatNotificationTime(item.occurredAt)}</time>
        </span>
        {item.thumbnailUrl ? (
          // Event posters are sourced from real event data and can be remote.
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.notificationThumbnail} src={item.thumbnailUrl} alt="" />
        ) : (
          <span className={styles.rowChevron} aria-hidden="true">›</span>
        )}
      </button>
    </li>
  );
}

function NotificationSection({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: NotificationFeedItem[];
  onOpen: (item: NotificationFeedItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className={styles.feedSection} aria-labelledby={`notification-${title}`}>
      <h2 id={`notification-${title}`}>{title}</h2>
      <ul>
        {items.map((item) => (
          <NotificationRow key={item.id} item={item} onOpen={() => onOpen(item)} />
        ))}
      </ul>
    </section>
  );
}

export default function NotificationsView({
  notifications,
  nowIso,
}: {
  notifications: NotificationFeedItem[];
  nowIso: string;
}) {
  const router = useRouter();
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(true);
  const [permissionFeedback, setPermissionFeedback] = useState('');
  const groups = useMemo(
    () => groupNotificationFeed(notifications, new Date(nowIso)),
    [notifications, nowIso],
  );

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      setPermissionFeedback('このブラウザは通知に対応していません');
      return;
    }

    const permission = await window.Notification.requestPermission();
    if (permission === 'granted') {
      setShowPermissionPrompt(false);
      setPermissionFeedback('通知を許可しました');
    } else {
      setPermissionFeedback('ブラウザの設定からいつでも変更できます');
    }
  };

  return (
    <div className={styles.screen}>
      <PageContainer className={styles.page}>
        <header className={styles.header}>
          <button type="button" className={styles.backButton} onClick={() => router.push('/discover')} aria-label="ホームに戻る">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h1>通知</h1>
        </header>

        {showPermissionPrompt ? (
          <section className={styles.permissionCard} aria-labelledby="notification-permission-title">
            <NotificationBell hasDot />
            <h2 id="notification-permission-title">大切な更新を見逃さない</h2>
            <p>同行のお誘い、返信、メッセージなど、Yorimiの大切な更新を受け取れます。</p>
            <div className={styles.permissionActions}>
              <button type="button" className={styles.allowButton} onClick={requestNotificationPermission}>通知を許可</button>
              <button type="button" className={styles.laterButton} onClick={() => setShowPermissionPrompt(false)}>あとで</button>
            </div>
            {permissionFeedback ? <p className={styles.permissionFeedback} role="status">{permissionFeedback}</p> : null}
          </section>
        ) : permissionFeedback ? (
          <p className={styles.compactFeedback} role="status">{permissionFeedback}</p>
        ) : null}

        <main className={styles.feed}>
          {notifications.length > 0 ? (
            <>
              <NotificationSection title="最近7日" items={groups.recent} onOpen={(item) => router.push(item.href)} />
              <NotificationSection title="それ以前" items={groups.earlier} onOpen={(item) => router.push(item.href)} />
            </>
          ) : (
            <section className={styles.emptyState}>
              <NotificationBell />
              <h2>まだ通知はありません</h2>
              <p>新しいお誘いやメッセージが届くと、ここに表示されます。</p>
            </section>
          )}
        </main>
      </PageContainer>
    </div>
  );
}
