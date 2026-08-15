import React from 'react';
import { createClient } from '@/infrastructure/auth/server';
import { redirect } from 'next/navigation';
import { getRecommendations } from '@/features/discover/server/getRecommendations';
import { ScheduledPeopleView } from './ScheduledPeopleView';


export default async function ScheduledPeoplePage({ params }: { params: Promise<{ scheduleId: string }> }) {
  const { scheduleId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/welcome');
  }



  // Verify plan exists and belongs to user
  const { data: plan, error } = await supabase
    .from('fixed_plans')
    .select('*')
    .eq('fixed_plan_id', scheduleId)
    .eq('user_id', user.id)
    .eq('plan_status', 'active')
    .single();

  if (error || !plan) {
    redirect('/discover');
  }

  // Fetch recommendations for this specific plan
  const recommendations = await getRecommendations(scheduleId);

  return <ScheduledPeopleView plan={plan} recommendations={recommendations} />;
}
