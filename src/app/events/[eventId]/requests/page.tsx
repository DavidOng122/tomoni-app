import React from 'react';
import { createClient } from '@/infrastructure/auth/server';
import { notFound, redirect } from 'next/navigation';
import { RequestsView } from './RequestsView';

interface PageProps {
  params: Promise<{
    eventId: string;
  }>;
}

export default async function RequestsPage({ params }: PageProps) {
  const { eventId } = await params;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/welcome');
  }

  // Fetch event to verify ownership
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('created_by_user_id')
    .eq('event_id', eventId)
    .single();

  if (eventError || !event || event.created_by_user_id !== user.id) {
    notFound();
  }

  // Fetch requests using the secure RPC
  const { data: requests, error: requestsError } = await supabase.rpc('get_event_join_requests', {
    p_event_id: eventId
  });

  if (requestsError) {
    // Graceful fallback if RPC fails
    console.error('Error fetching requests:', requestsError);
  }

  return (
    <RequestsView eventId={eventId} requests={requests || []} />
  );
}
