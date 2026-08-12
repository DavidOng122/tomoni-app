'use server';

import { revalidatePath } from 'next/cache';
import { EventParticipationRepository } from '@/features/events/lib/eventParticipationRepository';
export async function toggleEventParticipationAction(eventId: string, currentStatus: string | null) {
  let result;
  
  if (currentStatus === 'going' || currentStatus === 'requested') {
    result = await EventParticipationRepository.cancelParticipation(eventId);
  } else {
    // Treat 'cancelled', 'none'/null as joining
    result = await EventParticipationRepository.joinEvent(eventId);
  }

  if (result.success) {
    revalidatePath(`/events/${eventId}`);
  }

  return result;
}
