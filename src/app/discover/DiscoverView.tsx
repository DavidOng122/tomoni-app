'use client';

import React from 'react';
import Image from 'next/image';
import { PageContainer } from '@/components/layout/PageContainer';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { useRouter } from 'next/navigation';
import { DiscoverRecommendation, MatchReasonCode } from '@/features/discover/types';
import { Database } from '@/types/database.types';
import { formatEventDateTime } from '@/utils/dateFormatter';
import { getParticipantAvatarPreview } from '@/features/events/domain/getParticipantAvatarPreview';
import type { EventParticipantPreviewData } from '@/features/events/lib/getEventParticipantPreview';
import styles from './DiscoverView.module.css';

type EventRow = Database['public']['Tables']['events']['Row'] & {
  isParticipating: boolean;
  organizerAvatarUrl: string | null;
  participantPreview: EventParticipantPreviewData | null;
};

export interface CurrentActivityData {
  name: string;
  verified: boolean;
  eventTitle: string;
  dateTime: string;
  location: string;
  avatarUrl: string | null;
}

interface RecommendationGroup {
  fixedPlanId: string;
  title: string;
  scheduleLabel: string;
  recommendations: DiscoverRecommendation[];
}

interface DiscoverViewProps {
  hasPlans: boolean;
  events: EventRow[];
  currentActivity?: CurrentActivityData | null;
  recommendationGroups: RecommendationGroup[];
  todayWeekday: string;
}

const matchReasonLabels: Omit<Record<MatchReasonCode, string>, 'same_activity'> = {
  same_time: '同じ時間ごろ',
  nearby: '近くに住んでいる',
  shared_day: '同じ曜日'
};

const getTagStyle = (tagCode: string) => {
  switch (tagCode) {
    case 'same_activity':
      return { background: '#fff3cd', color: '#8b6914' };
    case 'same_time':
      return { background: '#f8d7da', color: '#721c24' };
    case 'nearby':
      return { background: '#d4edda', color: '#2b7a3e' };
    case 'shared_day':
      return { background: '#d1ecf1', color: '#0c6370' };
    default:
      return { background: '#f0f4f8', color: '#334155' };
  }
};

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

