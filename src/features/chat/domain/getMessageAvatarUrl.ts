interface GetMessageAvatarUrlInput {
  currentUserId: string;
  senderUserId: string;
  otherAvatarUrl: string | null;
}

export function getMessageAvatarUrl({
  currentUserId,
  senderUserId,
  otherAvatarUrl,
}: GetMessageAvatarUrlInput) {
  return senderUserId === currentUserId ? null : otherAvatarUrl;
}
