'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { createEventInvitationAction } from '@/app/actions/createEventInvitationAction';
import { Database } from '@/types/database.types';
import { formatEventDateTime } from '@/utils/dateFormatter';
import styles from './EventPeopleView.module.css';

type EventRow = Database['public']['Tables']['events']['Row'];

interface Candidate {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  compatibility_label: string;
}

interface EventPeopleViewProps {
  event: EventRow;
  candidates: Candidate[];
}

export const EventPeopleView: React.FC<EventPeopleViewProps> = ({ event, candidates: initialCandidates }) => {
  const router = useRouter();
  const [invitedIds, setInvitedIds] = React.useState<Set<string>>(new Set());
  const [invitingId, setInvitingId] = React.useState<string | null>(null);

  const handleInvite = async (receiverId: string) => {
    if (invitingId || invitedIds.has(receiverId)) return;
    setInvitingId(receiverId);

    const result = await createEventInvitationAction(event.event_id, receiverId);

    if (result.success) {
      setInvitedIds((current) => new Set(current).add(receiverId));
    } else {
      alert(result.error || '同行のお誘いを送れませんでした');
    }

    setInvitingId(null);
  };

  return (
    <div className={styles.screen}>
      <PageContainer bottomInset="none" className={styles.page}>
        <main className={styles.stage}>
          <button type="button" onClick={() => router.back()} className={styles.backButton} aria-label="戻る">
            <Image src="/images/discover/scheduled-people/back.svg" width={35} height={35} alt="" aria-hidden="true" />
          </button>

          <h1>一緒に{event.title}に行けそうな人</h1>

          <section className={styles.eventCard} aria-label="参加するイベント">
            <div>
              <Image src="/images/discover/scheduled-people/calendar.svg" width={16} height={17} alt="" aria-hidden="true" />
              <strong>{event.title}</strong>
            </div>
            <div>
              <Image src="/images/discover/scheduled-people/clock.svg" width={16} height={16} alt="" aria-hidden="true" />
              <span>{formatEventDateTime(event.start_at, event.end_at)}</span>
            </div>
            {event.place_name && (
              <div>
                <Image src="/images/discover/scheduled-people/location.svg" width={16} height={17} alt="" aria-hidden="true" />
                <span>{event.place_name}</span>
              </div>
            )}
          </section>

          <section className={styles.peopleList} aria-label="同行に誘える参加者">
            {initialCandidates.length === 0 ? (
              <div className={styles.emptyState}>
                今のところ、近い時間に参加する人はいません。
              </div>
            ) : (
              initialCandidates.map((candidate) => {
                const isInviting = invitingId === candidate.user_id;
                const isInvited = invitedIds.has(candidate.user_id);

                return (
                  <article className={styles.personCard} key={candidate.user_id}>
                    <span className={styles.avatar}>
                      {candidate.avatar_url ? (
                        <Image src={candidate.avatar_url} alt={candidate.nickname} fill unoptimized />
                      ) : (
                        <span className={styles.avatarFallback} aria-hidden="true">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </span>
                      )}
                    </span>

                    <div className={styles.personInfo}>
                      <strong>{candidate.nickname}</strong>
                      <span className={styles.compatibilityLabel}>{candidate.compatibility_label}</span>
                    </div>

                    <button
                      type="button"
                      className={styles.inviteButton}
                      onClick={() => handleInvite(candidate.user_id)}
                      disabled={invitingId !== null || isInvited}
                    >
                      {isInviting ? '送信中...' : isInvited ? 'お誘い済み' : '同行に誘う'}
                    </button>
                  </article>
                );
              })
            )}
          </section>
        </main>
      </PageContainer>
    </div>
  );
};
