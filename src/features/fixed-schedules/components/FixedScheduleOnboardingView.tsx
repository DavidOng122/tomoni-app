"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './FixedScheduleOnboardingView.module.css';
import { ActivityType, DayOfWeek, FixedPlanDraft } from '../types';
import { SelectedPlace } from '@/features/locations/types';
import { LocationAutocomplete } from '@/features/locations/components/LocationAutocomplete';
import { Button } from '@/components/ui/Button';
import { FixedActionArea } from '@/components/layout/FixedActionArea';
import { useOnboardingSchedules } from '../onboarding/useOnboardingSchedules';
import {
  WalkingIcon,
  DogWalkingIcon,
  StudyReadingIcon,
  SportsIcon,
  OtherIcon,
} from './icons/ActivityIcons';

// Simple Event Icon since we need to replace RunningIcon
const EventIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const ACTIVITY_TYPES: { key: ActivityType; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { key: 'walking', label: '散歩', icon: WalkingIcon },
  { key: 'event', label: 'イベント', icon: EventIcon },
  { key: 'dog_walking', label: '犬の散歩', icon: DogWalkingIcon },
  { key: 'study_reading', label: '勉強・読書', icon: StudyReadingIcon },
  { key: 'sports', label: 'スポーツ', icon: SportsIcon },
  { key: 'other', label: 'その他', icon: OtherIcon },
];

const DAYS_OF_WEEK: { key: DayOfWeek; label: string }[] = [
  { key: 'mon', label: '月' },
  { key: 'tue', label: '火' },
  { key: 'wed', label: '水' },
  { key: 'thu', label: '木' },
  { key: 'fri', label: '金' },
  { key: 'sat', label: '土' },
  { key: 'sun', label: '日' },
];

// Helper for time conversion
const formatTo12Hour = (timeStr: string) => {
  if (!timeStr) return { time: '', isPm: false };
  const [h, m] = timeStr.split(':');
  let hour = parseInt(h, 10);
  const isPm = hour >= 12;
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return { time: `${hour}:${m || '00'}`, isPm };
};

const formatTo24Hour = (time: string, isPm: boolean) => {
  if (!time) return '';
  let [h, m] = time.split(':');
  if (!h || !m) return '';
  let hour = parseInt(h, 10);
  if (isNaN(hour)) return '';
  
  if (isPm && hour < 12) hour += 12;
  if (!isPm && hour === 12) hour = 0;
  
  return `${hour.toString().padStart(2, '0')}:${m.padStart(2, '0')}`;
};

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
    router.push('/onboarding/schedules'); // Redirects to RegisteredSchedulesView
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
    // Basic formatting for time input (allow numbers and colon)
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
            value={draft.place}
            onChange={(place) => setDraft(prev => ({ ...prev, place }))}
          />
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>活動タイプ</legend>
        <div className={styles.activityGrid}>
          {ACTIVITY_TYPES.map(({ key, label, icon: Icon }) => {
            const isSelected = draft.activityType === key;
            return (
              <button
                key={key}
                type="button"
                className={styles.activityButton}
                aria-pressed={isSelected}
                onClick={() => handleActivityChange(key)}
              >
                {isSelected && (
                  <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                )}
                <Icon />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>曜日</legend>
        <div className={styles.weekdayGrid}>
          {DAYS_OF_WEEK.map(({ key, label }) => {
            const isSelected = draft.daysOfWeek.includes(key);
            return (
              <button
                key={key}
                type="button"
                className={styles.weekdayButton}
                aria-pressed={isSelected}
                onClick={() => handleDayToggle(key)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>時間</legend>
        <div className={styles.timeInputContainer}>
          <input
            type="text"
            className={styles.timeInputBox}
            value={displayTime}
            onChange={handleTimeChange}
            placeholder="3:00"
            maxLength={5}
          />
          <div className={styles.amPmControl}>
            <button
              type="button"
              className={styles.amPmButton}
              aria-pressed={!isPm}
              onClick={() => setIsPm(false)}
            >
              AM
            </button>
            <button
              type="button"
              className={styles.amPmButton}
              aria-pressed={isPm}
              onClick={() => setIsPm(true)}
            >
              PM
            </button>
          </div>
        </div>
      </fieldset>

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
