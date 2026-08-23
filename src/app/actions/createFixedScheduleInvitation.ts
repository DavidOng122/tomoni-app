'use server';

import { createClient } from '@/infrastructure/auth/server';
import type { SelectedFixedPlanRecommendation } from '@/features/invitations/domain/eventRecommendationTypes';

export async function createFixedScheduleInvitation(
  fixedPlanId: string,
  receiverId: string,
  receiverFixedPlanId: string,
  recommendation?: SelectedFixedPlanRecommendation | null,
): Promise<{ success: boolean; conversationId?: string; invitationId?: string; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const recommendationArgs = recommendation?.kind === 'event'
      ? { p_suggested_event_id: recommendation.id }
      : recommendation?.kind === 'cultural_facility'
        ? { p_suggested_public_place_id: recommendation.id }
        : {};
    const { data, error } = await supabase.rpc('create_fixed_schedule_invitation', {
      p_fixed_plan_id: fixedPlanId,
      p_receiver_id: receiverId,
      p_receiver_fixed_plan_id: receiverFixedPlanId,
      ...recommendationArgs,
    });

    if (error) {
      console.error('[createFixedScheduleInvitation] FAILED', {
        fixedPlanId,
        receiverId,
        receiverFixedPlanId,
        userId: user.id,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return { success: false, error: '招待の送信に失敗しました' };
    }

    if (!data || typeof data !== 'object' || !('conversation_id' in data)) {
      return { success: false, error: 'サーバーからの応答が不正です' };
    }

    const result = data as { conversation_id: string; invitation_id: string };

    return {
      success: true,
      conversationId: result.conversation_id,
      invitationId: result.invitation_id,
    };
  } catch (err) {
    console.error('Unexpected error in createFixedScheduleInvitation:', err);
    return { success: false, error: '予期せぬエラーが発生しました' };
  }
}
