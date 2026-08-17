import React from 'react';
import { createClient } from '@/infrastructure/auth/server';
import { notFound, redirect } from 'next/navigation';
import { JoinEventView } from './JoinEventView';
import { EventParticipationRepository } from '@/features/events/lib/eventParticipationRepository';
import { Database } from '@/types/database.types';
import {
  getEventSuccessCandidates,
  SameEventCandidate,
} from '@/features/events/domain/getEventSuccessCandidates';


type EventRow = Database['public']['Tables']['events']['Row'];

interface PageProps {
  params: Promise<{
    eventId: string;
  }>;
  searchParams: Promise<{
    completed?: string;
  }>;
}

export default async function JoinEventPage({ params, searchParams }: PageProps) {
  const { eventId } = await params;
  const { completed } = await searchParams;
  const isCompleted = completed === '1';
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
  
  const hasCompletedParticipation =
    existingParticipation?.participation_status === 'going' ||
    existingParticipation?.participation_status === 'requested';

  if (existingParticipation && existingParticipation.participation_status !== 'cancelled' && !(
    isCompleted && hasCompletedParticipation
  )) {
    // If they are already participating (going, requested) or in a terminal state (attended, rejected),
    // they should not be in the join flow.
    redirect(`/events/${eventId}`);
  }

  let successCandidates: SameEventCandidate[] | null = null;

  if (isCompleted && hasCompletedParticipation) {
    if (existingParticipation.participation_status === 'going') {
      const { data: candidates } = await supabase.rpc('get_same_event_people', {
        p_event_id: eventId,
      });
      successCandidates = getEventSuccessCandidates(candidates || []);
    } else {
      successCandidates = [];
    }
  }

  return (
    <JoinEventView 
      event={event as EventRow} 
      existingParticipation={existingParticipation}
      initialSuccessCandidates={successCandidates}
    />
  );
}
