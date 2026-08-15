import React from 'react';
import { createClient } from '@/infrastructure/auth/server';
import { notFound, redirect } from 'next/navigation';
import { JoinEventView } from './JoinEventView';
import { EventParticipationRepository } from '@/features/events/lib/eventParticipationRepository';
import { Database } from '@/types/database.types';


type EventRow = Database['public']['Tables']['events']['Row'];

interface PageProps {
  params: Promise<{
    eventId: string;
  }>;
}

export default async function JoinEventPage({ params }: PageProps) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/welcome');
  }



  // Fetch event details
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('event_id', eventId)
    .single();

  if (eventError || !event) {
    notFound();
  }

  // Check if there is an existing cancelled participation
  const existingParticipation = await EventParticipationRepository.getOwnParticipation(eventId);
  
  if (existingParticipation && existingParticipation.participation_status !== 'cancelled') {
    // If they are already participating (going, requested) or in a terminal state (attended, rejected),
    // they should not be in the join flow.
    redirect(`/events/${eventId}`);
  }

  return (
    <JoinEventView 
      event={event as EventRow} 
      existingParticipation={existingParticipation}
    />
  );
}
