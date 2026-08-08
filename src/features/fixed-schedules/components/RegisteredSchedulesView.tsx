"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './RegisteredSchedulesView.module.css';
import { useOnboardingSchedules } from '../onboarding/useOnboardingSchedules';
import { ActivityType, DayOfWeek } from '../types';
import { Button } from '@/components/ui/Button';
import { FixedActionArea } from '@/components/layout/FixedActionArea';

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  walking: '散歩',
  event: 'イベント',
  dog_walking: '犬の散歩',
  study_reading: '勉強・読書',
  sports: 'スポーツ',
  other: 'その他',
};

const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: '月',
  tue: '火',
  wed: '水',
  thu: '木',
  fri: '金',
  sat: '土',
  sun: '日',
};

const DAY_ORDER: Record<DayOfWeek, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 7,
};

export const RegisteredSchedulesView: React.FC = () => {
  const router = useRouter();
  const { schedules, beginEditing, clearEditing, deleteSchedule } = useOnboardingSchedules();

  useEffect(() => {
    if (schedules.length === 0) {
      router.replace('/onboarding/schedule');
    }
  }, [router, schedules.length]);

  if (schedules.length === 0) {
    return null;
  }

  const handleEdit = (clientId: string) => {
    beginEditing(clientId);
    router.push('/onboarding/schedule');
  };

  const handleDelete = (clientId: string) => {
    if (window.confirm('この固定予定を削除しますか？')) {
      deleteSchedule(clientId);
    }
  };

  const handleAddAnother = () => {
    clearEditing();
    router.push('/onboarding/schedule');
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (schedules.length > 0) {
      router.push('/onboarding/profile');
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>登録した予定</h1>

      <div className={styles.cardList}>
        {schedules.map((schedule) => {
          const sortedDays = [...schedule.daysOfWeek].sort((a, b) => DAY_ORDER[a] - DAY_ORDER[b]);
          const daysStr = sortedDays.map(d => DAY_LABELS[d]).join('・');
          const timeStr = schedule.startTime ? ` | ${schedule.startTime}` : '';
          
          return (
            <div key={schedule.clientId} className={styles.card}>
              <div>
                <h2 className={styles.activityName}>
                  {schedule.activityType ? ACTIVITY_LABELS[schedule.activityType] : ''}
                </h2>
                <p className={styles.scheduleSummary}>
                  {daysStr}{timeStr}
                </p>
              </div>
              <div className={styles.actions}>
                <button type="button" className={styles.actionButton} onClick={() => handleEdit(schedule.clientId)}>
                  変更
                </button>
                <div className={styles.divider} aria-hidden="true" />
                <button type="button" className={styles.actionButton} onClick={() => handleDelete(schedule.clientId)}>
                  削除
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" className={styles.addAnotherButton} onClick={handleAddAnother}>
        ＋ 別の固定予定を追加する
      </button>

      <FixedActionArea transparentBorder={true}>
        <Button
          fullWidth
          disabled={schedules.length === 0}
          onClick={handleNext}
          style={schedules.length > 0 ? { backgroundColor: '#FF8861', color: '#FFFFFF' } : undefined}
        >
          次へ
        </Button>
      </FixedActionArea>
    </div>
  );
};
