const ACTIVITY_LABELS: Record<string, string> = {
  walking: '朝の散歩',
  morning_walk: '朝の散歩',
  running: 'ランニング',
  cycling: 'サイクリング',
};

interface FixedPlanInvitationCopyInput {
  activityType: string;
  customActivityName?: string | null;
  invitationMessage?: string | null;
  isSender: boolean;
  otherNickname: string;
}

export function getFixedPlanInvitationCopy({
  activityType,
  customActivityName,
  invitationMessage,
  isSender,
  otherNickname,
}: FixedPlanInvitationCopyInput) {
  const activityLabel = customActivityName?.trim()
    || ACTIVITY_LABELS[activityType]
    || activityType;

  return {
    activityLabel,
    headline: isSender
      ? `${otherNickname}さんにお誘いを送りました`
      : `${otherNickname}さんからお誘いが届いています`,
    inviteMessage: invitationMessage?.trim()
      || `一緒に${activityLabel}に行きませんか？`,
  };
}
