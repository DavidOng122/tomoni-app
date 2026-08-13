'use server';

import { createClient } from '@/infrastructure/auth/server';
import { revalidatePath } from 'next/cache';

export async function createEventInvitationAction(eventId: string, receiverUserId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { data, error } = await supabase.rpc('create_event_invitation', {
    p_event_id: eventId,
    p_receiver_user_id: receiverUserId,
  });

  if (error) {
    console.error('Error creating event invitation:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}/people`);
  return { success: true, data };
}