export const DiscoverView: React.FC<DiscoverViewProps> = ({ hasPlans, events, currentActivity, recommendationGroups, todayWeekday }) => {
  const router = useRouter();
  const firstRecommendationGroup = recommendationGroups[0] ?? null;

  const navItems = [
    {
      label: 'みつける',
      icon: <span className={`${styles.navIcon} ${styles.navDiscoverIcon}`} aria-hidden="true" />,
      isActive: true,
      activeColor: '#FF8861',
      activeIconBgColor: '#E8E8E8',
      onClick: () => {}
    },
    {
      label: 'つながり',
      icon: <span className={`${styles.navIcon} ${styles.navConnectionsIcon}`} aria-hidden="true" />,
      isActive: false,
      onClick: () => router.push('/connections')
    },
    {
      label: 'マイページ',
      icon: <span className={`${styles.navIcon} ${styles.navProfileIcon}`} aria-hidden="true" />,
      isActive: false,
      onClick: () => router.push('/mypage')
    },
  ];

  return (
    <div className={styles.screen}>
      <PageContainer bottomInset="nav" className={styles.page}>
        <div className={styles.topActions}>
          <button
            className={styles.iconButton}
            onClick={() => router.push('/events/create')}
            aria-label="Create Public Event"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          </button>
          <button className={styles.iconButton} aria-label="Notifications">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          </button>
        </div>

        <main className={styles.content}>
          {currentActivity && (
            <section aria-label="現在の活動">
              <div className={styles.currentCard}>
                <div className={styles.currentAvatarGroup}>
                  {currentActivity.avatarUrl ? (
                    <img
                      className={styles.currentAvatar}
                      src={currentActivity.avatarUrl}
                      alt={currentActivity.name}
                      width="50"
                      height="50"
                    />
                  ) : (
                    <span className={styles.currentAvatar} aria-hidden="true" />
                  )}
                  {currentActivity.verified ? <span className={styles.verified}>確認済み</span> : null}
                </div>
                <div className={styles.currentDetails}>
                  <div className={styles.currentTitleLine}>
                    <h2>{currentActivity.name}</h2>
                    <span className={styles.titleDivider} aria-hidden="true" />
                    <h3>{currentActivity.eventTitle}</h3>
                  </div>
                  <div className={styles.metaLine}><ClockIcon /><span>{currentActivity.dateTime}</span></div>
                  <div className={styles.metaLine}><PinIcon /><span>{currentActivity.location}</span></div>
                </div>
              </div>
            </section>
          )}

          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <h2>予定からつながる</h2>
              {firstRecommendationGroup && firstRecommendationGroup.recommendations.length > 0 && (
                <button
                  type="button"
                  className={styles.seeAll}
                  onClick={() => router.push(`/discover/schedules/${firstRecommendationGroup.fixedPlanId}/people`)}
                >
                  すべて見る <span aria-hidden="true">›</span>
                </button>
              )}
            </div>

            {!hasPlans ? (
              <div className={styles.emptyState}>
                <p>固定予定を追加すると、<br/>近くで同じ活動をしている人を<br/>見つけられます</p>
                <button onClick={() => router.push('/mypage')}>固定予定を追加</button>
              </div>
            ) : (
              <div className={styles.recommendationGroups}>
                {recommendationGroups.map((group) => (
                  <div className={styles.recommendationPanel} key={group.fixedPlanId}>
                    <button
                      type="button"
                      className={styles.recommendationIntro}
                      onClick={() => router.push(`/discover/schedules/${group.fixedPlanId}/people`)}
                    >
                      <span className={styles.walkIcon} aria-hidden="true" />
                      <div>
                        <strong>一緒に{group.title}できそうな人</strong>
                        <span>固定予定：{group.scheduleLabel}</span>
                      </div>
                    </button>
                    {group.recommendations.length === 0 ? (
                      <div className={styles.recommendationEmpty}>
                        現在おすすめできるユーザーがいません。<br />もう少しお待ちください。
                      </div>
                    ) : (
                      <div className={styles.recommendationList}>
                        {group.recommendations.map((rec) => (
                          <div
                            key={rec.candidateId}
                            onClick={() => router.push(`/discover/schedules/${group.fixedPlanId}/people`)}
                            className={styles.recommendationCard}
                          >
                            <div className={styles.personLine}>
                              <div className={styles.avatarPlaceholder}>
                                {rec.profile.avatarUrl ? <img src={rec.profile.avatarUrl} alt={rec.profile.nickname} width="33" height="33" /> : null}
                              </div>
                              <span>{rec.profile.nickname}さん</span>
                            </div>
                            <div className={styles.tagList}>
                              {rec.match.reasons.slice(0, 2).map((reasonCode) => (
                                <span key={reasonCode} style={getTagStyle(reasonCode)}>
                                  {reasonCode === 'same_activity' ? `${group.title}が好き` : matchReasonLabels[reasonCode] || reasonCode}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.locationHeading}>
              <div>
                <h2>江戸川区</h2>
                <span>地域イベント</span>
              </div>
              <button>すべて見る <span aria-hidden="true">›</span></button>
            </div>

            <div className={styles.dayHeading}><strong>今日</strong><span>/ {todayWeekday}</span></div>

            <div className={styles.eventList}>
              {events.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>現在予定されているイベントはありません。</p>
                </div>
              ) : (
                events.map((event) => {
                  const { visibleUsers, overflowCount } = getParticipantAvatarPreview(event.participantPreview);

                  return (
                  <div
                    key={event.event_id}
                    onClick={() => router.push(`/events/${event.event_id}`)}
                    onKeyDown={(keyboardEvent) => {
                      if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                        keyboardEvent.preventDefault();
                        router.push(`/events/${event.event_id}`);
                      }
                    }}
                    className={styles.eventRow}
                    role="link"
                    tabIndex={0}
                  >
                    <div className={styles.poster}>
                      {event.poster_url ? (
                        <img src={event.poster_url} alt={event.title} width="88" height="90" />
                      ) : (
                        <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
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
                      <div className={styles.metaLine}><ClockIcon /><span>{formatEventDateTime(event.start_at, event.end_at)}</span></div>
                      <div className={styles.metaLine}><PinIcon /><span>{event.place_name}</span></div>
                      {visibleUsers.length > 0 || overflowCount > 0 ? (
                        <div className={styles.participantStack} aria-label={`${event.participantPreview?.participantCount || 0}人が参加予定`}>
                          {visibleUsers.map((participant) => (
                            <Image
                              key={participant.userId}
                              src={participant.avatarUrl}
                              alt={participant.nickname}
                              width={20}
                              height={20}
                            />
                          ))}
                          {overflowCount > 0 ? <span>+{overflowCount}</span> : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </section>
        </main>
      </PageContainer>

      <div className={styles.mapAction}>
        <button onClick={() => {}}>
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/></svg>
          地図
        </button>
      </div>

      <BottomNavigation items={navItems} />
    </div>
  );
};
