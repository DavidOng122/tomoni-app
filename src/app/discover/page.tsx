import React from 'react';
import { createClient } from '@/infrastructure/auth/server';
import { redirect } from 'next/navigation';
import { DiscoverView } from './DiscoverView';
import { getRecommendations } from '@/features/discover/server/getRecommendations';
import { DiscoverRecommendation } from '@/features/discover/types';
import { Database } from '@/types/database.types';
import { ACTIVITY_LABELS } from '@/features/fixed-schedules/lib/constants';
import type { ActivityType } from '@/features/fixed-schedules/types';
import { formatWeekdays } from '@/features/fixed-schedules/lib/formatters';
import { filterRecommendationsForPlan } from '@/features/discover/domain/filterRecommendationsForPlan';
import { getEventParticipantPreview } from '@/features/events/lib/getEventParticipantPreview';
import { getEventOrganizerAvatarUrl } from '@/features/events/domain/getEventOrganizerAvatarUrl';
import { getEventPosterUrl } from '@/features/events/domain/getEventPosterUrl';
import { getPendingEventJoinRequests } from '@/features/events/lib/getPendingEventJoinRequests';
import { sortCommunityEvents } from '@/features/events/domain/sortCommunityEvents';
import {
  formatUpcomingCompanionDateTime,
  getNearestUpcomingCompanion,
} from '@/features/discover/domain/getNearestUpcomingCompanion';


