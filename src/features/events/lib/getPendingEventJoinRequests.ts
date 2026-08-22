import { createClient } from '@/infrastructure/auth/server';

export interface PendingEventJoinRequest {
  participationId: string;
  eventId: string;
  eventTitle: string;
  eventPosterUrl: string | null;
  requesterUserId: string;
  requesterName: string;
  requesterAvatarUrl: string | null;
  requestedAt: string;
}

export async function getPendingEventJoinRequests(
  organizerUserId: string,
): Promise<PendingEventJoinRequest[]> {
  const supabase = await createClient();
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('event_id, title, poster_url, start_at, end_at')
    .eq('created_by_user_id', organizerUserId)
    .eq('event_type', 'user_created')
    .eq('approval_required', true)
    .eq('event_status', 'scheduled')
    .order('start_at', { ascending: true })
    .limit(30);

  if (eventsError) {
    console.error('Failed to load approval-required events');
    return [];
  }

  const now = Date.now();
  const actionableEvents = (events ?? []).filter((event) => {
    const eligibilityTime = new Date(event.end_at ?? event.start_at).getTime();
    return Number.isFinite(eligibilityTime) && eligibilityTime >= now;
  });

  const requestGroups = await Promise.all(actionableEvents.map(async (event) => {
    const { data: requests, error: requestsError } = await supabase.rpc('get_event_join_requests', {
      p_event_id: event.event_id,
    });

    if (requestsError) {
      console.error('Failed to load event join requests');
      return [];
    }

    return (requests ?? []).map((request): PendingEventJoinRequest => ({
      participationId: request.participation_id,
      eventId: event.event_id,
      eventTitle: event.title,
      eventPosterUrl: event.poster_url,
      requesterUserId: request.user_id,
      requesterName: request.nickname,
      requesterAvatarUrl: request.avatar_url,
      requestedAt: request.requested_at,
    }));
  }));

  return requestGroups
    .flat()
    .sort((left, right) => (
      right.requestedAt.localeCompare(left.requestedAt)
      || left.participationId.localeCompare(right.participationId)
    ));
}
