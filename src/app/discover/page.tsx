import React from 'react';
import { createClient } from '@/infrastructure/auth/server';
import { redirect } from 'next/navigation';
import { DiscoverView } from './DiscoverView';
import { getRecommendations } from '@/features/discover/server/getRecommendations';
import { DiscoverRecommendation } from '@/features/discover/types';
import { Database } from '@/types/database.types';
import { ACTIVITY_LABELS } from '@/features/fixed-schedules/lib/constants';
import { formatWeekdays } from '@/features/fixed-schedules/lib/formatters';


export default async function DiscoverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/welcome');
  }

  // Check if the user has any active plans
  const { count, data: plans } = await supabase
    .from('fixed_plans')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .eq('plan_status', 'active');

  const hasPlans = count !== null && count > 0;
  const firstPlan = plans?.[0];

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, avatar_url, profile_status')
    .eq('user_id', user.id)
    .single();

  let currentActivity = null;
  if (profile) {
    let eventTitle = '固定予定はありません';
    let dateTime = '-';
    let location = '-';

    if (firstPlan) {
      eventTitle = firstPlan.activity_type === 'other'
        ? firstPlan.custom_activity_name || 'その他'
        : ACTIVITY_LABELS[firstPlan.activity_type as keyof typeof ACTIVITY_LABELS] || firstPlan.activity_type;
      
      const formattedDays = formatWeekdays(firstPlan.days_of_week as any[]);
      const timeStr = firstPlan.start_time.substring(0, 5).replace(/^0/, '');
      dateTime = `毎週${formattedDays}曜 ${timeStr}ごろ`;
      location = firstPlan.place_name;
    }

    currentActivity = {
      name: profile.nickname,
      verified: profile.profile_status === 'verified',
      eventTitle,
      dateTime,
      location,
      avatarUrl: profile.avatar_url || '/images/mypage/profile-miki.png'
    };
  }

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
      currentActivity={currentActivity}
    />
  );
}
