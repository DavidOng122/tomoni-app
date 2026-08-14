import React from 'react';
import styles from '../CreateEventView.module.css';

interface EventTitleFieldProps {
  title: string;
  onChange: (val: string) => void;
  error?: string;
}

export const EventTitleField: React.FC<EventTitleFieldProps> = ({ title, onChange, error }) => {
  return (
    <div className={styles.field}>
      <input 
        type="text" 
        placeholder="イベント名" 
        value={title}
        onChange={(e) => onChange(e.target.value)}
        className={`${styles.textInput} ${error ? styles.hasError : ''}`}
      />
      {error && <div className={styles.fieldError}>{error}</div>}
    </div>
  );
};
