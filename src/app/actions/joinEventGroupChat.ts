'use server';

import { createClient } from '@/infrastructure/auth/server';

export async function joinEventGroupChat(eventId: string): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  console.log('[joinEventGroupChat] Called with eventId:', eventId);
  console.log('[joinEventGroupChat] Authenticated user ID:', user?.id);

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { data: conversationId, error } = await supabase.rpc('get_or_join_event_group_chat', {
    p_event_id: eventId
  });

  console.log('[joinEventGroupChat] RPC Error:', error);
  console.log('[joinEventGroupChat] RPC Data returned:', conversationId);

  if (error) {
    console.error('Error joining event group chat:', error);
    return { success: false, error: error.message };
  }

  if (typeof conversationId !== 'string' || conversationId === 'undefined' || !conversationId) {
    console.error('Invalid conversationId returned:', conversationId);
    return { success: false, error: 'Invalid conversation ID returned from server' };
  }

  // Next.js App Router caches RSC heavily. We must revalidate the connections hub
  // so the newly joined Event Group appears when the user navigates there.
  const { revalidatePath } = await import('next/cache');
  revalidatePath('/connections');

  return { success: true, conversationId };
}
