import React from 'react';
import { createClient } from '@/infrastructure/auth/server';
import { redirect } from 'next/navigation';
import { getRecommendations } from '@/features/discover/server/getRecommendations';
import { filterRecommendationsForPlan } from '@/features/discover/domain/filterRecommendationsForPlan';
import { ACTIVITY_LABELS } from '@/features/fixed-schedules/lib/constants';
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
  const recommendations = filterRecommendationsForPlan(
    await getRecommendations(scheduleId),
    scheduleId,
  );
  const activityTitle = plan.activity_type === 'other'
    ? plan.custom_activity_name || 'その他'
    : ACTIVITY_LABELS[plan.activity_type as keyof typeof ACTIVITY_LABELS] || plan.activity_type;

  return (
    <ScheduledPeopleView
      plan={plan}
      activityTitle={activityTitle}
      recommendations={recommendations}
    />
  );
}
