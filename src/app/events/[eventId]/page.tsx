import React from 'react';
import { createClient } from '@/infrastructure/auth/server';
import { notFound, redirect } from 'next/navigation';
import { EventDetailView } from './EventDetailView';
import { Database } from '@/types/database.types';
import { EventParticipationRepository } from '@/features/events/lib/eventParticipationRepository';
import { getEventParticipantPreview } from '@/features/events/lib/getEventParticipantPreview';


type EventRow = Database['public']['Tables']['events']['Row'];

interface PageProps {
  params: Promise<{
    eventId: string;
  }>;
}

export default async function EventDetailPage({ params }: PageProps) {
  const { eventId } = await params;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/welcome');
  }

  // Simple UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(eventId)) {
    notFound();
  }

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_id', eventId)
    .single();

  if (error || !data) {
    // Hide Supabase error details and just show 404 behavior for unreadable/missing events
    notFound();
  }

  let creatorProfile = null;
  if (data.created_by_user_id && data.event_type === 'user_created') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname, avatar_url')
      .eq('user_id', data.created_by_user_id)
      .single();
    if (profile) {
      creatorProfile = profile;
    }
  }

  // Scheduled events are public to authenticated users. Historical events remain
  // readable only to their creator, participants, or involved invitation users.

  // Fetch current user participation status
  const participation = await EventParticipationRepository.getOwnParticipation(eventId);
  const participationStatus = participation?.participation_status || null;

  const participantPreview = await getEventParticipantPreview(eventId);

  // Check if current user is the creator and event requires approval
  let pendingRequestCount = 0;
  if (data.created_by_user_id === user.id && data.event_type === 'user_created' && data.approval_required) {
    const { data: requests } = await supabase.rpc('get_event_join_requests', {
      p_event_id: eventId
    });
    if (requests) {
      pendingRequestCount = requests.length;
    }
  }

  return (
    <EventDetailView 
      event={data as EventRow} 
      participation={participation} 
      creatorProfile={creatorProfile}
      participantPreview={participantPreview}
      pendingRequestCount={pendingRequestCount}
      isCreator={data.created_by_user_id === user.id}
    />
  );
}
