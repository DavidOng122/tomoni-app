'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { ACTIVITY_LABELS } from '@/features/fixed-schedules/lib/constants';
import { formatWeekdays } from '@/features/fixed-schedules/lib/formatters';
import { SignOutButton } from '@/features/auth/components/SignOutButton';
import { getGenderLabel, getTagLabel } from './lib/mappers';

import styles from './MyPageView.module.css';

interface MyPageViewProps {
  profile: any;
  fixedPlans: any[];
}

export const MyPageView: React.FC<MyPageViewProps> = ({ profile, fixedPlans }) => {
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const displayedProfile = profile;
  const displayedFixedPlans = fixedPlans;
  const displayedFixedPlanCount = fixedPlans.length;
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
              {'　❘　世田谷区'}
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
          </section>

          <section className={styles.fixedPlansSection}>
            <h3>固定予定</h3>
            <div className={styles.planList}>
              {displayedFixedPlans.length === 0 ? (
                <div className={`${styles.planCard} ${styles.emptyPlan}`}>固定予定がありません</div>
              ) : (
                displayedFixedPlans.map((plan) => (
                  <article key={plan.fixed_plan_id} className={styles.planCard}>
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
                        {plan.start_time.substring(0, 5).replace(/^0/, '')}〜
                        {plan.end_time?.substring(0, 5)}
                      </span>
                    </p>
                    <p>
                      <img src="/images/mypage/location.svg" alt="" aria-hidden="true" />
                      <span>{plan.place_name}</span>
                    </p>
                  </article>
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
        </main>
      </PageContainer>
      <BottomNavigation items={navItems} />

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
