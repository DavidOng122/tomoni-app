"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './FixedScheduleOnboardingView.module.css';
import { ActivityType, DayOfWeek, FixedPlanDraft } from '../types';
import { Button } from '@/components/ui/Button';
import { FixedActionArea } from '@/components/layout/FixedActionArea';
import { useOnboardingSchedules } from '../onboarding/useOnboardingSchedules';
import { formatTo12Hour, formatTo24Hour } from '../lib/formatters';

import { LocationSection } from './onboarding-form/LocationSection';
import { ActivityTypeSelector } from './onboarding-form/ActivityTypeSelector';
import { WeekdaySelector } from './onboarding-form/WeekdaySelector';
import { StartTimeSelector } from './onboarding-form/StartTimeSelector';

export const FixedScheduleOnboardingView: React.FC = () => {
  const router = useRouter();
  const { schedules, editingScheduleId, addSchedule, updateSchedule, clearEditing } = useOnboardingSchedules();

  const [draft, setDraft] = useState<Omit<FixedPlanDraft, 'clientId'>>(() => {
    if (editingScheduleId) {
      const editingSchedule = schedules.find((s) => s.clientId === editingScheduleId);
      if (editingSchedule) {
        return {
          activityType: editingSchedule.activityType,
          customActivityName: editingSchedule.customActivityName,
          daysOfWeek: [...editingSchedule.daysOfWeek],
          startTime: editingSchedule.startTime,
          place: editingSchedule.place,
        };
      }
    }
    return {
      activityType: null,
      customActivityName: null,
      daysOfWeek: [],
      startTime: '',
      place: null,
    };
  });

  const [displayTime, setDisplayTime] = useState('3:00');
  const [isPm, setIsPm] = useState(true);

  useEffect(() => {
    if (editingScheduleId) {
      const editingSchedule = schedules.find((s) => s.clientId === editingScheduleId);
      if (!editingSchedule) {
        clearEditing();
      } else if (editingSchedule.startTime) {
        const { time, isPm: pm } = formatTo12Hour(editingSchedule.startTime);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDisplayTime(time);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsPm(pm);
      }
    }
  }, [editingScheduleId, schedules, clearEditing]);

  // Sync internal display time to canonical startTime format
  useEffect(() => {
    if (displayTime) {
      const canonicalTime = formatTo24Hour(displayTime, isPm);
      if (canonicalTime) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft(prev => ({ ...prev, startTime: canonicalTime }));
      }
    }
  }, [displayTime, isPm]);

  const isNextEnabled =
    draft.activityType !== null &&
    draft.daysOfWeek.length > 0 &&
    draft.place !== null &&
    draft.startTime !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNextEnabled) return;
    
    if (editingScheduleId) {
      updateSchedule(editingScheduleId, draft);
    } else {
      addSchedule(draft);
    }
    clearEditing();
    router.push('/onboarding/schedules');
  };

  const handleActivityChange = (activityType: ActivityType) => {
    setDraft((prev) => ({ ...prev, activityType }));
  };

  const handleDayToggle = (day: DayOfWeek) => {
    setDraft((prev) => {
      const isSelected = prev.daysOfWeek.includes(day);
      const daysOfWeek = isSelected
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day];
      return { ...prev, daysOfWeek };
    });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9:]/g, '');
    setDisplayTime(val);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.progressContainer}>
        <div className={styles.progressBarBg}>
          <div className={styles.progressBarFill} />
        </div>
      </div>

      <header>
        <h1 className={styles.title}>固定予定を登録しましょう</h1>
        <p className={styles.description}>活動・曜日・時間帯を選んでください</p>
      </header>

      <LocationSection
        place={draft.place}
        onChange={(place) => setDraft(prev => ({ ...prev, place }))}
      />

      <ActivityTypeSelector
        value={draft.activityType}
        onChange={handleActivityChange}
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

      <FixedActionArea transparentBorder={true}>
        <Button
          type="submit"
          fullWidth
          disabled={!isNextEnabled}
          className={isNextEnabled ? styles.submitButtonEnabled : undefined}
        >
          次へ
        </Button>
      </FixedActionArea>
    </form>
  );
};
