"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './ProfileOnboardingView.module.css';
import { Gender, AgeRange, ProfileDraft } from '../types';
import { Button } from '@/components/ui/Button';
import { FixedActionArea } from '@/components/layout/FixedActionArea';
import { useOnboardingSchedules } from '@/features/fixed-schedules/onboarding/useOnboardingSchedules';
import { uploadAvatar } from '../lib/avatarStorage';
import { createClient } from '@/infrastructure/auth/client';

const GENDER_OPTIONS: { key: Gender; label: string }[] = [
  { key: 'male', label: '男性' },
  { key: 'female', label: '女性' },
  { key: 'other', label: 'その他' },
  { key: 'prefer_not_to_say', label: '回答しない' },
];

const AGE_OPTIONS: { key: AgeRange; label: string }[] = [
  { key: '18-24', label: '18〜24歳' },
  { key: '25-34', label: '25〜34歳' },
  { key: '35-44', label: '35〜44歳' },
  { key: '45-54', label: '45〜54歳' },
  { key: '55+', label: '55歳以上' },
];

const TAG_OPTIONS = [
  { value: 'walking', label: '散歩' },
  { value: 'movie', label: '映画' },
  { value: 'music', label: '音楽' },
  { value: 'reading', label: '読書' },
  { value: 'local_event', label: '地域イベント' },
  { value: 'exhibition', label: '展覧会' },
  { value: 'cafe', label: 'カフェ' },
  { value: 'wellness', label: '健康づくり' },
  { value: 'casual_social', label: '気軽な交流' },
  { value: 'weekend_activity', label: '週末活動' },
  { value: 'nearby', label: '近い場所' },
  { value: 'calm_social', label: '落ち着いた交流' },
];

export const ProfileOnboardingView: React.FC = () => {
  const router = useRouter();
  const { schedules } = useOnboardingSchedules();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<ProfileDraft>({
    nickname: '',
    gender: null,
    ageRange: null,
    avatarUrl: null,
    tags: [],
    bio: '',
  });

  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);



  const handleTagToggle = (tagValue: string) => {
    setDraft((prev) => {
      const isSelected = prev.tags.includes(tagValue);
      if (isSelected) {
        return { ...prev, tags: prev.tags.filter(t => t !== tagValue) };
      }
      if (prev.tags.length >= 5) {
        return prev;
      }
      return { ...prev, tags: [...prev.tags, tagValue] };
    });
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return objectUrl;
      });

      setIsUploading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      const publicUrl = await uploadAvatar(user.id, file);
      setDraft(prev => ({ ...prev, avatarUrl: publicUrl }));

    } catch (error) {
      console.error("Avatar upload failed", error);
      // Ensure we don't save a fake URL if upload fails
      setDraft(prev => ({ ...prev, avatarUrl: null }));
    } finally {
      setIsUploading(false);
    }
  };

  const isValid = 
    draft.nickname.trim() !== '' &&
    draft.avatarUrl !== null &&
    draft.ageRange !== null &&
    draft.gender !== null &&
    draft.tags.length <= 5 &&
    !isUploading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    
    // complete_onboarding will be called here later
    // console.log("Profile draft:", draft);
  };

  return (
    <form className={styles.container} onSubmit={handleSubmit}>
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
          {avatarPreviewUrl || draft.avatarUrl ? (
            <Image
              src={avatarPreviewUrl || draft.avatarUrl!}
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
            disabled={isUploading}
          />
          <button
            type="button"
            className={styles.cameraButton}
            onClick={() => fileInputRef.current?.click()}
            aria-label="プロフィール画像を選択"
            disabled={isUploading}
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

      <div className={styles.formGroup}>
        <label className={styles.label}>
          年代
        </label>
        <select
          className={styles.select}
          value={draft.ageRange || ''}
          onChange={(e) => setDraft(prev => ({ ...prev, ageRange: e.target.value as AgeRange }))}
        >
          <option value="" disabled>年齢を選択</option>
          {AGE_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          性別 <span className={styles.labelHint}>（任意）</span>
        </label>
        <select
          className={styles.select}
          value={draft.gender || ''}
          onChange={(e) => setDraft(prev => ({ ...prev, gender: e.target.value as Gender }))}
        >
          <option value="" disabled>性別を選択</option>
          {GENDER_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          興味のあるタグ
        </legend>
        <p className={styles.helperText}>
          気になるものを選んでください。<br />
          3つ以上選ぶのがおすすめです。
        </p>
        <div className={styles.tagsContainer}>
          {TAG_OPTIONS.map((tag) => {
            const isSelected = draft.tags.includes(tag.value);
            return (
              <button
                key={tag.value}
                type="button"
                className={styles.tagButton}
                aria-pressed={isSelected}
                onClick={() => handleTagToggle(tag.value)}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          自己紹介
        </legend>
        <p className={styles.helperText}>
          普段のことや、つながりたい雰囲気を書いてみましょう
        </p>
        <textarea
          className={styles.textarea}
          placeholder={`例：週末に散歩や地域イベントへ行くのが好きです。\n気軽に話せる人と出会えたらうれしいです。`}
          value={draft.bio}
          onChange={(e) => setDraft(prev => ({ ...prev, bio: e.target.value }))}
        />
      </fieldset>

      <FixedActionArea transparentBorder={true}>
        <Button
          type="submit"
          fullWidth
          disabled={!isValid}
          style={isValid ? { backgroundColor: '#FF845B', color: '#FFFFFF' } : undefined}
        >
          登録を完了する
        </Button>
      </FixedActionArea>
    </form>
  );
};
