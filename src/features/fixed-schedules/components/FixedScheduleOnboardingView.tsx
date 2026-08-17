"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './FixedScheduleOnboardingView.module.css';
import { ActivityType, DayOfWeek, FixedPlanDraft } from '../types';
import { Button } from '@/components/ui/Button';
import { FixedActionArea } from '@/components/layout/FixedActionArea';
import { useOnboardingSchedules } from '../onboarding/useOnboardingSchedules';
import { formatTo12Hour, formatTo24Hour } from '../lib/formatters';

import { FixedScheduleForm, isScheduleFormValid } from './FixedScheduleForm';

export const FixedScheduleOnboardingView: React.FC = () => {
  const router = useRouter();
  const { schedules, editingScheduleId, addSchedule, updateSchedule, clearEditing } = useOnboardingSchedules();

  const [draft, setDraft] = useState<Omit<FixedPlanDraft, 'clientId'>>(() => {
    if (editingScheduleId) {
      const editingSchedule = schedules.find((s) => s.clientId === editingScheduleId);
      if (editingSchedule) {
        return {
          activityType: editingSchedule.activityType,
          customActivityName: editingSchedule.customActivityName,
          daysOfWeek: [...editingSchedule.daysOfWeek],
          startTime: editingSchedule.startTime,
          place: editingSchedule.place,
        };
      }
    }
    return {
      activityType: null,
      customActivityName: null,
      daysOfWeek: [],
      startTime: '',
      place: null,
    };
  });

  const isNextEnabled = isScheduleFormValid(draft);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNextEnabled) return;
    
    if (editingScheduleId) {
      updateSchedule(editingScheduleId, draft);
    } else {
      addSchedule(draft);
    }
    clearEditing();
    router.push('/onboarding/schedules');
  };



  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.stepRow} aria-label="ステップ 1/3">
        <span className={styles.stepIndicator}>1/3</span>
      </div>
      <div className={styles.progressContainer}>
        <div className={styles.progressBarBg}>
          <div className={styles.progressBarFill} />
        </div>
      </div>

      <header className={styles.header}>
        <h1 className={styles.title}>固定予定を登録しましょう</h1>
        <p className={styles.description}>活動・曜日・時間帯を選んでください</p>
      </header>

      <FixedScheduleForm draft={draft} onChange={setDraft}>
        <FixedActionArea transparentBorder={true}>
          <div className={styles.actionContent}>
            <Button
              type="submit"
              fullWidth
              disabled={!isNextEnabled}
              className={styles.primaryAction}
            >
              次へ
            </Button>
            {schedules.length === 0 && (
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => router.push('/onboarding/profile')}
                className={styles.secondaryAction}
              >
                スキップ
              </Button>
            )}
          </div>
        </FixedActionArea>
      </FixedScheduleForm>
    </form>
  );
};
