import type { FixedPlanDraft } from '../types';
import { getEdogawaAreaPlace } from '../../locations/domain/edogawaAreas.ts';

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

  if (draft.activityType !== 'event' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.startTime)) {
    throw new Error('開始時間が無効です');
  }

  const selectedArea = draft.place
    ? getEdogawaAreaPlace(draft.place.placeName.trim())
    : null;
  if (!selectedArea) {
    throw new Error('江戸川区のエリアを選択してください');
  }

  return {
    activity_type: draft.activityType,
    custom_activity_name: customActivityName,
    days_of_week: draft.daysOfWeek,
    // fixed_plans.start_time is historically NOT NULL. Event plans do not expose a
    // time choice; noon is an internal compatibility value and must not be shown or scored.
    start_time: draft.activityType === 'event' ? '12:00:00' : `${draft.startTime}:00`,
    place_id: null,
    place_name: selectedArea.placeName,
    latitude: selectedArea.latitude,
    longitude: selectedArea.longitude,
  };
}
