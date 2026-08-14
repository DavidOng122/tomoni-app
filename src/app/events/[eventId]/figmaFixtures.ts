import { figmaDiscoverEvents } from '@/app/discover/figmaFixtures';
import { EventParticipantPreviewData } from '@/features/events/lib/getEventParticipantPreview';

export const figmaWalkingEvent = {
  ...figmaDiscoverEvents[0],
  description:
    '朝の涼しい時間に、行船公園をゆっくり歩く散歩会です。 近所の人と話しながら、無理のないペースで園内を散歩します。 初参加・ひとりでの参加も歓迎です。飲み物を持って、歩きやすい服装でお越しください。',
  source_name: 'Miki',
};

export const figmaWalkingCreator = {
  nickname: 'Miki',
  avatar_url: '/images/events/detail/organizer-miki.png',
};

export const figmaWalkingParticipants: EventParticipantPreviewData = {
  participantCount: 10,
  users: [
    {
      userId: 'figma-miki',
      nickname: 'Miki',
      avatarUrl: '/images/events/detail/participant-miki.png',
    },
    {
      userId: 'figma-julia',
      nickname: 'Julia',
      avatarUrl: '/images/events/detail/participant-julia.png',
    },
    {
      userId: 'figma-megan',
      nickname: 'Megan',
      avatarUrl: '/images/events/detail/participant-megan.png',
    },
  ],
};

export const figmaDisasterEvent = {
  ...figmaDiscoverEvents[1],
  approval_required: false,
  description:
    '地域を歩きながら、防災の視点でまちを見直すワークショップです。 避難場所や身近な危険箇所を確認し、災害時に役立つ知識を学びます。 初参加・ひとりでの参加も歓迎です。歩きやすい服装でお越しください',
  poster_url: '/images/events/detail/disaster-workshop.png',
  registration_required: true,
  registration_status: 'open',
  source_name: '江戸川区公式',
};

export const figmaDisasterCreator = {
  nickname: '江戸川区公式',
  avatar_url: '/images/events/detail/organizer-edogawa.png',
};

export const figmaDisasterParticipants: EventParticipantPreviewData = {
  participantCount: 10,
  users: figmaWalkingParticipants.users,
};
