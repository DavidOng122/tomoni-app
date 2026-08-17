import { createClient } from '@/infrastructure/auth/server';
import { notFound, redirect } from 'next/navigation';
import ChatClient from './ChatClient';
import { getFixedPlanInvitationCopy } from '@/features/invitations/domain/getFixedPlanInvitationCopy';
import { getOtherParticipantUserId } from '@/features/chat/domain/getOtherParticipantUserId';

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
    .select(`
      conversation_status, 
      event_id, 
      related_invitation_id, 
      fixed_plan_id, 
      events(title, start_at, place_name),
      invitations(sender_user_id, receiver_user_id, invitation_status, message),
      fixed_plans(fixed_plan_id, activity_type, custom_activity_name, days_of_week, start_time, place_name)
    `)
    .eq('conversation_id', conversationId)
    .single();

  if (convError) {
    throw new Error(`Failed to load conversation: ${convError.message} (Code: ${convError.code})`);
  }
  if (!conversationData) {
    throw new Error(`Conversation not found in database for ID: ${conversationId}`);
  }

  const isGroupChat = !!(conversationData.event_id && !conversationData.related_invitation_id && !conversationData.fixed_plan_id);
  const isFixedPlan = !!(conversationData.fixed_plan_id && conversationData.related_invitation_id);

  if (conversationData.conversation_status === 'closed') {
    if (!isFixedPlan) {
      notFound();
    } else {
      const inv = Array.isArray(conversationData.invitations) ? conversationData.invitations[0] : conversationData.invitations;
      if (!inv || (inv.invitation_status !== 'declined' && inv.invitation_status !== 'cancelled')) {
        notFound();
      }
      // Valid terminal state
    }
  }


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

  if (isGroupChat) {
    redirect(`/events/${conversationData.event_id}/people`);
  }

  // Resolve the other member first, then load their profile separately.
  // conversation_members does not have a reliable direct embed to profiles.
  const { data: conversationMembers } = await supabase
    .from('conversation_members')
    .select('user_id, left_at')
    .eq('conversation_id', conversationId)
    .is('left_at', null);

  const otherParticipantUserId = getOtherParticipantUserId(
    user.id,
    conversationMembers || [],
  );
  const { data: otherProfile } = otherParticipantUserId
    ? await supabase
        .from('profiles')
        .select('nickname, avatar_url')
        .eq('user_id', otherParticipantUserId)
        .maybeSingle()
    : { data: null };

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
  let otherAvatarUrl: string | null = null;
  if (isGroupChat) {
    otherNickname = eventContext?.title || 'イベントグループ';
  } else if (otherProfile) {
    otherNickname = otherProfile?.nickname || 'ユーザー';
    otherAvatarUrl = otherProfile?.avatar_url || null;
  }

  let participantCount = 2; // Default for 1-on-1 to bypass empty state
  if (isGroupChat) {
    const { getEventParticipantPreview } = await import('@/features/events/lib/getEventParticipantPreview');
    const preview = await getEventParticipantPreview(conversationData.event_id!);
    participantCount = preview?.participantCount || 1;
  }

  const DAY_LABELS: Record<string, string> = { mon: '月', tue: '火', wed: '水', thu: '木', fri: '金', sat: '土', sun: '日' };

  let fixedPlanContext: {
    invitationId: string;
    invitationStatus: string;
    isSender: boolean;
    otherNickname: string;
    otherAvatarUrl: string | null;
    headline: string;
    activityLabel: string;
    inviteMessage: string;
    days_of_week: string;
    start_time: string;
    place_name: string;
    discoveryUrl: string;
    isConversationClosed: boolean;
  } | null = null;

  if (isFixedPlan) {
    const inv = Array.isArray(conversationData.invitations) ? conversationData.invitations[0] : conversationData.invitations;
    const plan = Array.isArray(conversationData.fixed_plans) ? conversationData.fixed_plans[0] : conversationData.fixed_plans;
    if (inv && plan) {
      const isSender = inv.sender_user_id === user.id;
      const invitationCopy = getFixedPlanInvitationCopy({
        activityType: plan.activity_type,
        customActivityName: plan.custom_activity_name,
        invitationMessage: inv.message,
        isSender,
        otherNickname,
      });
      // Sender → their own fixed plan's people page
      // Receiver → /discover (schema does not store which receiver plan was matched)
      const discoveryUrl = isSender
        ? `/discover/schedules/${plan.fixed_plan_id}/people`
        : '/discover';

      fixedPlanContext = {
        invitationId: conversationData.related_invitation_id as string,
        invitationStatus: inv.invitation_status,
        isSender,
        otherNickname,
        otherAvatarUrl,
        headline: invitationCopy.headline,
        activityLabel: invitationCopy.activityLabel,
        inviteMessage: invitationCopy.inviteMessage,
        days_of_week: (plan.days_of_week as string[]).map((d) => DAY_LABELS[d] || d).join('・'),
        start_time: plan.start_time.substring(0, 5),
        place_name: (plan as Record<string, unknown>).place_name as string || '',
        discoveryUrl,
        isConversationClosed: conversationData.conversation_status === 'closed',
      };
    }
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
      fixedPlanContext={fixedPlanContext}
    />
  );
}
