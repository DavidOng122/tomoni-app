'use client';

import Image from 'next/image';
import Link from 'next/link';
import { getParticipantAvatarPreview } from '@/features/events/domain/getParticipantAvatarPreview';
import { groupEventsByTokyoDate } from '@/features/events/domain/groupEventsByTokyoDate';
import type { EventParticipantPreviewData } from '@/features/events/lib/getEventParticipantPreview';
import type { Database } from '@/types/database.types';
import { formatEventTimeRange } from '@/utils/dateFormatter';
import styles from './EventTimeline.module.css';

export type EventTimelineItem = Database['public']['Tables']['events']['Row'] & {
  isParticipating: boolean;
  organizerAvatarUrl: string | null;
  displayPosterUrl: string | null;
  participantPreview: EventParticipantPreviewData | null;
};

interface EventTimelineProps {
  events: EventTimelineItem[];
  emptyMessage?: string;
}

const ClockIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.2 2" />
  </svg>
);

const PinIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 5.5-8 11-8 11S4 15.5 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

export function EventTimeline({
  events,
  emptyMessage = '現在予定されているイベントはありません。',
}: EventTimelineProps) {
  const eventGroups = groupEventsByTokyoDate(events);

  if (eventGroups.length === 0) {
    return <p className={styles.emptyState}>{emptyMessage}</p>;
  }

  return (
    <div className={styles.timeline}>
      {eventGroups.map((group) => (
        <section className={styles.dayGroup} key={group.dateKey}>
          <div className={styles.dayHeading}>
            <strong>{group.dateLabel}</strong>
            <span>/ {group.weekdayLabel}</span>
          </div>

          <div className={styles.eventList}>
            {group.events.map((event) => {
              const { visibleUsers, overflowCount } = getParticipantAvatarPreview(event.participantPreview);

              return (
                <Link className={styles.eventRow} href={`/events/${event.event_id}`} key={event.event_id}>
                  <div className={styles.poster}>
                    {event.displayPosterUrl ? (
                      <img src={event.displayPosterUrl} alt={event.title} width="88" height="90" />
                    ) : (
                      <span className={styles.posterPlaceholder} aria-hidden="true">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="m21 15-5-5L5 21" />
                        </svg>
                      </span>
                    )}
                    {event.organizerAvatarUrl ? (
                      <Image className={styles.organizerAvatar} src={event.organizerAvatarUrl} alt="" width={35} height={35} aria-hidden="true" />
                    ) : null}
                  </div>

                  <div className={styles.eventDetails}>
                    <div className={styles.eventTitleRow}>
                      <h3>{event.title}</h3>
                      {event.isParticipating ? <span className={styles.participationBadge}>参加予定</span> : null}
                    </div>
                    <div className={styles.metaLine}><ClockIcon /><span>{formatEventTimeRange(event.start_at, event.end_at)}</span></div>
                    <div className={styles.metaLine}><PinIcon /><span>{event.place_name}</span></div>
                    {visibleUsers.length > 0 || overflowCount > 0 ? (
                      <div className={styles.participantStack} aria-label={`${event.participantPreview?.participantCount || 0}人が参加予定`}>
                        {visibleUsers.map((participant) => (
                          <Image
                            key={participant.userId}
                            src={participant.avatarUrl}
                            alt={participant.nickname}
                            width={24}
                            height={24}
                          />
                        ))}
                        {overflowCount > 0 ? <span>+{overflowCount}</span> : null}
                      </div>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
