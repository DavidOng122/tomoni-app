import React from 'react';
import styles from '../FixedScheduleOnboardingView.module.css';

interface StartTimeSelectorProps {
  displayTime: string;
  isPm: boolean;
  onTimeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPmChange: (isPm: boolean) => void;
}

export const StartTimeSelector: React.FC<StartTimeSelectorProps> = ({
  displayTime,
  isPm,
  onTimeChange,
  onPmChange,
}) => {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>時間</legend>
      <div className={styles.timeInputContainer}>
        <input
          type="text"
          className={styles.timeInputBox}
          value={displayTime}
          onChange={onTimeChange}
          placeholder="3:00"
          maxLength={5}
        />
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
