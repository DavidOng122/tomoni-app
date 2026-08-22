export type EventRecommendationKind = "event" | "cultural_facility";

export interface FixedPlanEventRecommendation {
  kind: EventRecommendationKind;
  recommendationId: string;
  eventId: string | null;
  publicPlaceId: string;
  title: string;
  startAt: string | null;
  endAt: string | null;
  placeName: string;
  sourceName: string;
  imageUrl: string | null;
  registrationStatus: string | null;
  senderDistanceMeters: number;
  receiverDistanceMeters: number;
  requiresHoursConfirmation: boolean;
}

export interface SelectedFixedPlanRecommendation {
  kind: EventRecommendationKind;
  id: string;
}
