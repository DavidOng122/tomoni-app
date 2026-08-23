'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/infrastructure/auth/server';

export async function autoAcceptFixedScheduleInvitationForDemo(
  invitationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await supabase.rpc('auto_accept_fixed_schedule_invitation_for_demo', {
      p_invitation_id: invitationId,
    });

    if (error) {
      console.error('[autoAcceptFixedScheduleInvitationForDemo] FAILED', {
        invitationId,
        userId: user.id,
        code: error.code,
        message: error.message,
      });
      return { success: false, error: 'テスト用の自動承諾に失敗しました' };
    }

    const result = data as { conversation_id?: string } | null;
    revalidatePath('/connections');
    if (result?.conversation_id) {
      revalidatePath(`/chat/${result.conversation_id}`);
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected error in autoAcceptFixedScheduleInvitationForDemo:', err);
    return { success: false, error: 'テスト用の自動承諾に失敗しました' };
  }
}
