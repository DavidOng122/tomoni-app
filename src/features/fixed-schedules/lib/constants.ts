import type { ActivityType, DayOfWeek } from '../types.ts';

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  walking: '散歩',
  event: 'イベント',
  dog_walking: '犬の散歩',
  study_reading: '勉強・読書',
  sports: 'スポーツ',
  other: 'その他',
};

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  walking: '/images/onboarding-walking.svg',
  dog_walking: '/images/onboarding-dog.svg',
  event: '/images/onboarding-event.svg',
  study_reading: '/images/onboarding-study.svg',
  sports: '/images/onboarding-sports.svg',
  other: '/images/onboarding-other.svg',
};

export const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: '月',
  tue: '火',
  wed: '水',
  thu: '木',
  fri: '金',
  sat: '土',
  sun: '日',
};

export const DAY_ORDER: Record<DayOfWeek, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 7,
};

export const DAYS_OF_WEEK_LIST: { key: DayOfWeek; label: string }[] = [
  { key: 'mon', label: '月' },
  { key: 'tue', label: '火' },
  { key: 'wed', label: '水' },
  { key: 'thu', label: '木' },
  { key: 'fri', label: '金' },
  { key: 'sat', label: '土' },
  { key: 'sun', label: '日' },
];
