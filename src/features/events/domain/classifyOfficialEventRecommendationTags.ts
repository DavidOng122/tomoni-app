import type { EventRecommendationTag } from "./officialEventImportTypes.ts";

const EXCLUDED_EVENT_PATTERN =
  /(?:健診|検診|予防接種|認知症|介護|救命|行政説明会|住民説明会|審議会|傍聴|乳幼児向け|未就学児向け|小学生対象|中学生対象|保護者向け)/u;

const RULES: ReadonlyArray<{
  tag: EventRecommendationTag;
  pattern: RegExp;
}> = [
  { tag: "art_exhibition", pattern: /(?:展覧会|展示|美術|アート|ギャラリー)/u },
  { tag: "film", pattern: /(?:映画|上映|シネマ)/u },
  { tag: "music_performance", pattern: /(?:音楽|コンサート|演奏|ライブ|合唱|オーケストラ)/u },
];

export function classifyOfficialEventRecommendationTags(input: {
  title: string | null;
  description: string | null;
}): EventRecommendationTag[] {
  const text = [input.title, input.description]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .normalize("NFKC");

  if (!text || EXCLUDED_EVENT_PATTERN.test(text)) return [];
  return RULES.filter((rule) => rule.pattern.test(text)).map((rule) => rule.tag);
}
