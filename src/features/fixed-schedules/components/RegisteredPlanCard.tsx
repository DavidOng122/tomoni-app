import React from 'react';
import styles from './RegisteredPlanCard.module.css';
import { FixedPlanDraft } from '../types';
import { ACTIVITY_LABELS } from '../lib/constants';
import { formatWeekdays } from '../lib/formatters';

interface RegisteredPlanCardProps {
  schedule: FixedPlanDraft;
  onEdit: (clientId: string) => void;
  onDelete: (clientId: string) => void;
}

export const RegisteredPlanCard: React.FC<RegisteredPlanCardProps> = ({ schedule, onEdit, onDelete }) => {
  const daysStr = formatWeekdays(schedule.daysOfWeek);
  const timeStr = schedule.startTime ? schedule.startTime : '';
  const placeName = schedule.place?.placeName || '';
  
  let activityLabel = schedule.activityType ? ACTIVITY_LABELS[schedule.activityType] : '';
  if (schedule.activityType === 'other') {
    activityLabel = schedule.customActivityName || 'その他';
  }

  return (
    <div className={styles.card}>
      <div className={styles.detailsArea}>
        <h2 className={styles.activityName}>{activityLabel}</h2>
        <div className={styles.rows}>
          {placeName && <p className={styles.scheduleSummary}>{placeName}</p>}
          <p className={styles.scheduleSummary}>
            {daysStr} {timeStr && `| ${timeStr}`}
          </p>
        </div>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.actionButton} onClick={() => onEdit(schedule.clientId)}>
          変更
        </button>
        <div className={styles.divider} aria-hidden="true" />
        <button type="button" className={styles.actionButton} onClick={() => onDelete(schedule.clientId)}>
          削除
        </button>
      </div>
    </div>
  );
};
