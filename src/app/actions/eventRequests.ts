'use server';

import { createClient } from '@/infrastructure/auth/server';
import { revalidatePath } from 'next/cache';

export async function approveEventRequestAction(participationId: string) {
  const supabase = await createClient();
  
  const { data: eventId, error } = await supabase.rpc('approve_event_participant', {
    p_participation_id: participationId
  });
  
  if (error) {
    console.error('Failed to approve request:', error);
    return { success: false, error: '承認に失敗しました。リクエストがキャンセルされたか、イベントが終了している可能性があります。' };
  }
  
  if (eventId) {
    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/events/${eventId}/requests`);
    revalidatePath('/notifications');
    revalidatePath('/discover');
  }
  
  return { success: true };
}

export async function rejectEventRequestAction(participationId: string) {
  const supabase = await createClient();
  
  const { data: eventId, error } = await supabase.rpc('reject_event_participant', {
    p_participation_id: participationId
  });
  
  if (error) {
    console.error('Failed to reject request:', error);
    return { success: false, error: 'リクエストの拒否に失敗しました。' };
  }
  
  if (eventId) {
    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/events/${eventId}/requests`);
    revalidatePath('/notifications');
    revalidatePath('/discover');
  }
  
  return { success: true };
}
