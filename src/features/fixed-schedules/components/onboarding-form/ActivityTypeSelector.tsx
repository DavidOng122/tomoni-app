import React from 'react';
import styles from '../FixedScheduleOnboardingView.module.css';
import { ActivityType } from '../../types';
import { ACTIVITY_LABELS } from '../../lib/constants';
import {
  WalkingIcon,
  DogWalkingIcon,
  StudyReadingIcon,
  SportsIcon,
  OtherIcon,
} from '../icons/ActivityIcons';

const EventIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const ACTIVITY_TYPES: { key: ActivityType; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { key: 'walking', label: ACTIVITY_LABELS.walking, icon: WalkingIcon },
  { key: 'event', label: ACTIVITY_LABELS.event, icon: EventIcon },
  { key: 'dog_walking', label: ACTIVITY_LABELS.dog_walking, icon: DogWalkingIcon },
  { key: 'study_reading', label: ACTIVITY_LABELS.study_reading, icon: StudyReadingIcon },
  { key: 'sports', label: ACTIVITY_LABELS.sports, icon: SportsIcon },
  { key: 'other', label: ACTIVITY_LABELS.other, icon: OtherIcon },
];

interface ActivityTypeSelectorProps {
  value: ActivityType | null;
  onChange: (type: ActivityType) => void;
}

export const ActivityTypeSelector: React.FC<ActivityTypeSelectorProps> = ({ value, onChange }) => {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>活動タイプ</legend>
      <div className={styles.activityGrid}>
        {ACTIVITY_TYPES.map(({ key, label, icon: Icon }) => {
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
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              )}
              <Icon />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
};
