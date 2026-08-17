export interface SameEventCandidate {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  compatibility_label: string;
}

export function getEventSuccessCandidates(
  candidates: SameEventCandidate[],
  maximum = 3,
) {
  return candidates
    .filter((candidate) => Boolean(candidate.user_id && candidate.nickname))
    .slice(0, maximum);
}
