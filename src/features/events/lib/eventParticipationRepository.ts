import { createClient } from '@/infrastructure/auth/server';
import { Database } from '@/types/database.types';

export class EventParticipationRepository {
  /**
   * Fetches the participation status for the current authenticated user for a specific event.
   */
  static async getOwnParticipation(eventId: string): Promise<Database['public']['Tables']['event_participations']['Row'] | null> {
    const supabase = await createClient();
    
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return null;
    }

    const { data, error } = await supabase
      .from('event_participations')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching event participation:', error);
      return null;
    }

    return data;
  }

  /**
   * Joins the event (secure boundary via RPC).
   * Determines going/requested internally based on event config.
   */
  static async joinEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase.rpc('join_event', { p_event_id: eventId });

    if (error) {
      console.error('Error joining event:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Cancels the event participation (secure boundary via RPC).
   */
  static async cancelParticipation(eventId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase.rpc('cancel_event_participation', { p_event_id: eventId });

    if (error) {
      console.error('Error cancelling participation:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }
}
