export const GENDER_MAP: Record<string, string> = {
  male: '男性',
  female: '女性',
  other: 'その他',
  prefer_not_to_say: '回答しない',
};

export const TAG_MAP: Record<string, string> = {
  walking: '散歩',
  movie: '映画',
  music: '音楽',
  reading: '読書',
  local_event: '地域イベント',
  exhibition: '展覧会',
  cafe: 'カフェ',
  wellness: '健康づくり',
  casual_social: '気軽な交流',
  weekend_activity: '週末活動',
  nearby: '近い場所',
  calm_social: '落ち着いた交流',
};

export function getTagLabel(tag: string): string {
  return TAG_MAP[tag] || tag;
}

export function getGenderLabel(gender: string | null): string | null {
  if (!gender) return null;
  return GENDER_MAP[gender] || gender;
}
