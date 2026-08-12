import { createClient } from '@/infrastructure/auth/server';

export type EventParticipantPreviewData = {
  participantCount: number;
  users: Array<{
    userId: string;
    nickname: string;
    avatarUrl: string | null;
  }>;
};

export async function getEventParticipantPreview(eventId: string): Promise<EventParticipantPreviewData | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_event_participant_preview', {
    p_event_id: eventId
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  const participantCount = data[0].participant_count || 0;
  
  if (participantCount === 0) {
    return null;
  }

  // Filter out the guaranteed null row if no active profiles are found
  const users = data
    .filter(row => row.user_id !== null && row.nickname !== null)
    .map(row => ({
      userId: row.user_id!,
      nickname: row.nickname!,
      avatarUrl: row.avatar_url
    }));

  return {
    participantCount,
    users
  };
}
