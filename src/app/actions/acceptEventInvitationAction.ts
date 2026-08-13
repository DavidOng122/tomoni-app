'use server';

import { createClient } from '@/infrastructure/auth/server';
import { revalidatePath } from 'next/cache';

export async function acceptEventInvitationAction(invitationId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { data, error } = await supabase.rpc('accept_event_invitation', {
    p_invitation_id: invitationId,
  });

  if (error) {
    console.error('Error accepting event invitation:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/connections');
  return { success: true, conversationId: data };
}
