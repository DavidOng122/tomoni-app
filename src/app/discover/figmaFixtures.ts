import { DiscoverRecommendation } from '@/features/discover/types';
import { Database } from '@/types/database.types';

type EventRow = Database['public']['Tables']['events']['Row'];

export const figmaDiscoverRecommendations: DiscoverRecommendation[] = [
  {
    candidateId: 'figma-julia',
    profile: { nickname: 'Julia', avatarUrl: '/images/discover/julia.png', ageRange: '25-34', gender: 'female', tags: [] },
    match: {
      myPlanId: 'figma-walking-plan',
      candidatePlanId: 'figma-julia-plan',
      activityType: 'walking',
      matchedDays: ['tue'],
      myStartTime: '09:00',
      candidateStartTime: '09:00',
      timeDifferenceMinutes: 0,
      distanceKm: 0.8,
      reasons: ['same_time', 'nearby']
    }
  },
  {
    candidateId: 'figma-megan',
    profile: { nickname: 'Megan', avatarUrl: '/images/discover/megan.png', ageRange: '25-34', gender: 'female', tags: [] },
    match: {
      myPlanId: 'figma-walking-plan',
      candidatePlanId: 'figma-megan-plan',
      activityType: 'walking',
      matchedDays: ['tue'],
      myStartTime: '09:00',
      candidateStartTime: '09:15',
      timeDifferenceMinutes: 15,
      distanceKm: 1.1,
      reasons: ['same_activity', 'nearby']
    }
  },
  {
    candidateId: 'figma-sora',
    profile: { nickname: 'Sora', avatarUrl: '/images/discover/sora.png', ageRange: '25-34', gender: 'male', tags: [] },
    match: {
      myPlanId: 'figma-walking-plan',
      candidatePlanId: 'figma-sora-plan',
      activityType: 'walking',
      matchedDays: ['tue'],
      myStartTime: '09:00',
      candidateStartTime: '09:30',
      timeDifferenceMinutes: 30,
      distanceKm: 1.4,
      reasons: ['same_time', 'shared_day']
    }
  }
];

const baseEvent = {
  address: null,
  approval_required: false,
  capacity: null,
  created_at: '2026-08-13T00:00:00+09:00',
  created_by_user_id: null,
  description: null,
  event_status: 'scheduled',
  event_type: 'local',
  last_checked_at: null,
  latitude: null,
  longitude: null,
  looking_for_participants: true,
  official_url: null,
  place_id: null,
  registration_deadline: null,
  registration_required: false,
  registration_status: null,
  registration_url: null,
  source_name: null,
  source_updated_at: null,
  status_message: null,
  updated_at: '2026-08-13T00:00:00+09:00'
};

export const figmaDiscoverEvents: EventRow[] = [
  {
    ...baseEvent,
    event_id: 'figma-walking-event',
    title: '公園で朝の散歩会',
    place_name: '行船公園',
    poster_url: '/images/discover/event-walk.png',
    start_at: '2026-08-17T08:00:00+09:00',
    end_at: '2026-08-17T10:00:00+09:00'
  },
  {
    ...baseEvent,
    event_id: 'figma-disaster-workshop',
    title: '防災まち歩きワークショップ',
    place_name: '船堀駅前広場',
    poster_url: '/images/discover/event-workshop.png',
    start_at: '2026-09-05T10:00:00+09:00',
    end_at: '2026-09-05T12:00:00+09:00'
  }
];
