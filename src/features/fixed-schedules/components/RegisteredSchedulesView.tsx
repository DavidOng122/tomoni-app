"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './RegisteredSchedulesView.module.css';
import { useOnboardingSchedules } from '../onboarding/useOnboardingSchedules';
import { ActivityType, DayOfWeek, TimeSlot } from '../types';
import { Button } from '@/components/ui/Button';
import { FixedActionArea } from '@/components/layout/FixedActionArea';

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  walking: '散歩',
  running: 'ランニング',
  dog_walking: '犬の散歩',
  study_reading: '勉強・読書',
  sports: 'スポーツ',
  other: 'その他',
};

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: '月',
  tuesday: '火',
  wednesday: '水',
  thursday: '木',
  friday: '金',
  saturday: '土',
  sunday: '日',
};

const TIME_LABELS: Record<TimeSlot, string> = {
  morning: '朝',
  daytime: '昼',
  evening: '夕方',
  night: '夜',
};

const DAY_ORDER: Record<DayOfWeek, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
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
          const timeStr = schedule.timeSlot ? ` | ${TIME_LABELS[schedule.timeSlot]}` : '';
          
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
