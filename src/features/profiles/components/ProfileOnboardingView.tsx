"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './ProfileOnboardingView.module.css';
import { Gender, AgeRange, ProfileDraft } from '../types';
import { Button } from '@/components/ui/Button';
import { FixedActionArea } from '@/components/layout/FixedActionArea';
import { useOnboardingSchedules } from '@/features/fixed-schedules/onboarding/useOnboardingSchedules';

const GENDER_OPTIONS: { key: Gender; label: string; icon?: string }[] = [
  { key: 'female', label: '女性', icon: '♀' },
  { key: 'male', label: '男性', icon: '♂' },
  { key: 'prefer_not_to_say', label: '回答しない', icon: '−' },
];

const AGE_OPTIONS_TOP: { key: AgeRange; label: string }[] = [
  { key: '18_24', label: '18〜24歳' },
  { key: '25_34', label: '25〜34歳' },
  { key: '35_44', label: '35〜44歳' },
];

const AGE_OPTIONS_BOTTOM: { key: AgeRange; label: string }[] = [
  { key: '45_54', label: '45〜54歳' },
  { key: '55_plus', label: '55歳以上' },
];

export const ProfileOnboardingView: React.FC = () => {
  const router = useRouter();
  const { schedules } = useOnboardingSchedules();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<ProfileDraft>({
    nickname: '',
    gender: null,
    ageRange: null,
    avatarPreviewUrl: null,
  });

  useEffect(() => {
    if (schedules.length === 0) {
      router.replace('/onboarding/schedule');
    }
  }, [router, schedules.length]);

  useEffect(() => {
    return () => {
      if (draft.avatarPreviewUrl) {
        URL.revokeObjectURL(draft.avatarPreviewUrl);
      }
    };
  }, [draft.avatarPreviewUrl]);

  if (schedules.length === 0) {
    return null;
  }

  const handleGenderToggle = (gender: Gender) => {
    setDraft((prev) => ({
      ...prev,
      gender: prev.gender === gender ? null : gender,
    }));
  };

  const handleAgeChange = (ageRange: AgeRange) => {
    setDraft((prev) => ({ ...prev, ageRange }));
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const objectUrl = URL.createObjectURL(file);
        setDraft((prev) => {
          if (prev.avatarPreviewUrl) {
            URL.revokeObjectURL(prev.avatarPreviewUrl);
          }
          return { ...prev, avatarPreviewUrl: objectUrl };
        });
      } catch (error) {
        // Fallback or ignore on failure to create object URL
      }
    }
  };

  return (
    <form className={styles.container} onSubmit={(e) => e.preventDefault()}>
      <div className={styles.stepIndicator}>
        <span className={styles.stepCurrent}>3</span>
        <span className={styles.stepTotal}>/ 3</span>
      </div>

      <div className={styles.progressContainer}>
        <div className={styles.progressBarBg}>
          <div className={styles.progressBarFill} />
        </div>
      </div>

      <header>
        <h1 className={styles.title}>プロフィールを設定しましょう</h1>
        <p className={styles.subtitle}>おすすめに表示する基本情報を入力してください</p>
      </header>

      <div className={styles.avatarSection}>
        <div className={styles.avatarContainer}>
          {draft.avatarPreviewUrl ? (
            <Image
              src={draft.avatarPreviewUrl}
              alt="プロフィール画像のプレビュー"
              className={styles.avatarImage}
              width={102}
              height={102}
              unoptimized
            />
          ) : (
            <div className={styles.avatarImage}>
              <svg className={styles.avatarPlaceholderIcon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleAvatarSelect}
          />
          <button
            type="button"
            className={styles.cameraButton}
            onClick={() => fileInputRef.current?.click()}
            aria-label="プロフィール画像を選択"
          >
            <svg className={styles.cameraIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          ニックネーム
        </label>
        <input
          type="text"
          className={styles.textInput}
          placeholder="例：Mika"
          value={draft.nickname}
          onChange={(e) => setDraft((prev) => ({ ...prev, nickname: e.target.value }))}
        />
        <p className={styles.helpText}>本名でなくても構いません</p>
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          性別 <span className={styles.labelHint}>（任意）</span>
        </legend>
        <div className={styles.genderGrid}>
          {GENDER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={styles.optionButton}
              aria-pressed={draft.gender === opt.key}
              onClick={() => handleGenderToggle(opt.key)}
            >
              <div className={styles.optionIcon}>{opt.icon}</div>
              <div>{opt.label}</div>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          年代
        </legend>
        <div className={styles.ageGridTop}>
          {AGE_OPTIONS_TOP.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={styles.optionButton}
              aria-pressed={draft.ageRange === opt.key}
              onClick={() => handleAgeChange(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className={styles.ageGridBottom}>
          {AGE_OPTIONS_BOTTOM.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={styles.optionButton}
              aria-pressed={draft.ageRange === opt.key}
              onClick={() => handleAgeChange(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>

      <FixedActionArea transparentBorder={true}>
        {/* Profile completion destination will be connected after the post-onboarding route is implemented. */}
        <Button
          type="button"
          fullWidth
          disabled
        >
          登録を完了する
        </Button>
      </FixedActionArea>
    </form>
  );
};
