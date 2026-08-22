import { createClient } from '@/infrastructure/auth/server';
import ConnectionsView from './ConnectionsView';
import { getEventParticipantPreview } from '@/features/events/lib/getEventParticipantPreview';
import { getLatestMessagesByConversation } from '@/features/connections/domain/getLatestMessagesByConversation';

export default async function ConnectionsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;
  const initialTab = resolvedSearchParams.tab === 'plans' ? '同行予定' : 'あいさつ';

  const { data: eventInvitations, error } = await supabase
    .rpc('get_received_event_invitations');

  if (error) {
    console.error('Error fetching event invitations:', error);
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return <ConnectionsView eventInvitations={eventInvitations || []} activeConversations={[]} sentPlanInvitations={[]} initialTab={initialTab} />;
  }

  // Fetch active conversations (Events + Accepted Fixed Plans)
  const { data: conversationsData, error: convError } = await supabase
    .from('conversations')
    .select(`
      conversation_id,
      event_id,
      related_invitation_id,
      fixed_plan_id,
      events ( title, poster_url, start_at, end_at ),
      fixed_plans ( activity_type, days_of_week, start_time ),
      invitations ( invitation_status ),
      conversation_members (
        user_id,
        left_at
      )
    `)
    .eq('conversation_status', 'active')
    .or('event_id.not.is.null,fixed_plan_id.not.is.null');

  if (convError) {
    console.error('Error fetching conversations:', convError);
  }

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
    if (!myMember || myMember.left_at !== null) return false;
    
    if (conv.event_id) return true;
    
    // For fixed plan conversations, only show if accepted
    if (conv.fixed_plan_id) {
      const inv = Array.isArray(conv.invitations) ? conv.invitations[0] : conv.invitations;
      return inv?.invitation_status === 'accepted';
    }
    return false;
  });

  const conversationIds = filteredConvs.map((conversation) => conversation.conversation_id);
  let latestMessageByConversation = new Map<string, { content: string; created_at: string }>();
  if (conversationIds.length > 0) {
    const { data: latestMessages } = await supabase
      .from('messages')
      .select('conversation_id, content, created_at')
      .in('conversation_id', conversationIds)
      .not('content', 'is', null)
      .order('created_at', { ascending: false });

    latestMessageByConversation = getLatestMessagesByConversation(latestMessages || []);
  }

  const { data: fixedPlanDisplays, error: fixedPlanDisplaysError } = await supabase
    .rpc('get_my_fixed_plan_invitation_displays');
  if (fixedPlanDisplaysError) {
    console.error('Failed to load fixed-plan invitation snapshots');
  }
  const fixedPlanDisplayByInvitationId = new Map(
    (fixedPlanDisplays ?? []).map((display) => [display.invitation_id, display] as const),
  );

  const activeConversations = await Promise.all(filteredConvs.map(async conv => {
    const isGroupChat = conv.event_id && !conv.related_invitation_id && !conv.fixed_plan_id;
    const isFixedPlan = !!conv.fixed_plan_id;
    const otherMember = conv.conversation_members?.find((m: any) => m.user_id !== user.id);
    const eventInfo = Array.isArray(conv.events) ? conv.events[0] : conv.events;
    const planInfo = Array.isArray(conv.fixed_plans) ? conv.fixed_plans[0] : conv.fixed_plans;
    const planDisplay = conv.related_invitation_id
      ? fixedPlanDisplayByInvitationId.get(conv.related_invitation_id)
      : null;
    const latestMessage = latestMessageByConversation.get(conv.conversation_id);
    
    let displayName = 'ユーザー';
    let displayAvatar = null;
    let subtitle = '予定';
    let meetingPlaceName: string | null = null;

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
      
      if (isFixedPlan) {
        const activityLabels: Record<string, string> = { walking: '朝の散歩', morning_walk: '朝の散歩', running: 'ランニング', cycling: 'サイクリング' };
        const activityType = planDisplay?.sender_activity_type ?? planInfo?.activity_type;
        subtitle = activityType ? (activityLabels[activityType] || activityType) : '同行予定';

        if (conv.related_invitation_id) {
          const { data: suggestedPlace, error: suggestedPlaceError } = await supabase
            .rpc('get_fixed_plan_invitation_suggested_place', {
              p_invitation_id: conv.related_invitation_id,
            })
            .maybeSingle();

          if (suggestedPlaceError) {
            console.error('Failed to load accepted meeting place');
          } else {
            meetingPlaceName = suggestedPlace?.suggested_place_name ?? null;
          }
        }
      } else {
        subtitle = eventInfo?.title || 'イベント';
      }
    }

    return {
      conversation_id: conv.conversation_id,
      other_nickname: displayName,
      other_avatar_url: displayAvatar,
      event_title: subtitle,
      is_fixed_plan: isFixedPlan,
      last_message: latestMessage?.content || null,
      last_message_at: latestMessage?.created_at || null,
      fixed_plan_days_of_week: planDisplay?.sender_days_of_week ?? planInfo?.days_of_week ?? [],
      fixed_plan_start_time: (planDisplay?.sender_start_time ?? planInfo?.start_time)?.substring(0, 5) ?? null,
      fixed_plan_activity_type: planDisplay?.sender_activity_type ?? planInfo?.activity_type ?? null,
      meeting_place_name: meetingPlaceName,
    };
  }));

  // Fetch pending fixed plan invitations sent by the current user
  const { data: sentInvitationsData, error: sentInvError } = await supabase
    .from('invitations')
    .select(`
      invitation_id,
      fixed_plan_id,
      receiver_user_id,
      invitation_status,
      fixed_plans ( activity_type, days_of_week, start_time ),
      conversations!inner ( conversation_id )
    `)
    .eq('sender_user_id', user.id)
    .eq('invitation_status', 'pending')
    .not('fixed_plan_id', 'is', null)
    .is('event_id', null);

  if (sentInvError) {
    console.error('Error fetching sent fixed plan invitations:', sentInvError);
  }

  // Fetch pending fixed plan invitations RECEIVED by the current user
  const { data: receivedInvitationsData, error: receivedInvError } = await supabase
    .from('invitations')
    .select(`
      invitation_id,
      fixed_plan_id,
      sender_user_id,
      invitation_status,
      fixed_plans ( activity_type, days_of_week, start_time ),
      conversations!inner ( conversation_id )
    `)
    .eq('receiver_user_id', user.id)
    .eq('invitation_status', 'pending')
    .not('fixed_plan_id', 'is', null)
    .is('event_id', null);

  if (receivedInvError) {
    console.error('Error fetching received fixed plan invitations:', receivedInvError);
  }

  // We need the receiver AND sender profiles
  const profileIdsToFetch = new Set<string>();
  sentInvitationsData?.forEach(inv => profileIdsToFetch.add(inv.receiver_user_id));
  receivedInvitationsData?.forEach(inv => profileIdsToFetch.add(inv.sender_user_id));

  const planProfilesMap = new Map<string, { nickname: string, avatar_url: string | null }>();
  if (profileIdsToFetch.size > 0) {
    const { data: planProfilesData } = await supabase
      .from('profiles')
      .select('user_id, nickname, avatar_url')
      .in('user_id', Array.from(profileIdsToFetch));
      
    planProfilesData?.forEach(p => {
      planProfilesMap.set(p.user_id, p);
    });
  }

  const sentPlanInvitations = (sentInvitationsData || []).map(inv => {
    const receiverProfile = planProfilesMap.get(inv.receiver_user_id);
    const planInfo = Array.isArray(inv.fixed_plans) ? inv.fixed_plans[0] : inv.fixed_plans;
    const conversationInfo = Array.isArray(inv.conversations) ? inv.conversations[0] : inv.conversations;
    const planDisplay = fixedPlanDisplayByInvitationId.get(inv.invitation_id);

    return {
      invitation_id: inv.invitation_id,
      conversation_id: conversationInfo?.conversation_id || '',
      receiver_nickname: receiverProfile?.nickname || 'ユーザー',
      receiver_avatar_url: receiverProfile?.avatar_url || null,
      activity_type: planDisplay?.sender_activity_type ?? planInfo?.activity_type ?? '',
      days_of_week: planDisplay?.sender_days_of_week ?? planInfo?.days_of_week ?? [],
      start_time: planDisplay?.sender_start_time ?? planInfo?.start_time ?? ''
    };
  });

  const receivedPlanInvitations = (receivedInvitationsData || []).map(inv => {
    const senderProfile = planProfilesMap.get(inv.sender_user_id);
    const planInfo = Array.isArray(inv.fixed_plans) ? inv.fixed_plans[0] : inv.fixed_plans;
    const conversationInfo = Array.isArray(inv.conversations) ? inv.conversations[0] : inv.conversations;
    const planDisplay = fixedPlanDisplayByInvitationId.get(inv.invitation_id);

    return {
      invitation_id: inv.invitation_id,
      conversation_id: conversationInfo?.conversation_id || '',
      sender_nickname: senderProfile?.nickname || 'ユーザー',
      sender_avatar_url: senderProfile?.avatar_url || null,
      activity_type: planDisplay?.sender_activity_type ?? planInfo?.activity_type ?? '',
      days_of_week: planDisplay?.sender_days_of_week ?? planInfo?.days_of_week ?? [],
      start_time: planDisplay?.sender_start_time ?? planInfo?.start_time ?? ''
    };
  });

  return <ConnectionsView 
    eventInvitations={eventInvitations || []} 
    activeConversations={activeConversations} 
    sentPlanInvitations={sentPlanInvitations}
    receivedPlanInvitations={receivedPlanInvitations}
    initialTab={initialTab}
  />;
}
