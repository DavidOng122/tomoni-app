import React from 'react';
import Image from 'next/image';
import styles from '../FixedScheduleOnboardingView.module.css';
import { SelectedPlace } from '@/features/locations/types';
import { LocationAutocomplete } from '@/features/locations/components/LocationAutocomplete';
import {
  EDOGAWA_AREAS,
  getEdogawaAreaPlace,
  getSelectedEdogawaAreaName,
} from '@/features/locations/domain/edogawaAreas';

interface LocationSectionProps {
  place: SelectedPlace | null;
  onChange: (place: SelectedPlace | null) => void;
  mode?: 'google-place' | 'edogawa-area';
}

export const LocationSection: React.FC<LocationSectionProps> = ({
  place,
  onChange,
  mode = 'google-place',
}) => {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>
        <span className={styles.legendContent}>
          <Image src="/images/onboarding-location.svg" width={19} height={19} alt="" aria-hidden="true" />
          <span>活動する場所</span>
        </span>
      </legend>
      <div className={styles.locationInputWrapper}>
        {mode === 'edogawa-area' ? (
          <>
            <select
              className={`${styles.locationInput} ${styles.areaSelect}`}
              aria-label="活動するエリア"
              value={getSelectedEdogawaAreaName(place)}
              onChange={(event) => onChange(getEdogawaAreaPlace(event.target.value))}
            >
              <option value="" disabled>エリアを選択</option>
              {EDOGAWA_AREAS.map((area) => (
                <option key={area.name} value={area.name}>{area.name}</option>
              ))}
            </select>
            <svg className={styles.areaSelectChevron} viewBox="0 0 20 20" aria-hidden="true">
              <path d="m6 8 4 4 4-4" />
            </svg>
          </>
        ) : (
          <>
            <Image className={styles.locationIcon} src="/images/onboarding-search.svg" width={17} height={17} alt="" aria-hidden="true" />
            <LocationAutocomplete
              className={styles.locationInput}
              placeholder="公園・駅・施設名を入力"
              value={place}
              onChange={onChange}
            />
          </>
        )}
      </div>
    </fieldset>
  );
};
