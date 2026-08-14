import React from 'react';
import { LocationAutocomplete } from '@/features/locations/components/LocationAutocomplete';
import { SelectedPlace } from '@/features/locations/types';
import styles from '../CreateEventView.module.css';

interface EventLocationFieldProps {
  selectedPlace: SelectedPlace | null;
  onChange: (place: SelectedPlace | null) => void;
  error?: string;
}

export const EventLocationField: React.FC<EventLocationFieldProps> = ({ selectedPlace, onChange, error }) => {
  return (
    <div className={styles.locationField}>
      <div className={`${styles.locationShell} ${error ? styles.hasError : ''}`}>
        <img src="/images/events/create/location.svg" alt="" aria-hidden="true" />
        <LocationAutocomplete 
          value={selectedPlace} 
          onChange={onChange} 
          placeholder="場所を選択"
          className={styles.locationInput}
        />
      </div>
      {error && <div className={styles.fieldError}>{error}</div>}
    </div>
  );
};
