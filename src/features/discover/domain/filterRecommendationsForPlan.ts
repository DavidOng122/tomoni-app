import type { DiscoverRecommendation } from '../types';

export function filterRecommendationsForPlan(
  recommendations: DiscoverRecommendation[],
  planId: string,
): DiscoverRecommendation[] {
  return recommendations.filter(
    (recommendation) => recommendation.match.myPlanId === planId,
  );
}
