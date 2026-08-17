export interface ConnectionPreviewProfile {
  user_id: string;
  nickname: string;
  avatar_url: string;
}

export function getConnectionPreview(
  profiles: ConnectionPreviewProfile[],
  visibleLimit = 3,
) {
  return {
    visibleProfiles: profiles.slice(0, visibleLimit),
    overflowCount: Math.max(0, profiles.length - visibleLimit),
  };
}
