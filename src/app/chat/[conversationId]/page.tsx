import { createClient } from '@/infrastructure/auth/server';
import { notFound } from 'next/navigation';
import ChatClient from './ChatClient';

export default async function ChatPage(props: { params: Promise<{ conversationId: string }> }) {
  const params = await props.params;
  const conversationId = params.conversationId;

  if (!conversationId || conversationId === 'undefined') {
    throw new Error('Invalid conversation ID');
  }

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    notFound();
  }

  // Verify conversation
  const { data: conversationData, error: convError } = await supabase
    .from('conversations')
    .select('conversation_status, event_id, related_invitation_id, fixed_plan_id, events(title, start_at, place_name)')
    .eq('conversation_id', conversationId)
    .single();

  if (convError) {
    throw new Error(`Failed to load conversation: ${convError.message} (Code: ${convError.code})`);
  }
  if (!conversationData) {
    throw new Error(`Conversation not found in database for ID: ${conversationId}`);
  }

  const isGroupChat = !!(conversationData.event_id && !conversationData.related_invitation_id && !conversationData.fixed_plan_id);

  // Requirement 2: Active membership check
  const { data: myMemberData, error: memberError } = await supabase
    .from('conversation_members')
    .select('left_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single();

  if (memberError) {
    throw new Error(`Failed to load membership: ${memberError.message} (Code: ${memberError.code})`);
  }
  if (!myMemberData) {
    throw new Error(`Membership not found for user ${user.id} in conversation ${conversationId}`);
  }
  if (myMemberData.left_at !== null) {
    throw new Error(`User left the conversation at ${myMemberData.left_at}`);
  }

  // Load other member profile (for 1-on-1 or just one example member for now)
  const { data: otherMemberData } = await supabase
    .from('conversation_members')
    .select('profiles(nickname)')
    .eq('conversation_id', conversationId)
    .neq('user_id', user.id)
    .is('left_at', null)
    .limit(1);

  // Load latest 100 messages
  const { data: rawMessages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .order('message_id', { ascending: false })
    .limit(100);

  const initialMessages = rawMessages ? [...rawMessages].reverse() : [];
  const eventContext = Array.isArray(conversationData.events) ? conversationData.events[0] : conversationData.events;
  
  let otherNickname = 'ユーザー';
  if (isGroupChat) {
    otherNickname = eventContext?.title || 'イベントグループ';
  } else if (otherMemberData && otherMemberData.length > 0) {
    const otherProfile = Array.isArray(otherMemberData[0].profiles) ? otherMemberData[0].profiles[0] : otherMemberData[0].profiles;
    otherNickname = otherProfile?.nickname || 'ユーザー';
  }

  let participantCount = 2; // Default for 1-on-1 to bypass empty state
  if (isGroupChat) {
    const { getEventParticipantPreview } = await import('@/features/events/lib/getEventParticipantPreview');
    const preview = await getEventParticipantPreview(conversationData.event_id!);
    participantCount = preview?.participantCount || 1;
  }

  return (
    <ChatClient
      conversationId={conversationId}
      currentUserId={user.id}
      initialMessages={initialMessages}
      eventContext={{
        title: eventContext?.title || 'イベント',
        start_at: eventContext?.start_at || new Date().toISOString(),
        place_name: eventContext?.place_name || '場所未定',
      }}
      otherNickname={otherNickname}
      isGroupChat={isGroupChat}
      participantCount={participantCount}
    />
  );
}
