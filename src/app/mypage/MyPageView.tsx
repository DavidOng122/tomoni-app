'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { ACTIVITY_LABELS } from '@/features/fixed-schedules/lib/constants';
import { formatWeekdays } from '@/features/fixed-schedules/lib/formatters';
import { SignOutButton } from '@/features/auth/components/SignOutButton';
import { getGenderLabel, getTagLabel } from './lib/mappers';
import { getConnectionPreview } from '@/features/connections/domain/getConnectionPreview';
import { archiveFixedPlanAction } from '@/app/actions/archiveFixedPlanAction';

import styles from './MyPageView.module.css';

interface ConnectedProfile {
  user_id: string;
  nickname: string;
  avatar_url: string;
}

interface MyPageViewProps {
  profile: any;
  fixedPlans: any[];
  attendedEventCount: number;
  connectionCount: number;
  connectedProfiles: ConnectedProfile[];
}

export const MyPageView: React.FC<MyPageViewProps> = ({ profile, fixedPlans, attendedEventCount, connectionCount, connectedProfiles }) => {
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [visibleFixedPlans, setVisibleFixedPlans] = useState(fixedPlans);
  const [deletingFixedPlanId, setDeletingFixedPlanId] = useState<string | null>(null);
  const [planPendingDeletion, setPlanPendingDeletion] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const displayedProfile = profile;
  const displayedFixedPlanCount = visibleFixedPlans.length;
  const { visibleProfiles, overflowCount } = getConnectionPreview(connectedProfiles);

  const handleDeleteFixedPlan = async (fixedPlanId: string) => {
    setDeletingFixedPlanId(fixedPlanId);
    setDeleteError(null);
    try {
      await archiveFixedPlanAction(fixedPlanId);
      setVisibleFixedPlans((plans) => plans.filter(
        (plan) => plan.fixed_plan_id !== fixedPlanId,
      ));
      setPlanPendingDeletion(null);
      router.refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : '固定予定の削除に失敗しました');
    } finally {
      setDeletingFixedPlanId(null);
    }
  };
  const navItems = [
    {
      label: 'みつける',
      icon: <span aria-hidden="true" className={`${styles.navIcon} ${styles.discoverIcon}`} />,
      isActive: false,
      onClick: () => router.push('/discover'),
    },
    {
      label: 'つながり',
      icon: <span aria-hidden="true" className={`${styles.navIcon} ${styles.connectionsIcon}`} />,
      isActive: false,
      onClick: () => router.push('/connections'),
    },
    {
      label: 'マイページ',
      icon: <span aria-hidden="true" className={`${styles.navIcon} ${styles.myPageIcon}`} />,
      isActive: true,
      activeColor: '#ff6b47',
      activeIconBgColor: '#eeeeee',
      onClick: () => {},
    },
  ];

  return (
    <div className={styles.screen}>
      <PageContainer bottomInset="nav" className={styles.page}>
        <main className={styles.content}>
          <header className={styles.header}>
            <h1>マイページ</h1>
            <button 
              type="button" 
              className={styles.settingsButton} 
              aria-label="設定"
              onClick={() => setIsSettingsOpen(true)}
            >
              <img src="/images/mypage/settings.svg" alt="" aria-hidden="true" />
            </button>
          </header>

          <section className={styles.profileArea} aria-label="プロフィール">
            <div className={styles.avatarWrap}>
              <img
                className={styles.profileAvatar}
                src={displayedProfile.avatar_url || '/images/mypage/profile-miki.png'}
                alt={displayedProfile.nickname}
              />
              <button type="button" className={styles.avatarEditButton} aria-label="プロフィール画像を編集">
                <img src="/images/mypage/avatar-edit.svg" alt="" aria-hidden="true" />
              </button>
            </div>
            <h2>{displayedProfile.nickname}</h2>
            <p className={styles.profileMeta}>
              {displayedProfile.age_range}歳
              {displayedProfile.gender && displayedProfile.gender !== 'prefer_not_to_say'
                ? `　❘　${getGenderLabel(displayedProfile.gender)}`
                : null}
              {'　❘　江戸川区'}
            </p>

            {displayedProfile.tags?.length > 0 ? (
              <div className={styles.tags}>
                {displayedProfile.tags.map((tag: string) => (
                  <span key={tag}>{getTagLabel(tag)}</span>
                ))}
              </div>
            ) : null}

            {displayedProfile.bio ? <p className={styles.bio}>{displayedProfile.bio}</p> : null}
          </section>

          <section className={styles.stats} aria-label="活動実績">
            <div>
              <strong>{displayedFixedPlanCount}</strong>
              <span>固定予定</span>
            </div>
            <div>
              <strong>{attendedEventCount}</strong>
              <span>参加済み</span>
            </div>
            <div>
              <strong>{connectionCount}</strong>
              <span>つながり</span>
            </div>
          </section>

          <section className={styles.fixedPlansSection}>
            <div className={styles.fixedPlansHeader}>
              <h3>固定予定</h3>
              <button
                type="button"
                className={styles.companionPlansLink}
                onClick={() => router.push('/connections?tab=plans')}
              >
                同行予定を見る <span aria-hidden="true">›</span>
              </button>
            </div>
            <div className={styles.planList}>
              {visibleFixedPlans.length === 0 ? (
                <div className={`${styles.planCard} ${styles.emptyPlan}`}>固定予定がありません</div>
              ) : (
                visibleFixedPlans.map((plan) => (
                  <div key={plan.fixed_plan_id} className={styles.planItem}>
                    <button
                      type="button"
                      className={styles.planCard}
                      onClick={() => router.push(`/mypage/schedule/${plan.fixed_plan_id}/edit`)}
                      aria-label={`${plan.activity_type === 'other' ? plan.custom_activity_name : ACTIVITY_LABELS[plan.activity_type as keyof typeof ACTIVITY_LABELS] || plan.activity_type}を編集`}
                    >
                      <h4>
                        {plan.activity_type === 'other'
                          ? plan.custom_activity_name
                          : ACTIVITY_LABELS[plan.activity_type as keyof typeof ACTIVITY_LABELS] ||
                            plan.activity_type}
                      </h4>
                      <p>
                        <img src="/images/mypage/calendar.svg" alt="" aria-hidden="true" />
                        <span>
                          {formatWeekdays(plan.days_of_week)}{' '}
                          {plan.activity_type === 'event'
                            ? null
                            : `${plan.start_time.substring(0, 5).replace(/^0/, '')}〜`}
                        </span>
                      </p>
                      <p>
                        <img src="/images/mypage/location.svg" alt="" aria-hidden="true" />
                        <span>{plan.place_name}</span>
                      </p>
                    </button>
                    <button
                      type="button"
                      className={styles.deletePlanButton}
                      disabled={deletingFixedPlanId === plan.fixed_plan_id}
                      onClick={() => {
                        setDeleteError(null);
                        setPlanPendingDeletion(plan);
                      }}
                    >
                      <Image src="/images/schedules-delete.svg" width={14} height={14} alt="" aria-hidden="true" />
                      {deletingFixedPlanId === plan.fixed_plan_id ? '削除中...' : '削除'}
                    </button>
                  </div>
                ))
              )}
            </div>
            <button 
              type="button" 
              className={styles.addPlanButton}
              onClick={() => router.push('/mypage/schedule/add')}
            >
              <span aria-hidden="true">＋</span>
              別の固定予定を追加する
            </button>
          </section>

          <section className={styles.connectionsSection}>
            <h3>つながり</h3>
            <button
              type="button"
              className={styles.connectionSummaryCard}
              onClick={() => router.push('/connections')}
            >
              <span className={styles.connectionSummaryLabel}>
                <span>江戸川区</span>
                <span>つながった人</span>
              </span>

              <span className={styles.connectionSummaryAction}>
                {visibleProfiles.length > 0 ? (
                  <span className={styles.connectionAvatarStack} aria-label={`${connectionCount}人とつながっています`}>
                    {visibleProfiles.map((person) => (
                      <img
                        key={person.user_id}
                        src={person.avatar_url || '/images/mypage/profile-miki.png'}
                        alt={person.nickname}
                      />
                    ))}
                    {overflowCount > 0 ? (
                      <span className={styles.connectionOverflow}>+{overflowCount}</span>
                    ) : null}
                  </span>
                ) : null}
                <img
                  className={styles.connectionChevron}
                  src="/images/mypage/chevron.svg"
                  alt=""
                  aria-hidden="true"
                />
              </span>
            </button>
          </section>
        </main>
      </PageContainer>
      <BottomNavigation items={navItems} />

      {planPendingDeletion ? (
        <div
          className={styles.deleteModalOverlay}
          onClick={() => {
            if (!deletingFixedPlanId) setPlanPendingDeletion(null);
          }}
        >
          <section
            className={styles.deleteModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-plan-title"
            onClick={(event) => event.stopPropagation()}
          >
            <span className={styles.deleteModalIcon} aria-hidden="true">
              <Image src="/images/schedules-delete.svg" width={22} height={22} alt="" />
            </span>
            <h3 id="delete-plan-title">固定予定を削除しますか？</h3>
            <p className={styles.deleteModalPlanName}>
              {planPendingDeletion.activity_type === 'other'
                ? planPendingDeletion.custom_activity_name
                : ACTIVITY_LABELS[planPendingDeletion.activity_type as keyof typeof ACTIVITY_LABELS]
                  || planPendingDeletion.activity_type}
            </p>
            <p className={styles.deleteModalDescription}>
              この固定予定はマイページとおすすめから表示されなくなります。
            </p>
            <div className={styles.deleteModalNotice}>
              返事待ちの同行のお誘いも同時に取り消されます。決定済みの同行とチャットは残ります。
            </div>
            {deleteError ? <p className={styles.deleteModalError} role="alert">{deleteError}</p> : null}
            <div className={styles.deleteModalActions}>
              <button
                type="button"
                className={styles.deleteModalCancel}
                disabled={Boolean(deletingFixedPlanId)}
                onClick={() => setPlanPendingDeletion(null)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className={styles.deleteModalConfirm}
                disabled={Boolean(deletingFixedPlanId)}
                onClick={() => handleDeleteFixedPlan(planPendingDeletion.fixed_plan_id)}
              >
                {deletingFixedPlanId ? '削除中...' : '削除する'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isSettingsOpen && (
        <div className={styles.settingsModalOverlay} onClick={() => setIsSettingsOpen(false)}>
          <div className={styles.settingsModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.settingsModalHeader}>
              <h3>設定</h3>
              <button type="button" className={styles.settingsModalClose} onClick={() => setIsSettingsOpen(false)}>✕</button>
            </div>
            <div className={styles.settingsModalBody}>
              <SignOutButton fullWidth />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
