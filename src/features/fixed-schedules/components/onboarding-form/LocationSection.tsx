import React from 'react';
import Image from 'next/image';
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
      <legend className={styles.legend}>
        <span className={styles.legendContent}>
          <Image src="/images/onboarding-location.svg" width={19} height={19} alt="" aria-hidden="true" />
          <span>活動する場所</span>
        </span>
      </legend>
      <div className={styles.locationInputWrapper}>
        <Image className={styles.locationIcon} src="/images/onboarding-search.svg" width={17} height={17} alt="" aria-hidden="true" />
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
