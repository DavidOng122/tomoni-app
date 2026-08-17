import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/auth/server';
import type { ActivityType, DayOfWeek } from '@/features/fixed-schedules/types';
import { EditScheduleView } from './EditScheduleView';

interface PageProps {
  params: Promise<{ fixedPlanId: string }>;
}

export default async function EditSchedulePage({ params }: PageProps) {
  const { fixedPlanId } = await params;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(fixedPlanId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/welcome');
  }

  const { data: fixedPlan } = await supabase
    .from('fixed_plans')
    .select('fixed_plan_id, activity_type, custom_activity_name, days_of_week, start_time, place_id, place_name, latitude, longitude')
    .eq('fixed_plan_id', fixedPlanId)
    .eq('user_id', user.id)
    .neq('plan_status', 'deleted')
    .maybeSingle();

  if (!fixedPlan) {
    notFound();
  }

  return (
    <EditScheduleView
      fixedPlanId={fixedPlan.fixed_plan_id}
      initialDraft={{
        activityType: fixedPlan.activity_type as ActivityType,
        customActivityName: fixedPlan.custom_activity_name,
        daysOfWeek: fixedPlan.days_of_week as DayOfWeek[],
        startTime: fixedPlan.start_time.substring(0, 5),
        place: {
          placeId: fixedPlan.place_id || '',
          placeName: fixedPlan.place_name,
          latitude: fixedPlan.latitude,
          longitude: fixedPlan.longitude,
        },
      }}
    />
  );
}
