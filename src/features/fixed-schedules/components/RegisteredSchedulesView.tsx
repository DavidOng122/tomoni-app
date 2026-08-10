"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './RegisteredSchedulesView.module.css';
import { useOnboardingSchedules } from '../onboarding/useOnboardingSchedules';
import { Button } from '@/components/ui/Button';
import { FixedActionArea } from '@/components/layout/FixedActionArea';
import { RegisteredPlanCard } from './RegisteredPlanCard';

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
      <div className={styles.stepRow} aria-label="ステップ 2/3">
        <span className={styles.stepIndicator}>2/3</span>
      </div>
      <div className={styles.progressContainer}>
        <div className={styles.progressBarBg}>
          <div className={styles.progressBarFill} />
        </div>
      </div>

      <h1 className={styles.title}>登録した予定</h1>

      <div className={styles.cardList}>
        {schedules.map((schedule) => (
          <RegisteredPlanCard
            key={schedule.clientId}
            schedule={schedule}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <button type="button" className={styles.addAnotherButton} onClick={handleAddAnother}>
        <span aria-hidden="true">＋</span>
        <span>別の固定予定を追加する</span>
      </button>

      <FixedActionArea transparentBorder={true}>
        <Button
          fullWidth
          disabled={schedules.length === 0}
          onClick={handleNext}
          className={styles.primaryAction}
        >
          次へ
        </Button>
      </FixedActionArea>
    </div>
  );
};
