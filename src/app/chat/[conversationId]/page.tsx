import { createClient } from '@/infrastructure/auth/server';
import { notFound } from 'next/navigation';
import ChatClient from './ChatClient';

export default async function ChatPage({ params }: { params: { conversationId: string } }) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    notFound();
  }

  const conversationId = params.conversationId;

  // Verify conversation and event context
  // Requirement 5: conversation_status = 'active', event_id is not null
  const { data: conversationData, error: convError } = await supabase
    .from('conversations')
    .select('conversation_status, event_id, events(title, start_at, place_name)')
    .eq('conversation_id', conversationId)
    .single();

  if (convError || !conversationData || !conversationData.event_id) {
    notFound();
  }

  // Requirement 2: Active membership check
  const { data: myMemberData, error: memberError } = await supabase
    .from('conversation_members')
    .select('left_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single();

  if (memberError || !myMemberData || myMemberData.left_at !== null) {
    notFound();
  }

  // Load other member profile
  const { data: otherMemberData } = await supabase
    .from('conversation_members')
    .select('profiles(nickname)')
    .eq('conversation_id', conversationId)
    .neq('user_id', user.id)
    .is('left_at', null)
    .limit(1)
    .single();

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
  const otherProfile = Array.isArray(otherMemberData?.profiles) ? otherMemberData?.profiles[0] : otherMemberData?.profiles;
  const otherNickname = otherProfile?.nickname || 'ユーザー';

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
    />
  );
}
