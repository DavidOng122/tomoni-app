import { createClient } from '@/infrastructure/auth/server';
import ConnectionsView from './ConnectionsView';
import { getEventParticipantPreview } from '@/features/events/lib/getEventParticipantPreview';

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
      related_invitation_id,
      fixed_plan_id,
      events ( title, poster_url, start_at, end_at ),
      conversation_members (
        user_id,
        left_at
      )
    `)
    .eq('conversation_status', 'active')
    .not('event_id', 'is', null);

  if (convError) {
    console.error('Error fetching conversations:', convError);
  }

  const debugConv = (conversationsData || []).find(c => c.conversation_id === '85272ad8-39d7-473c-8207-df46b54ef6c0');
  require('fs').writeFileSync('C:/Users/ojx21/Desktop/tomoni/tomoni-app/debug-page.json', JSON.stringify({ debugConv, error: convError }, null, 2));

  // Collect unique user_ids to fetch profiles
  const userIdsToFetch = new Set<string>();
  conversationsData?.forEach(conv => {
    conv.conversation_members?.forEach((m: any) => {
      if (m.user_id !== user.id) {
        userIdsToFetch.add(m.user_id);
      }
    });
  });

  // Fetch profiles separately to avoid PGRST200 foreign key errors
  const profilesMap = new Map<string, { nickname: string, avatar_url: string | null }>();
  if (userIdsToFetch.size > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, nickname, avatar_url')
      .in('user_id', Array.from(userIdsToFetch));
      
    profilesData?.forEach(p => {
      profilesMap.set(p.user_id, p);
    });
  }

  const filteredConvs = (conversationsData || []).filter(conv => {
    const myMember = conv.conversation_members?.find((m: any) => m.user_id === user.id);
    return myMember && myMember.left_at === null;
  });

  const activeConversations = await Promise.all(filteredConvs.map(async conv => {
    const isGroupChat = conv.event_id && !conv.related_invitation_id && !conv.fixed_plan_id;
    const otherMember = conv.conversation_members?.find((m: any) => m.user_id !== user.id);
    const eventInfo = Array.isArray(conv.events) ? conv.events[0] : conv.events;
    
    let displayName = 'ユーザー';
    let displayAvatar = null;
    let subtitle = eventInfo?.title || 'イベント';

    if (isGroupChat) {
      displayName = eventInfo?.title || 'イベント';
      const preview = await getEventParticipantPreview(conv.event_id!);
      const participantCount = preview?.participantCount || 1;
      
      displayAvatar = eventInfo?.poster_url || null;
      subtitle = `${participantCount}人が参加`;
    } else {
      const profileInfo = otherMember ? profilesMap.get(otherMember.user_id) : null;
      displayName = profileInfo?.nickname || 'ユーザー';
      displayAvatar = profileInfo?.avatar_url || null;
    }

    return {
      conversation_id: conv.conversation_id,
      other_nickname: displayName,
      other_avatar_url: displayAvatar,
      event_title: subtitle
    };
  }));

  return <ConnectionsView eventInvitations={eventInvitations || []} activeConversations={activeConversations} />;
}
