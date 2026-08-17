'use server';

import { createClient } from '@/infrastructure/auth/server';
import { revalidatePath } from 'next/cache';

export async function joinEventWithPlanAction(
  eventId: string, 
  arrivalTime: string, 
  durationMinutes: number | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  // Enforce correct duration constraint on server side as well (though DB will reject anyway)
  if (durationMinutes !== null && durationMinutes !== 30 && durationMinutes !== 60) {
    return { success: false, error: 'Invalid duration specified.' };
  }

  // Arrival time must be in HH:MM format, we'll append :00 for the time type if needed
  let formattedTime = arrivalTime;
  if (formattedTime.split(':').length === 2) {
    formattedTime = `${formattedTime}:00`;
  }

  const { error } = await supabase.rpc('join_event_with_plan', {
    p_event_id: eventId,
    p_arrival_time: formattedTime,
    p_planned_duration_minutes: durationMinutes === null ? undefined : durationMinutes
  });

  if (error) {
    console.error('Error in joinEventWithPlanAction:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/requests`);

  return { success: true };
}
