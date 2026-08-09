export type Gender =
  | "male"
  | "female"
  | "other"
  | "prefer_not_to_say";

export type AgeRange =
  | "18-24"
  | "25-34"
  | "35-44"
  | "45-54"
  | "55+";

export type ProfileDraft = {
  nickname: string;
  avatarUrl: string | null;
  ageRange: AgeRange | null;
  gender: Gender | null;
  tags: string[];
  bio: string;
};
