import React from 'react';
import { createClient } from '@/infrastructure/auth/server';
import { notFound, redirect } from 'next/navigation';
import { EventDetailView } from './EventDetailView';
import { Database } from '@/types/database.types';

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

  // Under RLS, if they can read it, we will render the detail.
  // The policy `events_select_scheduled` restricts reading to `event_status = 'scheduled'`.
  // So cancelled/ended events naturally return nothing and fall into notFound() above.

  return <EventDetailView event={data as EventRow} />;
}
