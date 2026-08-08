import { SelectedPlace } from '@/features/locations/types';

export type ActivityType =
  | "walking"
  | "event"
  | "dog_walking"
  | "study_reading"
  | "sports"
  | "other";

export type DayOfWeek =
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat"
  | "sun";

export type FixedPlanDraft = {
  clientId: string;
  place: SelectedPlace | null;
  activityType: ActivityType | null;
  customActivityName: string | null;
  daysOfWeek: DayOfWeek[];
  startTime: string;
};
