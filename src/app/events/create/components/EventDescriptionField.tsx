import React from 'react';
import styles from '../CreateEventView.module.css';

interface EventDescriptionFieldProps {
  description: string;
  onChange: (val: string) => void;
}

export const EventDescriptionField: React.FC<EventDescriptionFieldProps> = ({ description, onChange }) => {
  return (
    <div className={styles.descriptionField}>
      <textarea 
        placeholder="説明を追加"
        value={description}
        onChange={(e) => onChange(e.target.value)}
        className={styles.descriptionInput}
        rows={1}
      />
    </div>
  );
};
