interface ConversationMember {
  left_at: string | null;
  user_id: string;
}

export function getOtherParticipantUserId(
  currentUserId: string,
  members: ConversationMember[],
) {
  return members.find(
    (member) => member.user_id !== currentUserId && member.left_at === null,
  )?.user_id ?? null;
}
