'use client';

import React from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { EventParticipationButton } from '@/components/events/EventParticipationButton';
import { EventTopNav } from '@/features/events/components/EventTopNav';
import { getOfficialEventActions } from '@/features/events/domain/getOfficialEventActions';
import { getEventOrganizerAvatarUrl } from '@/features/events/domain/getEventOrganizerAvatarUrl';
import { EventParticipantPreviewData } from '@/features/events/lib/getEventParticipantPreview';
import { Database } from '@/types/database.types';
import { formatEventDateTime } from '@/utils/dateFormatter';
import { useRouter } from 'next/navigation';
import styles from './EventDetailView.module.css';

type EventRow = Database['public']['Tables']['events']['Row'];

interface EventDetailViewProps {
  event: EventRow;
  participation: Database['public']['Tables']['event_participations']['Row'] | null;
  creatorProfile?: { nickname: string; avatar_url: string } | null;
  participantPreview: EventParticipantPreviewData | null;
  pendingRequestCount?: number;
  isCreator?: boolean;
}

export const EventDetailView: React.FC<EventDetailViewProps> = ({
  event,
  participation,
  creatorProfile,
  participantPreview,
  pendingRequestCount = 0,
  isCreator = false,
}) => {
  const router = useRouter();

  const handleOpenParticipants = () => {
    router.push(`/events/${event.event_id}/people`);
  };

  const officialActions = getOfficialEventActions({
    officialUrl: event.official_url,
    registrationUrl: event.registration_url,
    registrationRequired: event.registration_required,
    registrationStatus: event.registration_status,
    registrationDeadline: event.registration_deadline,
  });

  const organizerName = creatorProfile?.nickname || event.source_name || '';
  const organizerAvatar = getEventOrganizerAvatarUrl({
    eventType: event.event_type,
    sourceName: event.source_name,
    creatorAvatarUrl: creatorProfile?.avatar_url || null,
  });
  const participantCount = participantPreview?.participantCount || 0;
  const participants = participantPreview?.users || [];
  const remainingCount = Math.max(0, participantCount - participants.length);

  return (
    <div className={styles.screen}>
      <PageContainer bottomInset="none" className={styles.page}>
        <div className={styles.detailStage}>
          <EventTopNav className={styles.topNav} />

          <main className={styles.content}>
            <div className={styles.hero}>
              {event.poster_url ? (
                <img src={event.poster_url} alt={event.title} />
              ) : (
                <div className={styles.heroPlaceholder}>No Poster Available</div>
              )}
            </div>

            <div className={styles.titleBlock}>
              <div className={styles.titleRow}>
                <h1>{event.title}</h1>
                <div className={styles.titleActions}>
                  {officialActions.officialSiteUrl && (
                    <a
                      className={styles.officialLinkIcon}
                      href={officialActions.officialSiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="公式サイトを開く"
                    >
                      <img
                        src="/images/events/detail/external-link.svg"
                        alt=""
                        aria-hidden="true"
                      />
                    </a>
                  )}
                  {event.registration_required && (
                    <span className={styles.registrationBadge}>要申込</span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.organizerRow}>
              <div className={styles.organizer}>
                <span className={styles.organizerAvatar}>
                  {organizerAvatar ? <img src={organizerAvatar} alt={organizerName} /> : null}
                </span>
                <strong>{organizerName}</strong>
              </div>
              <time>{formatEventDateTime(event.start_at, event.end_at)}</time>
            </div>

            {isCreator && event.event_type === 'user_created' && event.approval_required && (
              <Link className={styles.requestEntry} href={`/events/${event.event_id}/requests`}>
                <span>参加リクエスト</span>
                <span>{pendingRequestCount}件 ›</span>
              </Link>
            )}

            {participantPreview && participantCount > 0 && (
              <section className={styles.participantCard} aria-label={`参加予定 ${participantCount}人`}>
                <strong>参加予定： {participantCount}人</strong>
                <div className={styles.participantLine}>
                  <div className={styles.avatarStack}>
                    {participants.map((participant, index) => (
                      <span key={participant.userId || index}>
                        {participant.avatarUrl ? (
                          <img src={participant.avatarUrl} alt="" aria-hidden="true" />
                        ) : null}
                      </span>
                    ))}
                    {remainingCount > 0 && <b>+{remainingCount}</b>}
                  </div>
                  <p>
                    {participants.map((participant) => `${participant.nickname}さん`).join('、')}
                    {remainingCount > 0 ? `、ほか${remainingCount}名` : ''}
                  </p>
                  <img className={styles.chevron} src="/images/events/detail/chevron.svg" alt="" aria-hidden="true" />
                </div>
              </section>
            )}

            {participation?.participation_status === 'going' &&
              participation.participation_date &&
              participation.arrival_time && (
                <button 
                  className={styles.peopleLink} 
                  onClick={handleOpenParticipants}
                >
                  同じ時間に参加する人を見る
                </button>
              )}

            {event.place_name && (
              <section className={styles.locationSection}>
                <h2>場所</h2>
                <div>
                  <img src="/images/events/detail/location.svg" alt="" aria-hidden="true" />
                  <span>
                    {event.place_name}
                    {event.address && <small>{event.address}</small>}
                  </span>
                </div>
              </section>
            )}

            {event.description && (
              <section className={styles.descriptionSection}>
                <h2>イベント紹介</h2>
                <p>{event.description}</p>
              </section>
            )}
          </main>
        </div>
      </PageContainer>

      <div className={styles.actionBar}>
        <div>
          {officialActions.registrationAction && (
            officialActions.registrationAction.url && !officialActions.registrationAction.disabled ? (
              <a
                href={officialActions.registrationAction.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.externalButton}
              >
                {officialActions.registrationAction.label}
              </a>
            ) : (
              <button type="button" disabled className={styles.externalButton}>
                {officialActions.registrationAction.label}
              </button>
            )
          )}

          <EventParticipationButton
            eventId={event.event_id}
            currentStatus={participation?.participation_status || null}
            approvalRequired={event.approval_required}
            eventStatus={event.event_status}
          />

        </div>
      </div>
    </div>
  );
};