export default async function DiscoverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/welcome');
  }

  const [{ count: pendingInvitationCount, error: pendingInvitationCountError }, pendingEventJoinRequests] = await Promise.all([
    supabase
      .from('invitations')
      .select('invitation_id', { count: 'exact', head: true })
      .eq('receiver_user_id', user.id)
      .eq('invitation_status', 'pending'),
    getPendingEventJoinRequests(user.id),
  ]);

  if (pendingInvitationCountError) {
    console.error('Failed to count pending invitations:', pendingInvitationCountError);
  }
  const pendingNotificationCount = (pendingInvitationCount ?? 0) + pendingEventJoinRequests.length;

  const { data: fixedPlans } = await supabase
    .from('fixed_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('plan_status', 'active')
    .order('created_at', { ascending: true })
    .order('fixed_plan_id', { ascending: true });

  const activePlans = fixedPlans || [];
  const hasPlans = activePlans.length > 0;

  const { data: acceptedInvitations } = await supabase
    .from('invitations')
    .select(`
      invitation_id,
      sender_user_id,
      receiver_user_id,
      fixed_plans(activity_type, custom_activity_name, days_of_week, start_time, place_name),
      conversations!inner(
        conversation_id,
        conversation_status,
        conversation_members(user_id, left_at)
      )
    `)
    .eq('invitation_type', 'fixed_plan')
    .eq('invitation_status', 'accepted')
    .or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`);

  const acceptedCompanions = (acceptedInvitations || []).flatMap((invitation) => {
    const fixedPlan = Array.isArray(invitation.fixed_plans)
      ? invitation.fixed_plans[0]
      : invitation.fixed_plans;
    const conversation = Array.isArray(invitation.conversations)
      ? invitation.conversations[0]
      : invitation.conversations;
    const isActiveMember = conversation?.conversation_members?.some(
      (member) => member.user_id === user.id && member.left_at === null,
    );

    if (!fixedPlan || conversation?.conversation_status !== 'active' || !isActiveMember) {
      return [];
    }

    const otherUserId = invitation.sender_user_id === user.id
      ? invitation.receiver_user_id
      : invitation.sender_user_id;

    return [{ invitation, fixedPlan, conversation, otherUserId }];
  });

  const companionProfileByUserId = new Map<string, { nickname: string; avatar_url: string | null }>();
  const companionUserIds = [...new Set(acceptedCompanions.map((item) => item.otherUserId))];

  if (companionUserIds.length > 0) {
    const { data: companionProfiles } = await supabase
      .from('profiles')
      .select('user_id, nickname, avatar_url')
      .in('user_id', companionUserIds);

    companionProfiles?.forEach((companionProfile) => {
      companionProfileByUserId.set(companionProfile.user_id, companionProfile);
    });
  }

  const nearestCompanion = getNearestUpcomingCompanion(
    acceptedCompanions.flatMap(({ invitation, fixedPlan, conversation, otherUserId }) => {
      const companionProfile = companionProfileByUserId.get(otherUserId);
      if (!companionProfile) return [];

      return [{
        invitationId: invitation.invitation_id,
        conversationId: conversation.conversation_id,
        otherUserId,
        nickname: companionProfile.nickname,
        avatarUrl: companionProfile.avatar_url,
        activityType: fixedPlan.activity_type,
        customActivityName: fixedPlan.custom_activity_name,
        daysOfWeek: fixedPlan.days_of_week,
        startTime: fixedPlan.start_time,
        placeName: fixedPlan.place_name,
      }];
    }),
  );

  let currentMeetingPlaceName: string | null = null;
  if (nearestCompanion) {
    const { data: invitationPlace, error: invitationPlaceError } = await supabase
      .rpc('get_fixed_plan_invitation_suggested_place', {
        p_invitation_id: nearestCompanion.invitationId,
      })
      .maybeSingle();

    if (invitationPlaceError) {
      console.error('Failed to load the current companion meeting place');
    }

    currentMeetingPlaceName = invitationPlace?.suggested_place_name ?? null;
  }

  const currentActivity = nearestCompanion ? {
    conversationId: nearestCompanion.conversationId,
    name: nearestCompanion.nickname,
    verified: true,
    eventTitle: nearestCompanion.activityType === 'other'
      ? nearestCompanion.customActivityName || 'その他'
      : ACTIVITY_LABELS[nearestCompanion.activityType as keyof typeof ACTIVITY_LABELS]
        || nearestCompanion.activityType,
    dateTime: formatUpcomingCompanionDateTime(nearestCompanion.nextOccurrence),
    location: currentMeetingPlaceName ?? '合流地点を確認中',
    avatarUrl: nearestCompanion.avatarUrl,
  } : null;

  const recommendationGroups = await Promise.all(activePlans.map(async (plan) => {
    const planRecommendations = await getRecommendations(plan.fixed_plan_id);

    return {
      fixedPlanId: plan.fixed_plan_id,
      activityType: plan.activity_type as ActivityType,
      title: plan.activity_type === 'other'
        ? plan.custom_activity_name || 'その他'
        : ACTIVITY_LABELS[plan.activity_type as keyof typeof ACTIVITY_LABELS] || plan.activity_type,
      scheduleLabel: plan.activity_type === 'event'
        ? `毎週${formatWeekdays(plan.days_of_week as any[])}曜`
        : `毎週${formatWeekdays(plan.days_of_week as any[])}曜 ${plan.start_time.substring(0, 5).replace(/^0/, '')}ごろ`,
      recommendations: filterRecommendationsForPlan(planRecommendations, plan.fixed_plan_id),
    };
  }));

  const now = new Date().toISOString();
  const { data: ownGoingParticipations, error: participationsError } = await supabase
    .from('event_participations')
    .select('event_id')
    .eq('user_id', user.id)
    .eq('participation_status', 'going');

  if (participationsError) {
    console.error('Failed to fetch own event participations:', participationsError);
  }

  const joinedEventIds = new Set(
    (ownGoingParticipations || []).map((participation) => participation.event_id),
  );

  const { data: eventsData, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .eq('event_status', 'scheduled')
    .or(`end_at.gte.${now},and(end_at.is.null,start_at.gte.${now})`)
    .order('start_at', { ascending: true })
    .order('event_id', { ascending: true })
    .limit(10);

  if (eventsError) {
    console.error("Failed to fetch events:", eventsError);
  }

  let eventRows = eventsData || [];

  const missingJoinedEventIds = [...joinedEventIds].filter(
    (eventId) => !eventRows.some((event) => event.event_id === eventId),
  );

  if (missingJoinedEventIds.length > 0) {
    const { data: missingJoinedEvents, error: missingJoinedEventsError } = await supabase
      .from('events')
      .select('*')
      .in('event_id', missingJoinedEventIds)
      .eq('event_status', 'scheduled')
      .or(`end_at.gte.${now},and(end_at.is.null,start_at.gte.${now})`);

    if (missingJoinedEventsError) {
      console.error('Failed to fetch joined community events:', missingJoinedEventsError);
    } else {
      eventRows = [...eventRows, ...(missingJoinedEvents || [])];
    }
  }

  eventRows = sortCommunityEvents(eventRows, joinedEventIds).slice(0, 10);
  const organizerIds = eventRows.flatMap((event) => event.created_by_user_id ? [event.created_by_user_id] : []);
  const organizerAvatarByUserId = new Map<string, string | null>();

  if (organizerIds.length > 0) {
    const { data: organizerProfiles } = await supabase
      .from('profiles')
      .select('user_id, avatar_url')
      .in('user_id', organizerIds);
    organizerProfiles?.forEach((organizer) => {
      organizerAvatarByUserId.set(organizer.user_id, organizer.avatar_url);
    });
  }

  const events = await Promise.all(eventRows.map(async (event) => ({
    ...event,
    isParticipating: joinedEventIds.has(event.event_id),
    organizerAvatarUrl: getEventOrganizerAvatarUrl({
      eventType: event.event_type,
      sourceDatasetId: event.source_dataset_id,
      sourceName: event.source_name,
      creatorAvatarUrl: event.created_by_user_id
        ? organizerAvatarByUserId.get(event.created_by_user_id) || null
        : null,
    }),
    displayPosterUrl: getEventPosterUrl({
      eventType: event.event_type,
      sourceDatasetId: event.source_dataset_id,
      posterUrl: event.poster_url,
    }),
    participantPreview: await getEventParticipantPreview(event.event_id),
  })));

  return (
    <DiscoverView
      hasPlans={hasPlans}
      events={events}
      currentActivity={currentActivity}
      recommendationGroups={recommendationGroups}
      pendingNotificationCount={pendingNotificationCount}
    />
  );
}
