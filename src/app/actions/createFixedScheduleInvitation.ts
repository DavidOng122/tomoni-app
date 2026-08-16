'use server';

import { createClient } from '@/infrastructure/auth/server';

export async function createFixedScheduleInvitation(
  fixedPlanId: string,
  receiverId: string
): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await supabase.rpc('create_fixed_schedule_invitation', {
      p_fixed_plan_id: fixedPlanId,
      p_receiver_id: receiverId,
    });

    if (error) {
      console.error('[createFixedScheduleInvitation] FAILED', {
        fixedPlanId,
        receiverId,
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

    return { success: true, conversationId: result.conversation_id };
  } catch (err) {
    console.error('Unexpected error in createFixedScheduleInvitation:', err);
    return { success: false, error: '予期せぬエラーが発生しました' };
  }
}
