'use server';

import { createClient } from '@/infrastructure/auth/server';
import { FixedPlanDraft } from '@/features/fixed-schedules/types';

export async function createFixedPlanAction(draft: Omit<FixedPlanDraft, 'clientId'>) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('認証エラー: ログインし直してください。');
  }

  // 1. Validate activity_type
  const validActivityTypes = ['walking', 'dog_walking', 'event', 'study_reading', 'sports', 'other'];
  if (!draft.activityType || !validActivityTypes.includes(draft.activityType)) {
    throw new Error('無効な活動タイプです');
  }

  // 2. Validate custom_activity_name
  let customActivityName = null;
  if (draft.activityType === 'other') {
    if (!draft.customActivityName || draft.customActivityName.trim().length === 0) {
      throw new Error('活動名を入力してください');
    }
    customActivityName = draft.customActivityName.trim();
  }

  // 3. Validate days_of_week
  const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  if (!draft.daysOfWeek || draft.daysOfWeek.length === 0) {
    throw new Error('曜日を選択してください');
  }
  const hasInvalidDay = draft.daysOfWeek.some(day => !validDays.includes(day));
  if (hasInvalidDay) {
    throw new Error('無効な曜日が含まれています');
  }

  // 4. Validate start_time
  if (!draft.startTime || !/^\d{2}:\d{2}$/.test(draft.startTime)) {
    throw new Error('開始時間が無効です');
  }
  const startTimeWithSeconds = `${draft.startTime}:00`;

  // 5. Validate location
  if (!draft.place || !draft.place.placeName || typeof draft.place.latitude !== 'number' || typeof draft.place.longitude !== 'number') {
    throw new Error('場所を選択してください');
  }
  if (draft.place.latitude < -90 || draft.place.latitude > 90) {
    throw new Error('緯度が無効です');
  }
  if (draft.place.longitude < -180 || draft.place.longitude > 180) {
    throw new Error('経度が無効です');
  }

  const { error: insertError } = await supabase.from('fixed_plans').insert({
    user_id: user.id,
    activity_type: draft.activityType,
    custom_activity_name: customActivityName,
    days_of_week: draft.daysOfWeek,
    start_time: startTimeWithSeconds,
    place_id: draft.place.placeId || null,
    place_name: draft.place.placeName,
    latitude: draft.place.latitude,
    longitude: draft.place.longitude,
    plan_status: 'active'
  });

  if (insertError) {
    console.error('Failed to insert fixed plan:', insertError);
    throw new Error('予定の保存に失敗しました');
  }
}
