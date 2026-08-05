export type Gender =
  | "female"
  | "male"
  | "prefer_not_to_say";

export type AgeRange =
  | "18_24"
  | "25_34"
  | "35_44"
  | "45_54"
  | "55_plus";

export type ProfileDraft = {
  nickname: string;
  gender: Gender | null;
  ageRange: AgeRange | null;
  avatarPreviewUrl: string | null;
};
