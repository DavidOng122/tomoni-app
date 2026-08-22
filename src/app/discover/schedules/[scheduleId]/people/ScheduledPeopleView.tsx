'use client';

import React, { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { useRouter } from 'next/navigation';
import { DiscoverRecommendation, MatchReasonCode } from '@/features/discover/types';
import {
  getRecommendationHeading,
  getRecommendationNickname,
  getRecommendationReasonLabel,
} from '@/features/discover/domain/getRecommendationPresentation';
import { createFixedScheduleInvitation } from '@/app/actions/createFixedScheduleInvitation';
import { getFixedPlanEventRecommendations } from '@/app/actions/getFixedPlanEventRecommendations';
import type {
  FixedPlanEventRecommendation,
  SelectedFixedPlanRecommendation,
} from '@/features/invitations/domain/eventRecommendationTypes';

import styles from './ScheduledPeopleView.module.css';

interface ScheduledPeopleViewProps {
  plan: {
    fixed_plan_id: string;
    days_of_week: string[];
    start_time: string;
    place_name: string | null;
    activity_type: string;
  };
  activityTitle: string;
  recommendations: DiscoverRecommendation[];
}

const tagClassNames: Record<MatchReasonCode, string> = {
  same_activity: styles.tagWalking,
  same_time: styles.tagTime,
  nearby: styles.tagNearby,
  shared_day: styles.tagSharedDay,
};

const dayLabels: Record<string, string> = {
  mon: '月曜',
  tue: '火曜',
  wed: '水曜',
  thu: '木曜',
  fri: '金曜',
  sat: '土曜',
  sun: '日曜',
};

export const ScheduledPeopleView: React.FC<ScheduledPeopleViewProps> = ({ plan, activityTitle, recommendations }) => {
  const router = useRouter();
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [loadingRecommendationsId, setLoadingRecommendationsId] = useState<string | null>(null);
  const [inviteTarget, setInviteTarget] = useState<{
    personId: string;
    candidatePlanId: string;
    nickname: string;
  } | null>(null);
  const [eventRecommendations, setEventRecommendations] = useState<FixedPlanEventRecommendation[]>([]);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);

  const handleBack = () => {
    if (window.history.length > 2) {
      router.back();
    } else {
      router.push('/discover');
    }
  };

  const sendInvitation = async (
    personId: string,
    candidatePlanId: string,
    recommendation: SelectedFixedPlanRecommendation | null = null,
  ) => {
    if (invitingId) return;
    setInvitingId(personId);
    
    const result = await createFixedScheduleInvitation(
      plan.fixed_plan_id,
      personId,
      candidatePlanId,
      recommendation,
    );
    
    if (result.success && result.conversationId) {
      router.push(`/chat/${result.conversationId}`);
    } else {
      alert(result.error || 'エラーが発生しました');
      setInvitingId(null);
    }
  };

  const handleInvite = async (personId: string, candidatePlanId: string, nickname: string) => {
    if (plan.activity_type !== 'event') {
      await sendInvitation(personId, candidatePlanId);
      return;
    }
    if (loadingRecommendationsId || invitingId) return;
    setLoadingRecommendationsId(personId);
    setRecommendationError(null);
    const result = await getFixedPlanEventRecommendations(plan.fixed_plan_id, candidatePlanId);
    setLoadingRecommendationsId(null);
    if (!result.success) {
      setRecommendationError(result.error);
      return;
    }
    setEventRecommendations(result.recommendations);
    setInviteTarget({ personId, candidatePlanId, nickname });
  };

  const closeRecommendationSheet = () => {
    if (invitingId) return;
    setInviteTarget(null);
    setEventRecommendations([]);
  };

  const chooseRecommendation = async (recommendation: FixedPlanEventRecommendation) => {
    if (!inviteTarget) return;
    await sendInvitation(inviteTarget.personId, inviteTarget.candidatePlanId, {
      kind: recommendation.kind,
      id: recommendation.recommendationId,
    });
  };

  const formatEventDate = (iso: string): string => new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));

  const formatDistance = (meters: number): string => meters < 1000
    ? `約${Math.round(meters / 100) * 100}m`
    : `約${(meters / 1000).toFixed(1)}km`;

  const registrationLabel = (status: string | null): string | null => ({
    not_required: '申込不要',
    not_started: '申込開始前',
    open: '申込受付中',
  } as Record<string, string>)[status ?? ''] ?? null;

  const formattedDays = plan.days_of_week.map((day) => dayLabels[day] || day).join('・');
  const formattedTime = plan.start_time.substring(0, 5).replace(/^0/, '');

  return (
    <div className={styles.screen}>
      <PageContainer bottomInset="none" className={styles.page}>
        <div className={styles.stage}>
          <button type="button" onClick={handleBack} className={styles.backButton} aria-label="戻る">
            <img src="/images/discover/scheduled-people/back.svg" alt="" aria-hidden="true" />
          </button>

          <main>
            <h1>{getRecommendationHeading(activityTitle)}</h1>

            <section className={styles.planCard} aria-label="固定予定">
              <div>
                <img src="/images/discover/scheduled-people/calendar.svg" alt="" aria-hidden="true" />
                <strong>固定予定</strong>
              </div>
              <div>
                <img src="/images/discover/scheduled-people/clock.svg" alt="" aria-hidden="true" />
                <span>{formattedDays}{plan.activity_type === 'event' ? '' : ` ${formattedTime}ごろ`}</span>
              </div>
              <div>
                <img src="/images/discover/scheduled-people/location.svg" alt="" aria-hidden="true" />
                <span>{plan.place_name}</span>
              </div>
            </section>

            <section className={styles.peopleList} aria-label="おすすめの人">
              {recommendations.length === 0 ? (
                <div className={styles.emptyState}>
                  現在おすすめできるユーザーがいません。<br />もう少しお待ちください。
                </div>
              ) : (
                recommendations.map((person) => (
                    <article className={styles.personCard} key={person.candidateId}>
                      <span className={styles.avatar}>
                        {person.profile.avatarUrl ? (
                          <img src={person.profile.avatarUrl} alt={person.profile.nickname} />
                        ) : null}
                      </span>

                      <div className={styles.personInfo}>
                        <strong>{getRecommendationNickname(person.profile.nickname)}</strong>
                        <div className={styles.tags}>
                          {person.match.reasons.slice(0, 2).map((reasonCode) => (
                            <span className={tagClassNames[reasonCode]} key={reasonCode}>
                              {getRecommendationReasonLabel(reasonCode, activityTitle)}
                            </span>
                          ))}
                        </div>
                        {plan.activity_type !== 'event' && (
                          <span className={styles.personTime}>
                            <img src="/images/discover/scheduled-people/clock.svg" alt="" aria-hidden="true" />
                            {person.match.candidateStartTime.replace(/^0/, '')}ごろ
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        className={styles.inviteButton}
                        onClick={() => handleInvite(
                          person.candidateId,
                          person.match.candidatePlanId,
                          getRecommendationNickname(person.profile.nickname),
                        )}
                        disabled={invitingId !== null || loadingRecommendationsId !== null}
                      >
                        {invitingId === person.candidateId
                          ? '送信中...'
                          : loadingRecommendationsId === person.candidateId
                            ? '検索中...'
                            : '同行に誘う'}
                      </button>
                    </article>
                  ))
              )}
            </section>
            {recommendationError && <p className={styles.recommendationError}>{recommendationError}</p>}
          </main>
        </div>
      </PageContainer>

      {inviteTarget && (
        <div className={styles.recommendationOverlay} role="presentation" onMouseDown={closeRecommendationSheet}>
          <section
            className={styles.recommendationSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-recommendation-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className={styles.sheetHandle} aria-hidden="true" />
            <button type="button" className={styles.sheetClose} onClick={closeRecommendationSheet} aria-label="閉じる">×</button>
            <p className={styles.sheetEyebrow}>{inviteTarget.nickname}さんとの同行</p>
            <h2 id="event-recommendation-title">一緒に行く場所を選ぶ</h2>
            <p className={styles.sheetDescription}>おふたりの曜日に合う江戸川区の候補です</p>

            {eventRecommendations.length > 0 ? (
              <>
                <div className={styles.eventRecommendationList}>
                  {eventRecommendations.map((recommendation) => (
                    <button
                      type="button"
                      className={styles.eventRecommendationCard}
                      key={`${recommendation.kind}:${recommendation.recommendationId}`}
                      onClick={() => chooseRecommendation(recommendation)}
                      disabled={invitingId !== null}
                    >
                      {recommendation.imageUrl ? (
                        <img src={recommendation.imageUrl} alt="" className={styles.eventRecommendationImage} />
                      ) : (
                        <span className={styles.eventRecommendationPlaceholder} aria-hidden="true">⌖</span>
                      )}
                      <span className={styles.eventRecommendationContent}>
                        <span className={styles.eventRecommendationKind}>
                          {recommendation.kind === 'event' ? '公式イベント' : '文化施設'}
                        </span>
                        <strong>{recommendation.title}</strong>
                        {recommendation.startAt && <span>{formatEventDate(recommendation.startAt)}</span>}
                        <span>{recommendation.placeName}</span>
                        {registrationLabel(recommendation.registrationStatus) && (
                          <span>{registrationLabel(recommendation.registrationStatus)}</span>
                        )}
                        <span className={styles.eventRecommendationDistances}>
                          あなたから {formatDistance(recommendation.senderDistanceMeters)} ・ 相手から {formatDistance(recommendation.receiverDistanceMeters)}
                        </span>
                        <span className={styles.eventRecommendationSource}>{recommendation.sourceName} Open Data</span>
                        {recommendation.requiresHoursConfirmation && (
                          <span className={styles.hoursWarning}>営業時間・入場条件は公式ページでご確認ください</span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
                <div className={styles.decideLaterOption}>
                  <span>おすすめを選ばず、同行成立後にチャットで相談できます</span>
                  <button
                    type="button"
                    onClick={() => sendInvitation(inviteTarget.personId, inviteTarget.candidatePlanId)}
                    disabled={invitingId !== null}
                  >
                    あとでふたりで決める
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.noEventRecommendation}>
                <strong>近くに条件の合う候補がありませんでした</strong>
                <span>場所はあとでふたりで相談できます</span>
                <button
                  type="button"
                  onClick={() => sendInvitation(inviteTarget.personId, inviteTarget.candidatePlanId)}
                  disabled={invitingId !== null}
                >
                  あとでふたりで決める
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
