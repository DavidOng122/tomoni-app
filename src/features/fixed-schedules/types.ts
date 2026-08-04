export type ActivityType =
  | "walking"
  | "running"
  | "dog_walking"
  | "study_reading"
  | "sports"
  | "other";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type TimeSlot =
  | "morning"
  | "daytime"
  | "evening"
  | "night";

export type FixedScheduleDraft = {
  activityType: ActivityType | null;
  daysOfWeek: DayOfWeek[];
  timeSlot: TimeSlot | null;
  locationQuery: string;
};

export type FixedScheduleDraftItem = FixedScheduleDraft & {
  clientId: string;
};
