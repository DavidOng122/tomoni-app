import React from 'react';
import Image from 'next/image';
import styles from '../FixedScheduleOnboardingView.module.css';

interface StartTimeSelectorProps {
  displayTime: string;
  isPm: boolean;
  onTimeChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onPmChange: (isPm: boolean) => void;
}

const TIME_OPTIONS = Array.from({ length: 24 }, (_, index) => {
  const hour = Math.floor(index / 2) + 1;
  const minutes = index % 2 === 0 ? '00' : '30';
  return `${hour}:${minutes}`;
});

export const StartTimeSelector: React.FC<StartTimeSelectorProps> = ({
  displayTime,
  isPm,
  onTimeChange,
  onPmChange,
}) => {
  return (
    <fieldset className={`${styles.fieldset} ${styles.timeFieldset}`}>
      <legend className={styles.legend}>
        <span className={styles.legendContent}>
          <Image src="/images/onboarding-time.svg" width={18} height={18} alt="" aria-hidden="true" />
          <span>時間</span>
        </span>
      </legend>
      <div className={styles.timeInputContainer}>
        <select
          className={styles.timeInputBox}
          value={displayTime}
          onChange={onTimeChange}
          aria-label="開始時間"
        >
          {TIME_OPTIONS.map((time) => (
            <option key={time} value={time}>{time}</option>
          ))}
        </select>
        <div className={styles.amPmControl}>
          <button
            type="button"
            className={styles.amPmButton}
            aria-pressed={!isPm}
            onClick={() => onPmChange(false)}
          >
            AM
          </button>
          <button
            type="button"
            className={styles.amPmButton}
            aria-pressed={isPm}
            onClick={() => onPmChange(true)}
          >
            PM
          </button>
        </div>
      </div>
    </fieldset>
  );
};
