import { createClient } from '@/infrastructure/auth/server';
import ConnectionsView from './ConnectionsView';

export default async function ConnectionsPage() {
  const supabase = await createClient();

  const { data: eventInvitations, error } = await supabase
    .rpc('get_received_event_invitations');

  if (error) {
    console.error('Error fetching event invitations:', error);
  }

  return <ConnectionsView eventInvitations={eventInvitations || []} />;
}
