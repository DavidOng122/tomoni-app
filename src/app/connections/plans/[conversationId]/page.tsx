import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/auth/server';
import { getFixedPlanInvitationCopy } from '@/features/invitations/domain/getFixedPlanInvitationCopy';
import { canViewAcceptedPlanDetail } from '@/features/fixed-schedules/domain/canViewAcceptedPlanDetail';
import AcceptedPlanDetailView from './AcceptedPlanDetailView';

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function AcceptedPlanDetailPage({ params }: PageProps) {
  const { conversationId } = await params;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(conversationId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/welcome');
  }

  const [{ data: conversation }, { data: membership }] = await Promise.all([
    supabase
      .from('conversations')
      .select(`
        conversation_status,
        fixed_plan_id,
        invitations(invitation_id, sender_user_id, receiver_user_id, invitation_status),
        fixed_plans(activity_type, custom_activity_name, days_of_week, start_time, place_name, latitude, longitude)
      `)
      .eq('conversation_id', conversationId)
      .maybeSingle(),
    supabase
      .from('conversation_members')
      .select('left_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const invitation = Array.isArray(conversation?.invitations)
    ? conversation.invitations[0]
    : conversation?.invitations;
  const fixedPlan = Array.isArray(conversation?.fixed_plans)
    ? conversation.fixed_plans[0]
    : conversation?.fixed_plans;

  const mayView = conversation && canViewAcceptedPlanDetail({
    conversationStatus: conversation.conversation_status,
    invitationStatus: invitation?.invitation_status ?? null,
    isActiveMember: membership?.left_at === null,
    hasFixedPlan: Boolean(conversation.fixed_plan_id && fixedPlan),
  });

  if (!mayView || !invitation || !fixedPlan) {
    notFound();
  }

  const otherUserId = invitation.sender_user_id === user.id
    ? invitation.receiver_user_id
    : invitation.sender_user_id;

  if (!otherUserId || (
    invitation.sender_user_id !== user.id
    && invitation.receiver_user_id !== user.id
  )) {
    notFound();
  }

  const { data: otherProfile } = await supabase
    .from('profiles')
    .select('nickname, avatar_url, age_range')
    .eq('user_id', otherUserId)
    .maybeSingle();

  if (!otherProfile) {
    notFound();
  }

  const { data: fixedPlanDisplay, error: fixedPlanDisplayError } = await supabase
    .rpc('get_fixed_plan_invitation_display', {
      p_invitation_id: invitation.invitation_id,
    })
    .maybeSingle();
  if (fixedPlanDisplayError || !fixedPlanDisplay) {
    notFound();
  }

  const activityType = fixedPlanDisplay.sender_activity_type ?? fixedPlan.activity_type;
  const customActivityName = fixedPlanDisplay.sender_custom_activity_name ?? fixedPlan.custom_activity_name;
  const daysOfWeek = fixedPlanDisplay.sender_days_of_week ?? fixedPlan.days_of_week;
  const startTime = fixedPlanDisplay.sender_start_time ?? fixedPlan.start_time;

  let senderAreaName = fixedPlanDisplay.sender_place_name ?? fixedPlan.place_name ?? '';
  let receiverAreaName = fixedPlanDisplay.receiver_place_name ?? '';
  let suggestedPlace: {
    kind: 'event' | 'cultural_facility' | 'public_place';
    name: string;
    address: string | null;
    latitude: number;
    longitude: number;
    sourceName: string;
    eventStartAt: string | null;
    eventStatus: string | null;
    officialUrl: string | null;
    requiresHoursConfirmation: boolean;
  } | null = null;

  if (activityType === 'event') {
    const { data: recommendation, error: recommendationError } = await supabase
      .rpc('get_fixed_plan_invitation_recommendation', {
        p_invitation_id: invitation.invitation_id,
      })
      .maybeSingle();
    if (recommendationError || !recommendation) notFound();
    senderAreaName = recommendation.sender_area_name;
    receiverAreaName = recommendation.receiver_area_name;
    suggestedPlace = recommendation.recommendation_kind
      && recommendation.title
      && recommendation.place_latitude !== null
      && recommendation.place_longitude !== null
      ? {
          kind: recommendation.recommendation_kind === 'event' ? 'event' : 'cultural_facility',
          name: recommendation.title,
          address: recommendation.place_address || null,
          latitude: recommendation.place_latitude,
          longitude: recommendation.place_longitude,
          sourceName: recommendation.source_name ?? '江戸川区',
          eventStartAt: recommendation.start_at || null,
          eventStatus: recommendation.event_status || null,
          officialUrl: recommendation.official_url || null,
          requiresHoursConfirmation: recommendation.requires_hours_confirmation,
        }
      : null;
  } else {
    const { data: invitationPlace, error: invitationPlaceError } = await supabase
      .rpc('get_fixed_plan_invitation_suggested_place', {
        p_invitation_id: invitation.invitation_id,
      })
      .maybeSingle();
    if (invitationPlaceError || !invitationPlace) notFound();
    senderAreaName = invitationPlace.sender_area_name;
    receiverAreaName = invitationPlace.receiver_area_name;
    suggestedPlace = invitationPlace.suggested_public_place_id
      && invitationPlace.suggested_place_name
      && invitationPlace.suggested_place_latitude !== null
      && invitationPlace.suggested_place_longitude !== null
      ? {
          kind: 'public_place',
          name: invitationPlace.suggested_place_name,
          address: invitationPlace.suggested_place_address,
          latitude: invitationPlace.suggested_place_latitude,
          longitude: invitationPlace.suggested_place_longitude,
          sourceName: invitationPlace.suggested_place_source_name ?? '江戸川区',
          eventStartAt: null,
          eventStatus: null,
          officialUrl: null,
          requiresHoursConfirmation: false,
        }
      : null;
  }

  const { activityLabel } = getFixedPlanInvitationCopy({
    activityType,
    customActivityName,
    isSender: invitation.sender_user_id === user.id,
    otherNickname: otherProfile.nickname,
  });

  return (
    <AcceptedPlanDetailView
      person={{
        nickname: otherProfile.nickname,
        avatarUrl: otherProfile.avatar_url,
        ageRange: otherProfile.age_range,
      }}
      activityAreas={{
        sender: senderAreaName,
        receiver: receiverAreaName,
        other: invitation.sender_user_id === user.id
          ? receiverAreaName
          : senderAreaName,
      }}
      plan={{
        activityType,
        activityLabel,
        daysOfWeek,
        startTime,
      }}
      suggestedPlace={suggestedPlace}
    />
  );
}
