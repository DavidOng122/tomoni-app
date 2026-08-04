"use client";

import React, { useState } from 'react';
import styles from './FixedScheduleOnboardingView.module.css';
import { ActivityType, DayOfWeek, TimeSlot, FixedScheduleDraft } from '../types';
import { Button } from '@/components/ui/Button';
import { FixedActionArea } from '@/components/layout/FixedActionArea';
import {
  WalkingIcon,
  RunningIcon,
  DogWalkingIcon,
  StudyReadingIcon,
  SportsIcon,
  OtherIcon,
} from './icons/ActivityIcons';

const ACTIVITY_TYPES: { key: ActivityType; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { key: 'walking', label: '散歩', icon: WalkingIcon },
  { key: 'running', label: 'ランニング', icon: RunningIcon },
  { key: 'dog_walking', label: '犬の散歩', icon: DogWalkingIcon },
  { key: 'study_reading', label: '勉強・読書', icon: StudyReadingIcon },
  { key: 'sports', label: 'スポーツ', icon: SportsIcon },
  { key: 'other', label: 'その他', icon: OtherIcon },
];

const DAYS_OF_WEEK: { key: DayOfWeek; label: string }[] = [
  { key: 'monday', label: '月' },
  { key: 'tuesday', label: '火' },
  { key: 'wednesday', label: '水' },
  { key: 'thursday', label: '木' },
  { key: 'friday', label: '金' },
  { key: 'saturday', label: '土' },
  { key: 'sunday', label: '日' },
];

const TIME_SLOTS: { key: TimeSlot; label: string }[] = [
  { key: 'morning', label: '朝' },
  { key: 'daytime', label: '昼' },
  { key: 'evening', label: '夕方' },
  { key: 'night', label: '夜' },
];

export const FixedScheduleOnboardingView: React.FC = () => {
  const [draft, setDraft] = useState<FixedScheduleDraft>({
    activityType: null,
    daysOfWeek: [],
    timeSlot: null,
    locationQuery: '',
  });

  const isNextEnabled =
    draft.activityType !== null &&
    draft.daysOfWeek.length > 0 &&
    draft.locationQuery.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNextEnabled) return;
    
    // valid, but doing nothing right now (no API, no routing)
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

  const handleTimeSlotToggle = (timeSlot: TimeSlot) => {
    setDraft((prev) => ({
      ...prev,
      timeSlot: prev.timeSlot === timeSlot ? null : timeSlot,
    }));
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
          <input
            type="text"
            className={styles.locationInput}
            placeholder="公園・駅・施設名を入力"
            value={draft.locationQuery}
            onChange={(e) => setDraft((prev) => ({ ...prev, locationQuery: e.target.value }))}
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
        <legend className={styles.legend}>時間帯</legend>
        <div className={styles.timeSlotGrid}>
          {TIME_SLOTS.map(({ key, label }) => {
            const isSelected = draft.timeSlot === key;
            return (
              <button
                key={key}
                type="button"
                className={styles.timeSlotButton}
                aria-pressed={isSelected}
                onClick={() => handleTimeSlotToggle(key)}
              >
                {label}
              </button>
            );
          })}
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
