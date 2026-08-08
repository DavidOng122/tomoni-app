import React from 'react';
import styles from '../FixedScheduleOnboardingView.module.css';
import { SelectedPlace } from '@/features/locations/types';
import { LocationAutocomplete } from '@/features/locations/components/LocationAutocomplete';

interface LocationSectionProps {
  place: SelectedPlace | null;
  onChange: (place: SelectedPlace | null) => void;
}

export const LocationSection: React.FC<LocationSectionProps> = ({ place, onChange }) => {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>活動する場所</legend>
      <div className={styles.locationInputWrapper}>
        <svg className={styles.locationIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <LocationAutocomplete
          className={styles.locationInput}
          placeholder="公園・駅・施設名を入力"
          value={place}
          onChange={onChange}
        />
      </div>
    </fieldset>
  );
};
