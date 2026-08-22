import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { EventTimeline, type EventTimelineItem } from '@/features/events/components/EventTimeline';
import styles from './AllEventsView.module.css';

interface AllEventsViewProps {
  events: EventTimelineItem[];
}

export function AllEventsView({ events }: AllEventsViewProps) {
  return (
    <div className={styles.screen}>
      <PageContainer bottomInset="none" className={styles.page}>
        <div className={styles.stage}>
          <header className={styles.header}>
            <Link className={styles.backButton} href="/discover" aria-label="みつけるに戻る">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
            <div className={styles.titleBlock}>
              <span>江戸川区</span>
              <h1>地域イベント</h1>
            </div>
            <span className={styles.count}>{events.length}件</span>
          </header>

          <main className={styles.content}>
            <EventTimeline events={events} />
          </main>
        </div>
      </PageContainer>
    </div>
  );
}
