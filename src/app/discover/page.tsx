import React from 'react';
import { createClient } from '@/infrastructure/auth/server';
import { redirect } from 'next/navigation';
import { DiscoverView } from './DiscoverView';
import { getRecommendations } from '@/features/discover/server/getRecommendations';
import { DiscoverRecommendation } from '@/features/discover/types';
import { Database } from '@/types/database.types';


export default async function DiscoverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/welcome');
  }

  // Check if the user has any active plans
  const { count } = await supabase
    .from('fixed_plans')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('plan_status', 'active');

  const hasPlans = count !== null && count > 0;

  let recommendations: DiscoverRecommendation[] = [];
  if (hasPlans) {
    recommendations = await getRecommendations(null);
  }

  const now = new Date().toISOString();
  const { data: eventsData, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .eq('event_status', 'scheduled')
    .or(`end_at.gte.${now},and(end_at.is.null,start_at.gte.${now})`)
    .order('start_at', { ascending: true })
    .order('event_id', { ascending: true })
    .limit(10);

  if (eventsError) {
    console.error("Failed to fetch events:", eventsError);
  }

  const events = eventsData || [];

  return (
    <DiscoverView
      recommendations={recommendations}
      hasPlans={hasPlans}
      events={events}
    />
  );
}
