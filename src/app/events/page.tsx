import { redirect } from 'next/navigation';
import { getEventOrganizerAvatarUrl } from '@/features/events/domain/getEventOrganizerAvatarUrl';
import { getEventPosterUrl } from '@/features/events/domain/getEventPosterUrl';
import { getEventParticipantPreview } from '@/features/events/lib/getEventParticipantPreview';
import { createClient } from '@/infrastructure/auth/server';
import { AllEventsView } from './AllEventsView';

export default async function AllEventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/welcome');
  }

  const now = new Date().toISOString();
  const [{ data: eventRows, error: eventsError }, { data: ownParticipations, error: participationsError }] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .eq('event_status', 'scheduled')
      .or(`end_at.gte.${now},and(end_at.is.null,start_at.gte.${now})`)
      .order('start_at', { ascending: true })
      .order('event_id', { ascending: true }),
    supabase
      .from('event_participations')
      .select('event_id')
      .eq('user_id', user.id)
      .eq('participation_status', 'going'),
  ]);

  if (eventsError) {
    console.error('Failed to fetch all upcoming events:', eventsError);
  }
  if (participationsError) {
    console.error('Failed to fetch event participation state:', participationsError);
  }

  const rows = eventRows || [];
  const joinedEventIds = new Set((ownParticipations || []).map((participation) => participation.event_id));
  const organizerIds = [...new Set(rows.flatMap((event) => (
    event.created_by_user_id ? [event.created_by_user_id] : []
  )))];
  const organizerAvatarByUserId = new Map<string, string | null>();

  if (organizerIds.length > 0) {
    const { data: organizerProfiles, error: organizerProfilesError } = await supabase
      .from('profiles')
      .select('user_id, avatar_url')
      .in('user_id', organizerIds);

    if (organizerProfilesError) {
      console.error('Failed to fetch event organizers:', organizerProfilesError);
    }
    organizerProfiles?.forEach((organizer) => {
      organizerAvatarByUserId.set(organizer.user_id, organizer.avatar_url);
    });
  }

  const events = await Promise.all(rows.map(async (event) => ({
    ...event,
    isParticipating: joinedEventIds.has(event.event_id),
    organizerAvatarUrl: getEventOrganizerAvatarUrl({
      eventType: event.event_type,
      sourceDatasetId: event.source_dataset_id,
      sourceName: event.source_name,
      creatorAvatarUrl: event.created_by_user_id
        ? organizerAvatarByUserId.get(event.created_by_user_id) || null
        : null,
    }),
    displayPosterUrl: getEventPosterUrl({
      eventType: event.event_type,
      sourceDatasetId: event.source_dataset_id,
      posterUrl: event.poster_url,
    }),
    participantPreview: await getEventParticipantPreview(event.event_id),
  })));

  return <AllEventsView events={events} />;
}
