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
        invitations(sender_user_id, receiver_user_id, invitation_status),
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

  const { activityLabel } = getFixedPlanInvitationCopy({
    activityType: fixedPlan.activity_type,
    customActivityName: fixedPlan.custom_activity_name,
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
      plan={{
        activityLabel,
        daysOfWeek: fixedPlan.days_of_week,
        startTime: fixedPlan.start_time,
        placeName: fixedPlan.place_name,
        latitude: fixedPlan.latitude,
        longitude: fixedPlan.longitude,
      }}
    />
  );
}
