import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/auth/server';
import { ACTIVITY_LABELS } from '@/features/fixed-schedules/lib/constants';
import { buildNotificationFeed } from '@/features/notifications/domain/buildNotificationFeed';
import { getPendingEventJoinRequests } from '@/features/events/lib/getPendingEventJoinRequests';
import NotificationsView from './NotificationsView';

const DAY_LABELS: Record<string, string> = {
  mon: '月',
  tue: '火',
  wed: '水',
  thu: '木',
  fri: '金',
  sat: '土',
  sun: '日',
};

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/welcome');

  const [invitationsResult, membershipsResult, fixedPlanDisplaysResult, eventJoinRequests] = await Promise.all([
    supabase
      .from('invitations')
      .select(`
        invitation_id,
        sender_user_id,
        receiver_user_id,
        invitation_type,
        invitation_status,
        cancelled_by_user_id,
        created_at,
        responded_at,
        event_id,
        fixed_plans(activity_type, custom_activity_name, days_of_week, start_time),
        events(title, poster_url),
        conversations(conversation_id)
      `)
      .or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(60),
    supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id)
      .is('left_at', null),
    supabase.rpc('get_my_fixed_plan_invitation_displays'),
    getPendingEventJoinRequests(user.id),
  ]);

  if (invitationsResult.error) {
    console.error('Failed to load notification invitations');
  }
  if (membershipsResult.error) {
    console.error('Failed to load notification memberships');
  }
  if (fixedPlanDisplaysResult.error) {
    console.error('Failed to load notification Fixed Plan snapshots');
  }

  const fixedPlanDisplayByInvitationId = new Map(
    (fixedPlanDisplaysResult.data ?? []).map((display) => [display.invitation_id, display] as const),
  );

  const conversationIds = (membershipsResult.data ?? []).map((membership) => membership.conversation_id);
  const messagesResult = conversationIds.length > 0
    ? await supabase
        .from('messages')
        .select('message_id, conversation_id, sender_user_id, message_type, content, created_at')
        .in('conversation_id', conversationIds)
        .neq('sender_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(40)
    : { data: [], error: null };

  if (messagesResult.error) {
    console.error('Failed to load notification messages');
  }

  const invitations = invitationsResult.data ?? [];
  const messages = messagesResult.data ?? [];
  const profileIds = new Set<string>();

  invitations.forEach((invitation) => {
    profileIds.add(invitation.sender_user_id === user.id
      ? invitation.receiver_user_id
      : invitation.sender_user_id);
  });
  messages.forEach((message) => profileIds.add(message.sender_user_id));

  const profilesResult = profileIds.size > 0
    ? await supabase
        .from('profiles')
        .select('user_id, nickname, avatar_url')
        .in('user_id', [...profileIds])
    : { data: [], error: null };

  if (profilesResult.error) {
    console.error('Failed to load notification profiles');
  }

  const profilesByUserId = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.user_id, profile] as const),
  );

  const invitationSources = invitations.flatMap((invitation) => {
    if (invitation.invitation_type !== 'fixed_plan' && invitation.invitation_type !== 'event') {
      return [];
    }
    const invitationType: 'fixed_plan' | 'event' = invitation.invitation_type;

    const actorUserId = invitation.sender_user_id === user.id
      ? invitation.receiver_user_id
      : invitation.sender_user_id;
    const actorProfile = profilesByUserId.get(actorUserId);
    const fixedPlan = firstRelation(invitation.fixed_plans);
    const fixedPlanDisplay = fixedPlanDisplayByInvitationId.get(invitation.invitation_id);
    const event = firstRelation(invitation.events);
    const conversation = firstRelation(invitation.conversations);

    let activitySummary = event?.title ?? 'イベントのお誘い';
    if (fixedPlan || fixedPlanDisplay) {
      const activityType = (fixedPlanDisplay?.sender_activity_type ?? fixedPlan?.activity_type) as keyof typeof ACTIVITY_LABELS;
      const activityName = activityType === 'other'
        ? fixedPlanDisplay?.sender_custom_activity_name || fixedPlan?.custom_activity_name || ACTIVITY_LABELS.other
        : ACTIVITY_LABELS[activityType] || '同行予定';
      const weekdays = (fixedPlanDisplay?.sender_days_of_week ?? fixedPlan?.days_of_week ?? [])
        .map((day) => DAY_LABELS[day] ?? day)
        .join('・');
      const time = (fixedPlanDisplay?.sender_start_time ?? fixedPlan?.start_time)?.substring(0, 5) ?? '';
      activitySummary = [activityName, weekdays && `${weekdays} ${time}ごろ`]
        .filter(Boolean)
        .join(' · ');
    }

    return [{
      invitationId: invitation.invitation_id,
      senderUserId: invitation.sender_user_id,
      receiverUserId: invitation.receiver_user_id,
      cancelledByUserId: invitation.cancelled_by_user_id,
      invitationType,
      invitationStatus: invitation.invitation_status,
      createdAt: invitation.created_at,
      respondedAt: invitation.responded_at,
      actorName: actorProfile?.nickname ?? 'ユーザー',
      actorAvatarUrl: actorProfile?.avatar_url ?? null,
      conversationId: conversation?.conversation_id ?? null,
      eventId: invitation.event_id,
      eventTitle: event?.title ?? null,
      eventPosterUrl: event?.poster_url ?? null,
      activitySummary,
    }];
  });

  const messageSources = messages.map((message) => {
    const senderProfile = profilesByUserId.get(message.sender_user_id);
    return {
      messageId: message.message_id,
      conversationId: message.conversation_id,
      senderUserId: message.sender_user_id,
      messageType: message.message_type,
      content: message.content,
      createdAt: message.created_at,
      senderName: senderProfile?.nickname ?? 'ユーザー',
      senderAvatarUrl: senderProfile?.avatar_url ?? null,
    };
  });

  const notifications = buildNotificationFeed({
    currentUserId: user.id,
    invitations: invitationSources,
    messages: messageSources,
    eventJoinRequests,
  });

  return <NotificationsView notifications={notifications} nowIso={new Date().toISOString()} />;
}
