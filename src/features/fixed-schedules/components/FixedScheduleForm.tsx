"use client";

import React, { useState, useEffect } from 'react';
import { ActivityType, DayOfWeek, FixedPlanDraft } from '../types';
import { formatTo12Hour, formatTo24Hour } from '../lib/formatters';

import { LocationSection } from './onboarding-form/LocationSection';
import { ActivityTypeSelector } from './onboarding-form/ActivityTypeSelector';
import { WeekdaySelector } from './onboarding-form/WeekdaySelector';
import { StartTimeSelector } from './onboarding-form/StartTimeSelector';

interface FixedScheduleFormProps {
  draft: Omit<FixedPlanDraft, 'clientId'>;
  onChange: (draft: Omit<FixedPlanDraft, 'clientId'>) => void;
  children?: React.ReactNode;
}

export const isScheduleFormValid = (draft: Omit<FixedPlanDraft, 'clientId'>) => {
  return (
    draft.activityType !== null &&
    (draft.activityType !== 'other' || (draft.customActivityName && draft.customActivityName.trim().length > 0)) &&
    draft.daysOfWeek.length > 0 &&
    draft.place !== null &&
    draft.startTime !== ''
  );
};

export const FixedScheduleForm: React.FC<FixedScheduleFormProps> = ({ draft, onChange, children }) => {
  const init = draft.startTime ? formatTo12Hour(draft.startTime) : { time: '3:00', isPm: true };
  const [displayTime, setDisplayTime] = useState(init.time);
  const [isPm, setIsPm] = useState(init.isPm);

  // Sync internal display time to canonical startTime format
  useEffect(() => {
    if (displayTime) {
      const canonicalTime = formatTo24Hour(displayTime, isPm);
      if (canonicalTime && canonicalTime !== draft.startTime) {
        onChange({ ...draft, startTime: canonicalTime });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayTime, isPm]);

  const handleActivityChange = (activityType: ActivityType) => {
    onChange({
      ...draft,
      activityType,
      customActivityName: activityType === 'other' ? draft.customActivityName : null
    });
  };

  const handleDayToggle = (day: DayOfWeek) => {
    const isSelected = draft.daysOfWeek.includes(day);
    const daysOfWeek = isSelected
      ? draft.daysOfWeek.filter((d) => d !== day)
      : [...draft.daysOfWeek, day];
    onChange({ ...draft, daysOfWeek });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let val = e.target.value.replace(/[^0-9:]/g, '');
    setDisplayTime(val);
  };

  return (
    <>
      <LocationSection
        place={draft.place}
        onChange={(place) => onChange({ ...draft, place })}
      />

      <ActivityTypeSelector
        value={draft.activityType}
        onChange={handleActivityChange}
        customName={draft.customActivityName}
        onCustomNameChange={(name) => onChange({ ...draft, customActivityName: name })}
      />

      <WeekdaySelector
        selectedDays={draft.daysOfWeek}
        onToggleDay={handleDayToggle}
      />

      <StartTimeSelector
        displayTime={displayTime}
        isPm={isPm}
        onTimeChange={handleTimeChange}
        onPmChange={setIsPm}
      />

      {children}
    </>
  );
};
