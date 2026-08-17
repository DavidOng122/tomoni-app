'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { joinEventWithPlanAction } from '@/app/actions/joinEventWithPlan';
import { createEventInvitationAction } from '@/app/actions/createEventInvitationAction';
import { SameEventCandidate } from '@/features/events/domain/getEventSuccessCandidates';
import { Database } from '@/types/database.types';
import { formatEventDateTime } from '@/utils/dateFormatter';
import styles from './JoinEventView.module.css';

type EventRow = Database['public']['Tables']['events']['Row'];
type ParticipationRow = Database['public']['Tables']['event_participations']['Row'];

interface JoinEventViewProps {
  event: EventRow;
  existingParticipation: ParticipationRow | null;
  initialSuccessCandidates?: SameEventCandidate[] | null;
}

const durationOptions = [
  { label: '30分くらい', value: 30 },
  { label: '1時間くらい', value: 60 },
  { label: 'まだ決めていない', value: null },
] as const;

const supabaseImageLoader = ({ src }: { src: string }) => src;

export const JoinEventView: React.FC<JoinEventViewProps> = ({
  event,
  existingParticipation,
  initialSuccessCandidates = null,
}) => {
  const router = useRouter();

  // Determine initial arrival time
  let initialTime = '';
  if (existingParticipation?.arrival_time) {
    initialTime = existingParticipation.arrival_time.substring(0, 5); // Extract HH:MM
  } else if (event.start_at) {
    const d = new Date(event.start_at);
    // Convert to Japan Time explicitly or rely on browser? The UI is likely using JS Date
    // assuming local browser is JST or we just extract the time. For now, extracting from UTC ISO:
    // event.start_at is timestamptz. We want local HH:MM.
    initialTime = d.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Tokyo',
    });
  }

  // Determine initial duration
  let initialDuration: number | null = null;
  if (existingParticipation && 'planned_duration_minutes' in existingParticipation) {
    initialDuration = existingParticipation.planned_duration_minutes as number | null;
  }

  const [arrivalTime, setArrivalTime] = useState(initialTime);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(initialDuration);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successCandidates] = useState<SameEventCandidate[] | null>(initialSuccessCandidates);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [invitedUserIds, setInvitedUserIds] = useState<Set<string>>(new Set());

  const handleSubmit = async () => {
    if (!arrivalTime) {
      alert('到着予定を入力してください');
      return;
    }

    setIsSubmitting(true);

    const res = await joinEventWithPlanAction(event.event_id, arrivalTime, durationMinutes);
    if (!res.success) {
      alert(res.error);
      setIsSubmitting(false);
      return;
    }

    window.location.assign(`/events/${event.event_id}/join?completed=1`);
  };

  const handleInvite = async (candidate: SameEventCandidate) => {
    if (invitingUserId || invitedUserIds.has(candidate.user_id)) return;

    setInvitingUserId(candidate.user_id);
    const result = await createEventInvitationAction(event.event_id, candidate.user_id);

    if (result.success) {
      setInvitedUserIds((current) => new Set(current).add(candidate.user_id));
    } else {
      alert(result.error || '同行のお誘いを送れませんでした');
    }

    setInvitingUserId(null);
  };

  const finishSuccessFlow = () => router.replace(`/events/${event.event_id}`);

  const getDurationText = () => {
    if (durationMinutes === 30) return '30分くらい';
    if (durationMinutes === 60) return '1時間くらい';
    return '未定';
  };

  const eventLabel = 'イベント';

  if (successCandidates !== null) {
    return (
      <div className={`${styles.screen} ${styles.successScreen}`}>
        <PageContainer bottomInset="none" className={styles.page}>
          <main className={styles.successStage}>
            <button
              className={styles.backButton}
              type="button"
              onClick={finishSuccessFlow}
              aria-label="イベント詳細へ戻る"
            >
              <Image src="/images/events/detail/back.svg" width={7} height={12} alt="" aria-hidden="true" />
            </button>

            <div className={styles.successBody}>
              <section className={styles.successHero} aria-live="polite">
                <Image
                  src="/images/events/join/success.svg"
                  width={176}
                  height={138}
                  alt=""
                  aria-hidden="true"
                  priority
                />
                <div>
                  <h1>{event.title}</h1>
                  <p>参加申込が完了しました</p>
                </div>
              </section>

              {successCandidates.length > 0 && (
                <section className={styles.matchCard} aria-label="気が合いそうな参加者">
                  <header>
                    <div>
                      <Image
                        src="/images/events/join/common-people.svg"
                        width={24}
                        height={24}
                        alt=""
                        aria-hidden="true"
                      />
                      <h2>気が合いそうな参加者が{successCandidates.length}人います</h2>
                    </div>
                    <p>気になる人がいたら、同行に誘ってみましょう。</p>
                  </header>

                  <div className={styles.candidateGrid}>
                    {successCandidates.map((candidate) => {
                      const hasInvited = invitedUserIds.has(candidate.user_id);
                      const isInviting = invitingUserId === candidate.user_id;

                      return (
                        <article className={styles.candidate} key={candidate.user_id}>
                          <span className={styles.candidateAvatar}>
                            {candidate.avatar_url && (
                              <Image
                                loader={supabaseImageLoader}
                                unoptimized
                                src={candidate.avatar_url}
                                width={80}
                                height={80}
                                alt={candidate.nickname}
                              />
                            )}
                          </span>
                          <h3>{candidate.nickname}</h3>
                          <span className={styles.compatibilityLabel}>
                            {candidate.compatibility_label}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleInvite(candidate)}
                            disabled={Boolean(invitingUserId) || hasInvited}
                          >
                            {isInviting ? '送信中...' : hasInvited ? 'お誘い済み' : '同行に誘う'}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              <footer className={styles.successFooter}>
                <button type="button" onClick={finishSuccessFlow}>今はしない</button>
                <p>イベント前にも、もう一度お知らせします</p>
              </footer>
            </div>
          </main>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <PageContainer bottomInset="none" className={styles.page}>
        <main className={styles.stage}>
          <button className={styles.backButton} type="button" onClick={() => router.back()} aria-label="戻る">
            <Image src="/images/events/detail/back.svg" width={7} height={12} alt="" aria-hidden="true" />
          </button>

          <section className={styles.eventCard} aria-label="参加する活動">
            <span className={styles.eventLabel}>{eventLabel}</span>
            <h1>{event.title}</h1>
            <div className={styles.metaRow}>
              <Image
                src="/images/discover/invite-preview/calendar.svg"
                width={14}
                height={14}
                alt=""
                aria-hidden="true"
              />
              <time>{formatEventDateTime(event.start_at, event.end_at)}</time>
            </div>
            {event.place_name && (
              <div className={styles.metaRow}>
                <Image
                  className={styles.locationIcon}
                  src="/images/events/detail/location.svg"
                  width={11}
                  height={14}
                  alt=""
                  aria-hidden="true"
                />
                <span>{event.place_name}</span>
              </div>
            )}
          </section>

          <section className={styles.formSection}>
            <header className={styles.intro}>
              <h2>参加する時間を選んでください</h2>
              <p>同じ時間帯に参加する人を見つけやすくなります</p>
            </header>

            <div className={styles.fieldGroup}>
              <label htmlFor="arrival-time">到着予定</label>
              <div className={styles.timeRow}>
                <span>Time</span>
                <input
                  id="arrival-time"
                  type="time"
                  value={arrivalTime}
                  onChange={(event) => setArrivalTime(event.target.value)}
                />
              </div>
            </div>

            <fieldset className={styles.durationFieldset}>
              <legend>参加時間</legend>
              <div className={styles.durationOptions}>
                {durationOptions.map((option) => (
                  <button
                    key={String(option.value)}
                    type="button"
                    className={durationMinutes === option.value ? styles.durationSelected : ''}
                    aria-pressed={durationMinutes === option.value}
                    onClick={() => setDurationMinutes(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className={styles.summary}>
              <span>参加予定</span>
              <strong>{arrivalTime ? `${arrivalTime}ごろ 〜 ${getDurationText()}` : '未定'}</strong>
            </div>
          </section>

          <section className={styles.submitCard}>
            <p>選んだ時間をもとに、会いやすい参加者をおすすめします</p>
            <button type="button" onClick={handleSubmit} disabled={isSubmitting || !arrivalTime}>
              {isSubmitting ? '処理中...' : 'この時間で参加する'}
            </button>
          </section>
        </main>
      </PageContainer>
    </div>
  );
};
