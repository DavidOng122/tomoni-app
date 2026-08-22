import React from 'react';
import Image from 'next/image';
import styles from './RegisteredPlanCard.module.css';
import { FixedPlanDraft } from '../types';
import { ACTIVITY_ICONS, ACTIVITY_LABELS } from '../lib/constants';
import { formatWeekdays } from '../lib/formatters';

interface RegisteredPlanCardProps {
  schedule: FixedPlanDraft;
  onEdit: (clientId: string) => void;
  onDelete: (clientId: string) => void;
}

export const RegisteredPlanCard: React.FC<RegisteredPlanCardProps> = ({ schedule, onEdit, onDelete }) => {
  const daysStr = formatWeekdays(schedule.daysOfWeek);
  const timeStr = schedule.activityType !== 'event' && schedule.startTime ? schedule.startTime : '';
  const placeName = schedule.place?.placeName || '';
  
  let activityLabel = schedule.activityType ? ACTIVITY_LABELS[schedule.activityType] : '';
  if (schedule.activityType === 'other') {
    activityLabel = schedule.customActivityName || 'その他';
  }

  const activityIcon = schedule.activityType
    ? ACTIVITY_ICONS[schedule.activityType]
    : ACTIVITY_ICONS.other;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.activityIdentity}>
          <span className={styles.activityIcon}>
            <Image src={activityIcon} width={26} height={26} alt="" aria-hidden="true" />
          </span>
          <h2 className={styles.activityName}>{activityLabel}</h2>
        </div>
        <div className={styles.actions}>
          <button type="button" className={`${styles.actionButton} ${styles.editButton}`} onClick={() => onEdit(schedule.clientId)}>
            <Image src="/images/schedules-edit.svg" width={14} height={14} alt="" aria-hidden="true" />
            <span>変更</span>
          </button>
          <div className={styles.divider} aria-hidden="true" />
          <button type="button" className={styles.actionButton} onClick={() => onDelete(schedule.clientId)}>
            <Image src="/images/schedules-delete.svg" width={14} height={14} alt="" aria-hidden="true" />
            <span>削除</span>
          </button>
        </div>
      </div>

      <div className={styles.infoRows}>
        {placeName && (
          <div className={styles.infoRow}>
            <Image className={styles.rowIcon} src="/images/schedules-place.svg" width={19} height={19} alt="" aria-hidden="true" />
            <div className={styles.rowText}>
              <span className={styles.rowLabel}>活動する場所</span>
              <span className={styles.rowValue}>{placeName}</span>
            </div>
            <Image className={styles.chevron} src="/images/schedules-chevron.svg" width={16} height={16} alt="" aria-hidden="true" />
          </div>
        )}
        <div className={styles.infoRow}>
          <Image className={styles.rowIcon} src="/images/schedules-weekday.svg" width={16} height={16} alt="" aria-hidden="true" />
          <div className={styles.rowText}>
            <span className={styles.rowLabel}>曜日</span>
            <span className={styles.rowValue}>{daysStr}</span>
          </div>
          <Image className={styles.chevron} src="/images/schedules-chevron.svg" width={16} height={16} alt="" aria-hidden="true" />
        </div>
        {timeStr && (
          <div className={styles.infoRow}>
            <Image className={styles.rowIcon} src="/images/schedules-time.svg" width={18} height={20} alt="" aria-hidden="true" />
            <div className={styles.rowText}>
              <span className={styles.rowLabel}>時間帯</span>
              <span className={styles.rowValue}>{timeStr}</span>
            </div>
            <Image className={styles.chevron} src="/images/schedules-chevron.svg" width={16} height={16} alt="" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
};
