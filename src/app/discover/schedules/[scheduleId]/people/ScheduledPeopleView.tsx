'use client';

import React, { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { useRouter } from 'next/navigation';
import { DiscoverRecommendation, MatchReasonCode } from '@/features/discover/types';
import { createFixedScheduleInvitation } from '@/app/actions/createFixedScheduleInvitation';

import styles from './ScheduledPeopleView.module.css';

interface ScheduledPeopleViewProps {
  plan: {
    fixed_plan_id: string;
    days_of_week: string[];
    start_time: string;
    place_name: string | null;
  };
  recommendations: DiscoverRecommendation[];
}

const matchReasonLabels: Record<MatchReasonCode, string> = {
  same_activity: '朝の散歩が好き',
  same_time: '同じ時間ごろ',
  nearby: '近くに住んでいる',
  shared_day: '初参加',
};

const tagClassNames: Record<MatchReasonCode, string> = {
  same_activity: styles.tagWalking,
  same_time: styles.tagTime,
  nearby: styles.tagNearby,
  shared_day: styles.tagFirst,
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

export const ScheduledPeopleView: React.FC<ScheduledPeopleViewProps> = ({ plan, recommendations }) => {
  const router = useRouter();
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const handleBack = () => {
    if (window.history.length > 2) {
      router.back();
    } else {
      router.push('/discover');
    }
  };

  const handleInvite = async (personId: string) => {
    if (invitingId) return;
    setInvitingId(personId);
    
    const result = await createFixedScheduleInvitation(plan.fixed_plan_id, personId);
    
    if (result.success && result.conversationId) {
      router.push(`/chat/${result.conversationId}`);
    } else {
      alert(result.error || 'エラーが発生しました');
      setInvitingId(null);
    }
  };

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
            <h1>一緒に朝の散歩に行けそうな人</h1>

            <section className={styles.planCard} aria-label="固定予定">
              <div>
                <img src="/images/discover/scheduled-people/calendar.svg" alt="" aria-hidden="true" />
                <strong>固定予定</strong>
              </div>
              <div>
                <img src="/images/discover/scheduled-people/clock.svg" alt="" aria-hidden="true" />
                <span>{formattedDays} {formattedTime}ごろ</span>
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
                        <strong>{person.profile.nickname}</strong>
                        <div className={styles.tags}>
                          {person.match.reasons.slice(0, 2).map((reasonCode) => (
                            <span className={tagClassNames[reasonCode]} key={reasonCode}>
                              {matchReasonLabels[reasonCode]}
                            </span>
                          ))}
                        </div>
                        <span className={styles.personTime}>
                          <img src="/images/discover/scheduled-people/clock.svg" alt="" aria-hidden="true" />
                          {person.match.candidateStartTime.replace(/^0/, '')}ごろ
                        </span>
                      </div>

                      <button
                        type="button"
                        className={styles.inviteButton}
                        onClick={() => handleInvite(person.candidateId)}
                        disabled={invitingId !== null}
                      >
                        {invitingId === person.candidateId ? '送信中...' : '同行に誘う'}
                      </button>
                    </article>
                  ))
              )}
            </section>
          </main>
        </div>
      </PageContainer>
    </div>
  );
};
