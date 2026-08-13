import React from 'react';
import { createClient } from '@/infrastructure/auth/server';
import { notFound, redirect } from 'next/navigation';
import { EventPeopleView } from './EventPeopleView';
import { EventParticipationRepository } from '@/features/events/lib/eventParticipationRepository';
import { Database } from '@/types/database.types';

type EventRow = Database['public']['Tables']['events']['Row'];

interface PageProps {
  params: Promise<{
    eventId: string;
  }>;
}

export default async function EventPeoplePage({ params }: PageProps) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/welcome');
  }

  // UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(eventId)) {
    notFound();
  }

  // Check event exists and is scheduled
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('event_id', eventId)
    .single();

  if (eventError || !event || event.event_status !== 'scheduled') {
    notFound();
  }

  // Validate Caller Eligibility BEFORE hitting RPC
  const participation = await EventParticipationRepository.getOwnParticipation(eventId);
  
  if (!participation || 
      participation.participation_status !== 'going' || 
      !participation.participation_date || 
      !participation.arrival_time) {
    // If not eligible to view discovery, act like it doesn't exist
    notFound();
  }

  // Fetch candidates from secure RPC
  const { data: candidates, error: candidatesError } = await supabase.rpc('get_same_event_people', {
    p_event_id: eventId
  });

  if (candidatesError) {
    console.error('Error fetching event people:', candidatesError);
    // Safe fallback
    notFound();
  }

  return (
    <EventPeopleView 
      event={event as EventRow} 
      candidates={candidates || []}
    />
  );
}
