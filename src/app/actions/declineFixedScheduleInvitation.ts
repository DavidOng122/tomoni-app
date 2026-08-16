'use server';

import { createClient } from '@/infrastructure/auth/server';
import { revalidatePath } from 'next/cache';

export async function declineFixedScheduleInvitation(
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase.rpc('decline_fixed_schedule_invitation', {
      p_invitation_id: invitationId,
    });

    if (error) {
      console.error('[declineFixedScheduleInvitation] FAILED', {
        invitationId,
        userId: user.id,
        code: error.code,
        message: error.message,
      });
      return { success: false, error: 'お断りに失敗しました' };
    }

    revalidatePath('/connections');
    return { success: true };
  } catch (err) {
    console.error('Unexpected error in declineFixedScheduleInvitation:', err);
    return { success: false, error: '予期せぬエラーが発生しました' };
  }
}
