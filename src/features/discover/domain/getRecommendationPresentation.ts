import type { MatchReasonCode } from '../types';

const MATCH_REASON_LABELS: Omit<Record<MatchReasonCode, string>, 'same_activity'> = {
  same_time: '同じ時間ごろ',
  nearby: '近くに住んでいる',
  shared_day: '同じ曜日',
};

export function getRecommendationHeading(activityLabel: string): string {
  return `一緒に${activityLabel}できそうな人`;
}

export function getRecommendationNickname(nickname: string): string {
  return nickname.endsWith('さん') ? nickname : `${nickname}さん`;
}

export function getRecommendationReasonLabel(
  reasonCode: MatchReasonCode,
  activityLabel: string,
): string {
  return reasonCode === 'same_activity'
    ? `${activityLabel}が好き`
    : MATCH_REASON_LABELS[reasonCode];
}
