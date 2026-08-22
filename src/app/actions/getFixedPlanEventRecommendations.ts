'use server';

import type { FixedPlanEventRecommendation } from '@/features/invitations/domain/eventRecommendationTypes';
import { createClient } from '@/infrastructure/auth/server';

export async function getFixedPlanEventRecommendations(
  senderFixedPlanId: string,
  receiverFixedPlanId: string,
): Promise<{ success: true; recommendations: FixedPlanEventRecommendation[] } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Unauthorized' };

  const { data, error } = await supabase.rpc('get_fixed_plan_event_recommendations', {
    p_sender_fixed_plan_id: senderFixedPlanId,
    p_receiver_fixed_plan_id: receiverFixedPlanId,
    p_limit: 3,
  });
  if (error) {
    console.error('[getFixedPlanEventRecommendations] FAILED', {
      code: error.code,
      message: error.message,
    });
    return { success: false, error: 'おすすめのイベントを取得できませんでした' };
  }

  const recommendations = (data ?? []).flatMap((row): FixedPlanEventRecommendation[] => {
    if (
      (row.recommendation_kind !== 'event' && row.recommendation_kind !== 'cultural_facility')
      || !row.recommendation_id
      || !row.public_place_id
      || !row.title
      || !row.place_name
      || !row.source_name
    ) return [];

    return [{
      kind: row.recommendation_kind,
      recommendationId: row.recommendation_id,
      eventId: row.event_id || null,
      publicPlaceId: row.public_place_id,
      title: row.title,
      startAt: row.start_at || null,
      endAt: row.end_at || null,
      placeName: row.place_name,
      sourceName: row.source_name,
      imageUrl: row.image_url || null,
      registrationStatus: row.registration_status || null,
      senderDistanceMeters: row.sender_distance_meters,
      receiverDistanceMeters: row.receiver_distance_meters,
      requiresHoursConfirmation: row.requires_hours_confirmation,
    }];
  });

  return { success: true, recommendations };
}
