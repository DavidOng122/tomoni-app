interface ParticipantPreviewUser {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
}

interface ParticipantPreview {
  participantCount: number;
  users: ParticipantPreviewUser[];
}

export function getParticipantAvatarPreview(
  preview: ParticipantPreview | null,
  maxVisible = 3,
) {
  if (!preview) return { visibleUsers: [], overflowCount: 0 };

  const visibleUsers = preview.users
    .filter((user): user is ParticipantPreviewUser & { avatarUrl: string } => Boolean(user.avatarUrl))
    .slice(0, maxVisible);

  return {
    visibleUsers,
    overflowCount: Math.max(0, preview.participantCount - visibleUsers.length),
  };
}
