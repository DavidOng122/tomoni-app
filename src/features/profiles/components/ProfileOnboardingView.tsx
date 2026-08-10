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

const VISIBLE_TAG_OPTIONS = TAG_OPTIONS.slice(0, 7);

export const ProfileOnboardingView: React.FC = () => {
  const router = useRouter();
  const { schedules, profileDraft: draft, setProfileDraft: setDraft } = useOnboardingSchedules();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [customTagInput, setCustomTagInput] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);



  const handleTagToggle = (tagValue: string) => {
    setDraft((prev: ProfileDraft) => {
      const isSelected = prev.tags.includes(tagValue);
      if (isSelected) {
        return { ...prev, tags: prev.tags.filter((t: string) => t !== tagValue) };
      }
      if (prev.tags.length >= 5) {
        return prev;
      }
      return { ...prev, tags: [...prev.tags, tagValue] };
    });
  };

  const normalizedCustomTag = customTagInput?.trim() || '';
  const matchingPredefinedTag = TAG_OPTIONS.find((tag) => tag.label === normalizedCustomTag);
  const customTagValue = matchingPredefinedTag?.value || normalizedCustomTag;
  const canAddCustomTag =
    normalizedCustomTag.length > 0 &&
    draft.tags.length < 5 &&
    !draft.tags.includes(customTagValue);
  const customTags = draft.tags.filter(
    (tagValue) => !TAG_OPTIONS.some((tag) => tag.value === tagValue)
  );

  const handleAddCustomTag = () => {
    if (!canAddCustomTag) return;

    setDraft((prev: ProfileDraft) => {
      if (prev.tags.length >= 5 || prev.tags.includes(customTagValue)) {
        return prev;
      }
      return { ...prev, tags: [...prev.tags, customTagValue] };
    });
    setCustomTagInput(null);
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
        setDraft((prev: ProfileDraft) => ({ ...prev, avatarUrl: publicUrl }));

    } catch (error) {
      console.error("Avatar upload failed", error);
      // Ensure we don't save a fake URL if upload fails
      setDraft((prev: ProfileDraft) => ({ ...prev, avatarUrl: null }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("認証エラー: ログインし直してください。");
      }

      const p_profile = {
        nickname: draft.nickname.trim(),
        avatar_url: draft.avatarUrl,
        age_range: draft.ageRange,
        gender: draft.gender,
        tags: draft.tags,
        bio: draft.bio.trim() === "" ? null : draft.bio.trim()
      };

      const p_schedules = schedules.map(plan => ({
        activity_type: plan.activityType,
        custom_activity_name: plan.activityType === "other" ? plan.customActivityName?.trim() || null : null,
        days_of_week: plan.daysOfWeek,
        start_time: plan.startTime + ":00",
        place_id: plan.place?.placeId || '',
        place_name: plan.place?.placeName || '',
        latitude: plan.place?.latitude || 0,
        longitude: plan.place?.longitude || 0
      }));

      const { error } = await supabase.rpc('complete_onboarding', {
        p_profile,
        p_schedules
      });

      if (error) {
        if (error.code === 'TM005') {
          const { data: userData } = await supabase
            .from('users')
            .select('onboarding_status')
            .eq('id', user.id)
            .single();

          if (userData?.onboarding_status === 'completed') {
            router.replace('/discover');
            return;
          }
        }
        console.error("RPC Error:", error);
        throw new Error("登録処理に失敗しました。もう一度お試しください。");
      }

      router.replace('/discover');
    } catch (error: any) {
      console.error(error);
      setSubmitError(error.message || "エラーが発生しました");
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.container} onSubmit={handleSubmit}>
      <div className={styles.stepRow} aria-label="ステップ 3/3">
        <span className={styles.stepIndicator}>3/3</span>
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
          onChange={(e) => setDraft((prev: ProfileDraft) => ({ ...prev, nickname: e.target.value }))}
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
          onChange={(e) => setDraft((prev: ProfileDraft) => ({ ...prev, ageRange: e.target.value as AgeRange }))}
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
          onChange={(e) => setDraft((prev: ProfileDraft) => ({ ...prev, gender: e.target.value as Gender }))}
        >
          <option value="" disabled>性別を選択</option>
          {GENDER_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={`${styles.legend} ${styles.tagLegend}`}>
          <span>興味のあるタグ</span>
          <span className={styles.tagCount}>{draft.tags.length}/5</span>
        </legend>
        <p className={styles.helperText}>
          気になるものを選んでください。<br />
          3つ以上選ぶのがおすすめです。
        </p>
        <div className={styles.tagsContainer}>
          {VISIBLE_TAG_OPTIONS.map((tag) => {
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
          {customTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`${styles.tagButton} ${styles.customTagButton}`}
              aria-pressed="true"
              aria-label={`${tag}を削除`}
              onClick={() => handleTagToggle(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        {customTagInput === null ? (
          <button
            type="button"
            className={styles.addTagButton}
            disabled={draft.tags.length >= 5}
            onClick={() => setCustomTagInput('')}
          >
            <span aria-hidden="true">＋</span>
            <span>タグを追加</span>
          </button>
        ) : (
          <div className={styles.customTagEditor}>
            <input
              type="text"
              className={styles.customTagInput}
              value={customTagInput}
              maxLength={20}
              placeholder="タグを入力"
              aria-label="追加するタグ"
              autoFocus
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomTag();
                }
              }}
            />
            <button
              type="button"
              className={styles.confirmTagButton}
              disabled={!canAddCustomTag}
              onClick={handleAddCustomTag}
            >
              追加
            </button>
            <button
              type="button"
              className={styles.cancelTagButton}
              aria-label="タグ追加をキャンセル"
              onClick={() => setCustomTagInput(null)}
            >
              ×
            </button>
          </div>
        )}
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
          onChange={(e) => setDraft((prev: ProfileDraft) => ({ ...prev, bio: e.target.value }))}
        />
      </fieldset>

      <FixedActionArea transparentBorder={true}>
        {submitError && (
          <div style={{ color: 'red', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
            {submitError}
          </div>
        )}
        <Button
          type="submit"
          fullWidth
          disabled={!isValid || isSubmitting || isUploading}
          className={styles.primaryAction}
        >
          {isSubmitting ? '登録中...' : '登録を完了する'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          fullWidth
          disabled={isSubmitting}
          onClick={() => {
            if (schedules.length === 0) {
              router.push('/onboarding/schedule');
            } else {
              router.push('/onboarding/schedules');
            }
          }}
          className={styles.secondaryAction}
        >
          戻る
        </Button>
      </FixedActionArea>
    </form>
  );
};
