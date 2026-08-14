import React from 'react';
import styles from '../CreateEventView.module.css';

interface EventDateTimeCardProps {
  startAt: string;
  endAt: string;
  onChangeStart: (val: string) => void;
  onChangeEnd: (val: string) => void;
  error?: string;
}

const formatJapaneseDateTime = (value: string) => {
  const [date = '', time = ''] = value.split('T');
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day || !time) return '';
  return `${year}年${month}月${day}日 ${time.slice(0, 5)}`;
};

const formatTime = (value: string) => value.split('T')[1]?.slice(0, 5) || '';

export const EventDateTimeCard: React.FC<EventDateTimeCardProps> = ({ startAt, endAt, onChangeStart, onChangeEnd, error }) => {
  return (
    <div className={`${styles.dateCard} ${error ? styles.hasError : ''}`}>
      <div className={styles.dateRow}>
        <img className={styles.dateDot} src="/images/events/create/start-dot.svg" alt="" aria-hidden="true" />
        <label htmlFor="event-start">開始</label>
        <div className={styles.dateControl}>
          <span>{formatJapaneseDateTime(startAt)}</span>
          <input
            id="event-start"
            type="datetime-local"
            lang="ja-JP"
            value={startAt}
            onChange={(e) => onChangeStart(e.target.value)}
          />
        </div>
      </div>
      <div className={styles.dateDivider} aria-hidden="true" />
      <div className={styles.dateRow}>
        <img className={styles.dateDot} src="/images/events/create/end-dot.svg" alt="" aria-hidden="true" />
        <label htmlFor="event-end">終了</label>
        <div className={styles.dateControl}>
          <span>{formatTime(endAt)}</span>
          <input
            id="event-end"
            type="datetime-local"
            lang="ja-JP"
            value={endAt}
            onChange={(e) => onChangeEnd(e.target.value)}
          />
        </div>
      </div>
      {error && <div className={styles.fieldError}>{error}</div>}
    </div>
  );
};
