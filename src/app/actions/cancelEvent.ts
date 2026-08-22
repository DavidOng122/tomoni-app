'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/infrastructure/auth/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function cancelEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
  if (!UUID_PATTERN.test(eventId)) {
    return { success: false, error: 'イベントが見つかりません' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'ログインが必要です' };
  }

  const { error } = await supabase.rpc('cancel_user_event', { p_event_id: eventId });
  if (error) {
    return { success: false, error: 'イベントを中止できませんでした' };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath('/discover');
  revalidatePath('/connections');
  revalidatePath('/notifications');
  return { success: true };
}
