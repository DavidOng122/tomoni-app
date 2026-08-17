import type { FixedPlanDraft } from '../types';

type FixedPlanDraftInput = Omit<FixedPlanDraft, 'clientId'>;

export interface NormalizedFixedPlanDraft {
  activity_type: NonNullable<FixedPlanDraftInput['activityType']>;
  custom_activity_name: string | null;
  days_of_week: FixedPlanDraftInput['daysOfWeek'];
  start_time: string;
  place_id: string | null;
  place_name: string;
  latitude: number;
  longitude: number;
}

const validActivityTypes = new Set([
  'walking',
  'dog_walking',
  'event',
  'study_reading',
  'sports',
  'other',
]);

const validDays = new Set(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

export function normalizeFixedPlanDraft(
  draft: FixedPlanDraftInput,
): NormalizedFixedPlanDraft {
  if (!draft.activityType || !validActivityTypes.has(draft.activityType)) {
    throw new Error('無効な活動タイプです');
  }

  let customActivityName: string | null = null;
  if (draft.activityType === 'other') {
    customActivityName = draft.customActivityName?.trim() || null;
    if (!customActivityName) {
      throw new Error('活動名を入力してください');
    }
  }

  if (draft.daysOfWeek.length === 0) {
    throw new Error('曜日を選択してください');
  }
  if (draft.daysOfWeek.some((day) => !validDays.has(day))) {
    throw new Error('無効な曜日が含まれています');
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.startTime)) {
    throw new Error('開始時間が無効です');
  }

  if (!draft.place?.placeName.trim()) {
    throw new Error('場所を選択してください');
  }
  if (!Number.isFinite(draft.place.latitude) || draft.place.latitude < -90 || draft.place.latitude > 90) {
    throw new Error('緯度が無効です');
  }
  if (!Number.isFinite(draft.place.longitude) || draft.place.longitude < -180 || draft.place.longitude > 180) {
    throw new Error('経度が無効です');
  }

  return {
    activity_type: draft.activityType,
    custom_activity_name: customActivityName,
    days_of_week: draft.daysOfWeek,
    start_time: `${draft.startTime}:00`,
    place_id: draft.place.placeId || null,
    place_name: draft.place.placeName.trim(),
    latitude: draft.place.latitude,
    longitude: draft.place.longitude,
  };
}
