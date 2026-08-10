export type MatchReasonCode = 'same_activity' | 'same_time' | 'nearby' | 'shared_day';

export interface DiscoverRecommendation {
  candidateId: string;
  profile: {
    nickname: string;
    avatarUrl: string;
    ageRange: string;
    gender: string;
    tags: string[];
  };
  match: {
    myPlanId: string;
    candidatePlanId: string;
    activityType: string;
    matchedDays: string[];
    myStartTime: string;
    candidateStartTime: string;
    timeDifferenceMinutes: number;
    distanceKm: number;
    reasons: MatchReasonCode[];
  };
}
