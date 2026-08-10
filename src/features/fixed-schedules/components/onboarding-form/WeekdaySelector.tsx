import React from 'react';
import Image from 'next/image';
import styles from '../FixedScheduleOnboardingView.module.css';
import { DayOfWeek } from '../../types';
import { DAYS_OF_WEEK_LIST } from '../../lib/constants';

interface WeekdaySelectorProps {
  selectedDays: DayOfWeek[];
  onToggleDay: (day: DayOfWeek) => void;
}

export const WeekdaySelector: React.FC<WeekdaySelectorProps> = ({ selectedDays, onToggleDay }) => {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>
        <span className={styles.legendContent}>
          <Image className={styles.weekdayLegendIcon} src="/images/onboarding-weekday.svg" width={16} height={16} alt="" aria-hidden="true" />
          <span>曜日</span>
        </span>
      </legend>
      <div className={styles.weekdayGrid}>
        {DAYS_OF_WEEK_LIST.map(({ key, label }) => {
          const isSelected = selectedDays.includes(key);
          return (
            <button
              key={key}
              type="button"
              className={styles.weekdayButton}
              aria-pressed={isSelected}
              onClick={() => onToggleDay(key)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
};
