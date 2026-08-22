'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FixedPlanDraft } from '@/features/fixed-schedules/types';
import { Button } from '@/components/ui/Button';
import { FixedActionArea } from '@/components/layout/FixedActionArea';
import {
  FixedScheduleForm,
  isScheduleFormValid,
} from '@/features/fixed-schedules/components/FixedScheduleForm';
import { updateFixedPlanAction } from '@/app/actions/updateFixedPlanAction';
import styles from '@/features/fixed-schedules/components/FixedScheduleOnboardingView.module.css';

interface EditScheduleViewProps {
  fixedPlanId: string;
  initialDraft: Omit<FixedPlanDraft, 'clientId'>;
}

export function EditScheduleView({
  fixedPlanId,
  initialDraft,
}: EditScheduleViewProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isValid = isScheduleFormValid(draft, 'edogawa-area') && !isSubmitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await updateFixedPlanAction(fixedPlanId, draft);
      router.push('/mypage');
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'エラーが発生しました');
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <header className={styles.header}>
        <h1 className={styles.title}>固定予定の編集</h1>
        <p className={styles.description}>活動・曜日などを変更できます</p>
      </header>

      {error ? (
        <p role="alert" style={{ color: '#c62828', textAlign: 'center', margin: 0 }}>
          {error}
        </p>
      ) : null}

      <FixedScheduleForm draft={draft} onChange={setDraft} locationMode="edogawa-area">
        <FixedActionArea transparentBorder>
          <div className={styles.actionContent}>
            <Button
              type="submit"
              fullWidth
              disabled={!isValid}
              className={styles.primaryAction}
            >
              {isSubmitting ? '保存中...' : '変更を保存する'}
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
}
