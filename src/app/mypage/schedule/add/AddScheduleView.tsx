"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FixedPlanDraft } from '@/features/fixed-schedules/types';
import { Button } from '@/components/ui/Button';
import { FixedActionArea } from '@/components/layout/FixedActionArea';
import { FixedScheduleForm, isScheduleFormValid } from '@/features/fixed-schedules/components/FixedScheduleForm';
import { createFixedPlanAction } from '@/app/actions/createFixedPlanAction';
import styles from '@/features/fixed-schedules/components/FixedScheduleOnboardingView.module.css';

export const AddScheduleView: React.FC = () => {
  const router = useRouter();
  
  const [draft, setDraft] = useState<Omit<FixedPlanDraft, 'clientId'>>({
    activityType: null,
    customActivityName: null,
    daysOfWeek: [],
    startTime: '',
    place: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = isScheduleFormValid(draft, 'edogawa-area') && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    
    setIsSubmitting(true);
    setError(null);
    try {
      await createFixedPlanAction(draft);
      router.push('/mypage');
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'エラーが発生しました');
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <header className={styles.header}>
        <h1 className={styles.title}>固定予定の追加</h1>
        <p className={styles.description}>活動・曜日などを選んでください</p>
      </header>

      {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: '16px' }}>{error}</div>}

      <FixedScheduleForm draft={draft} onChange={setDraft} locationMode="edogawa-area">
        <FixedActionArea transparentBorder={true}>
          <div className={styles.actionContent}>
            <Button
              type="submit"
              fullWidth
              disabled={!isValid}
              className={styles.primaryAction}
            >
              {isSubmitting ? '保存中...' : '保存する'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              fullWidth
              disabled={isSubmitting}
              onClick={() => router.push('/mypage')}
              className={styles.secondaryAction}
            >
              キャンセル
            </Button>
          </div>
        </FixedActionArea>
      </FixedScheduleForm>
    </form>
  );
};
