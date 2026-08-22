import React from 'react';
import Image from 'next/image';
import styles from '../FixedScheduleOnboardingView.module.css';
import { ActivityType } from '../../types';
import { ACTIVITY_ICONS, ACTIVITY_LABELS } from '../../lib/constants';

const ACTIVITY_TYPES: { key: ActivityType; label: string; icon: string }[] = [
  { key: 'walking', label: ACTIVITY_LABELS.walking, icon: ACTIVITY_ICONS.walking },
  { key: 'dog_walking', label: ACTIVITY_LABELS.dog_walking, icon: ACTIVITY_ICONS.dog_walking },
  { key: 'event', label: ACTIVITY_LABELS.event, icon: ACTIVITY_ICONS.event },
  { key: 'study_reading', label: ACTIVITY_LABELS.study_reading, icon: ACTIVITY_ICONS.study_reading },
  { key: 'sports', label: ACTIVITY_LABELS.sports, icon: ACTIVITY_ICONS.sports },
  { key: 'other', label: ACTIVITY_LABELS.other, icon: ACTIVITY_ICONS.other },
];

interface ActivityTypeSelectorProps {
  value: ActivityType | null;
  onChange: (type: ActivityType) => void;
  customName: string | null;
  onCustomNameChange: (name: string) => void;
}

export const ActivityTypeSelector: React.FC<ActivityTypeSelectorProps> = ({ value, onChange, customName, onCustomNameChange }) => {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>
        <span className={styles.legendContent}>
          <Image src="/images/onboarding-activity.svg" width={20} height={20} alt="" aria-hidden="true" />
          <span>活動タイプ</span>
        </span>
      </legend>
      <div className={styles.activityGrid}>
        {ACTIVITY_TYPES.map(({ key, label, icon }) => {
          const isSelected = value === key;
          return (
            <button
              key={key}
              type="button"
              className={styles.activityButton}
              aria-pressed={isSelected}
              onClick={() => onChange(key)}
            >
              {isSelected && (
                <span className={styles.checkIcon}>
                  <Image src="/images/onboarding-check.svg" width={10} height={8} alt="" aria-hidden="true" />
                </span>
              )}
              <span className={styles.activityIcon}>
                <Image src={icon} width={26} height={26} alt="" aria-hidden="true" />
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      {value === 'other' && (
        <div className={styles.customNameContainer}>
          <label className={styles.label}>活動名</label>
          <input
            type="text"
            className={styles.textInput}
            placeholder="例：ヨガ"
            value={customName || ''}
            onChange={(e) => onCustomNameChange(e.target.value)}
          />
        </div>
      )}
    </fieldset>
  );
};
