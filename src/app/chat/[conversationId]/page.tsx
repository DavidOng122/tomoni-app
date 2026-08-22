import { createClient } from '@/infrastructure/auth/server';
import { notFound, redirect } from 'next/navigation';
import ChatClient, { type FixedPlanContext } from './ChatClient';
import { getFixedPlanInvitationCopy } from '@/features/invitations/domain/getFixedPlanInvitationCopy';
import { getOtherParticipantUserId } from '@/features/chat/domain/getOtherParticipantUserId';
import { getPublicPlaceImageUrl } from '@/features/public-places/domain/getPublicPlaceImageUrl';

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
      invitations(sender_user_id, receiver_user_id, invitation_status, cancelled_by_user_id, message),
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
  const isEventCompanion = !!(conversationData.event_id && conversationData.related_invitation_id && !conversationData.fixed_plan_id);

  if (conversationData.conversation_status === 'closed') {
    if (!isFixedPlan && !isEventCompanion) {
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

  let fixedPlanContext: FixedPlanContext | null = null;

  if (isFixedPlan) {
    const inv = Array.isArray(conversationData.invitations) ? conversationData.invitations[0] : conversationData.invitations;
    const plan = Array.isArray(conversationData.fixed_plans) ? conversationData.fixed_plans[0] : conversationData.fixed_plans;
    if (inv && plan) {
      const { data: invitationDisplay, error: invitationDisplayError } = await supabase
        .rpc('get_fixed_plan_invitation_display', {
          p_invitation_id: conversationData.related_invitation_id as string,
        })
        .maybeSingle();
      if (invitationDisplayError) {
        throw new Error(`Failed to load fixed-plan snapshot: ${invitationDisplayError.message}`);
      }

      const isSender = inv.sender_user_id === user.id;
      const activityType = invitationDisplay?.sender_activity_type ?? plan.activity_type;
      const customActivityName = invitationDisplay?.sender_custom_activity_name ?? plan.custom_activity_name;
      const snapshotDays = invitationDisplay?.sender_days_of_week ?? plan.days_of_week;
      const snapshotStartTime = invitationDisplay?.sender_start_time ?? plan.start_time;
      let senderFixedPlanId = invitationDisplay?.sender_fixed_plan_id ?? plan.fixed_plan_id;
      let receiverFixedPlanId: string | null = invitationDisplay?.receiver_fixed_plan_id ?? null;
      let senderAreaName = invitationDisplay?.sender_place_name ?? plan.place_name ?? '';
      let receiverAreaName = invitationDisplay?.receiver_place_name ?? '';
      let suggestedPlace: FixedPlanContext['suggestedPlace'] = null;

      if (activityType === 'event') {
        const { data: recommendation, error: recommendationError } = await supabase
          .rpc('get_fixed_plan_invitation_recommendation', {
            p_invitation_id: conversationData.related_invitation_id as string,
          })
          .maybeSingle();
        if (recommendationError) {
          throw new Error(`Failed to load event recommendation: ${recommendationError.message}`);
        }
        senderFixedPlanId = recommendation?.sender_fixed_plan_id ?? senderFixedPlanId;
        receiverFixedPlanId = recommendation?.receiver_fixed_plan_id ?? null;
        senderAreaName = recommendation?.sender_area_name ?? senderAreaName;
        receiverAreaName = recommendation?.receiver_area_name ?? '';
        suggestedPlace = recommendation?.recommendation_kind
          && recommendation.title
          && recommendation.place_name
          && recommendation.source_name
          && recommendation.sender_distance_meters !== null
          && recommendation.receiver_distance_meters !== null
          ? {
              kind: recommendation.recommendation_kind === 'event' ? 'event' : 'cultural_facility',
              name: recommendation.title,
              placeName: recommendation.place_name,
              sourceName: recommendation.source_name,
              imageUrl: recommendation.image_url || null,
              viewerDistanceMeters: isSender
                ? recommendation.sender_distance_meters
                : recommendation.receiver_distance_meters,
              otherDistanceMeters: isSender
                ? recommendation.receiver_distance_meters
                : recommendation.sender_distance_meters,
              eventStartAt: recommendation.start_at || null,
              eventStatus: recommendation.event_status || null,
              registrationStatus: recommendation.registration_status || null,
              requiresHoursConfirmation: recommendation.requires_hours_confirmation,
            }
          : null;
      } else {
        const { data: invitationPlace, error: invitationPlaceError } = await supabase
          .rpc('get_fixed_plan_invitation_suggested_place', {
            p_invitation_id: conversationData.related_invitation_id as string,
          })
          .maybeSingle();
        if (invitationPlaceError) {
          throw new Error(`Failed to load suggested place: ${invitationPlaceError.message}`);
        }
        senderFixedPlanId = invitationPlace?.sender_fixed_plan_id ?? senderFixedPlanId;
        receiverFixedPlanId = invitationPlace?.receiver_fixed_plan_id ?? null;
        senderAreaName = invitationPlace?.sender_area_name ?? senderAreaName;
        receiverAreaName = invitationPlace?.receiver_area_name ?? '';

        const { data: suggestedPlaceMedia, error: suggestedPlaceMediaError } = invitationPlace?.suggested_public_place_id
          ? await supabase
              .from('public_places')
              .select('attributes')
              .eq('public_place_id', invitationPlace.suggested_public_place_id)
              .maybeSingle()
          : { data: null, error: null };
        if (suggestedPlaceMediaError) {
          throw new Error(`Failed to load suggested place media: ${suggestedPlaceMediaError.message}`);
        }
        suggestedPlace = invitationPlace?.suggested_public_place_id
          && invitationPlace.suggested_place_name
          && invitationPlace.suggested_place_source_name
          && invitationPlace.sender_distance_meters !== null
          && invitationPlace.receiver_distance_meters !== null
          ? {
              kind: 'public_place',
              name: invitationPlace.suggested_place_name,
              placeName: invitationPlace.suggested_place_name,
              sourceName: invitationPlace.suggested_place_source_name,
              imageUrl: getPublicPlaceImageUrl(suggestedPlaceMedia?.attributes),
              viewerDistanceMeters: isSender
                ? invitationPlace.sender_distance_meters
                : invitationPlace.receiver_distance_meters,
              otherDistanceMeters: isSender
                ? invitationPlace.receiver_distance_meters
                : invitationPlace.sender_distance_meters,
              eventStartAt: null,
              eventStatus: null,
              registrationStatus: null,
              requiresHoursConfirmation: false,
            }
          : null;
      }

      const invitationCopy = getFixedPlanInvitationCopy({
        activityType,
        customActivityName,
        invitationMessage: inv.message,
        isSender,
        otherNickname,
      });
      const discoveryUrl = isSender
        ? `/discover/schedules/${senderFixedPlanId}/people`
        : receiverFixedPlanId
          ? `/discover/schedules/${receiverFixedPlanId}/people`
          : '/discover';

      fixedPlanContext = {
        invitationId: conversationData.related_invitation_id as string,
        invitationStatus: inv.invitation_status,
        cancelledByCurrentUser: inv.cancelled_by_user_id
          ? inv.cancelled_by_user_id === user.id
          : null,
        isSender,
        otherNickname,
        otherAvatarUrl,
        headline: invitationCopy.headline,
        activityType,
        activityLabel: invitationCopy.activityLabel,
        inviteMessage: invitationCopy.inviteMessage,
        days_of_week: (snapshotDays as string[]).map((d) => DAY_LABELS[d] || d).join('・'),
        start_time: snapshotStartTime.substring(0, 5),
        sender_area_name: senderAreaName,
        receiver_area_name: receiverAreaName,
        suggestedPlace,
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
      isConversationClosed={conversationData.conversation_status === 'closed'}
    />
  );
}
