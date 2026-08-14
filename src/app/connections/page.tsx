import { createClient } from '@/infrastructure/auth/server';
import ConnectionsView from './ConnectionsView';

export default async function ConnectionsPage() {
  const supabase = await createClient();

  const { data: eventInvitations, error } = await supabase
    .rpc('get_received_event_invitations');

  if (error) {
    console.error('Error fetching event invitations:', error);
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return <ConnectionsView eventInvitations={eventInvitations || []} activeConversations={[]} />;
  }

  // Fetch active conversations
  const { data: conversationsData, error: convError } = await supabase
    .from('conversations')
    .select(`
      conversation_id,
      event_id,
      events!inner ( title ),
      conversation_members!inner (
        user_id,
        left_at,
        profiles!inner ( nickname, avatar_url )
      )
    `)
    .eq('conversation_status', 'active')
    .not('event_id', 'is', null);

  if (convError) {
    console.error('Error fetching conversations:', convError);
  }

  const activeConversations = (conversationsData || [])
    .filter(conv => {
      const myMember = conv.conversation_members.find(m => m.user_id === user.id);
      return myMember && myMember.left_at === null;
    })
    .map(conv => {
      const otherMember = conv.conversation_members.find(m => m.user_id !== user.id);
      const eventInfo = Array.isArray(conv.events) ? conv.events[0] : conv.events;
      const otherProfile = otherMember?.profiles;
      const profileInfo = Array.isArray(otherProfile) ? otherProfile[0] : otherProfile;

      return {
        conversation_id: conv.conversation_id,
        other_nickname: profileInfo?.nickname || 'ユーザー',
        other_avatar_url: profileInfo?.avatar_url || null,
        event_title: eventInfo?.title || 'イベント'
      };
    });

  return <ConnectionsView eventInvitations={eventInvitations || []} activeConversations={activeConversations} />;
}
