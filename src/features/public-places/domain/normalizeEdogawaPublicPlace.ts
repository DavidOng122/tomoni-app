import type {
  EdogawaMapPlace,
  EdogawaSportsPageIdentity,
  EdogawaStandardPlace,
} from "../../../infrastructure/open-data/edogawa/edogawaPublicPlaceSourceTypes.ts";
import { EDOGAWA_SPORTS_ACTIVITY_HEADERS } from "../../../infrastructure/open-data/edogawa/edogawaPublicPlaceHeaders.ts";
import type { MatchedEdogawaPublicPlaceSource } from "./matchEdogawaPublicPlaceSources.ts";
import {
  EDOGAWA_PUBLIC_LIBRARIES_DATASET_ID,
  EDOGAWA_SPORTS_FACILITIES_DATASET_ID,
  EDOGAWA_CULTURAL_FACILITIES_DATASET_ID,
  EDOGAWA_RECREATION_DESTINATIONS_DATASET_ID,
  type NormalizedPublicPlaceCandidate,
  type PublicPlaceAttributes,
  type WeekdayCode,
} from "./publicPlaceImportTypes.ts";

const DAY_MAP: Record<string, WeekdayCode> = {
  月: "mon", 火: "tue", 水: "wed", 木: "thu", 金: "fri", 土: "sat", 日: "sun",
};

const SPORTS_ACTIVITY_KEYS: Record<string, string> = {
  陸上競技: "athletics", 水泳: "swimming", サッカー: "soccer", スキー: "skiing", テニス: "tennis",
  ボート: "rowing", ホッケー: "hockey", ボクシング: "boxing", バレーボール: "volleyball",
  体操: "gymnastics", バスケットボール: "basketball", スケート: "skating", レスリング: "wrestling",
  セーリング: "sailing", ウエイトリフティング: "weightlifting", ハンドボール: "handball",
  自転車競技: "cycling", ソフトテニス: "soft_tennis", 卓球: "table_tennis", 軟式野球: "rubber_ball_baseball",
  相撲: "sumo", 馬術: "equestrian", フェンシング: "fencing", 柔道: "judo", ソフトボール: "softball",
  バドミントン: "badminton", 弓道: "kyudo", ライフル射撃: "rifle_shooting", 剣道: "kendo",
  近代五種: "modern_pentathlon", ラグビーフットボール: "rugby", 山岳・スポーツクライミング: "sport_climbing",
  カヌー: "canoeing", アーチェリー: "archery", 空手道: "karate", アイスホッケー: "ice_hockey",
  銃剣道: "jukendo", クレー射撃: "clay_shooting", なぎなた: "naginata", ボウリング: "bowling",
  "ボブスレー・リュージュ・スケル,トン": "bobsleigh_luge_skeleton", 野球: "baseball", 綱引: "tug_of_war",
  少林寺拳法: "shorinji_kempo", ゲートボール: "gateball", 武術太極拳: "wushu_taijiquan", ゴルフ: "golf",
  カーリング: "curling", パワーリフティング: "powerlifting", オリエンテーリング: "orienteering",
  "グラウンド・ゴルフ": "ground_golf", トライアスロン: "triathlon", バウンドテニス: "bound_tennis",
  エアロビック: "aerobics", バイアスロン: "biathlon", スポーツチャンバラ: "sports_chanbara",
  ドッジボール: "dodgeball", チアリーディング: "cheerleading", "ペタンク・ブール": "petanque_boules",
  ダンススポーツ: "dance_sport", 拳法競技: "kenpo",
};

const LIBRARY_SERVICE_KEYS: Record<string, string> = {
  絵本: "picture_books", 雑誌: "magazines", 点字本: "braille_books", 視聴覚資料: "audiovisual_materials",
  外国語の本: "foreign_language_books", "新聞(全国紙)": "national_newspapers", "新聞(地方紙)": "local_newspapers",
  "新聞(その他)": "other_newspapers", 地元出身の作家の本コーナー: "local_authors_section",
  インターネットを使える端末: "internet_terminal", インターネットでの蔵書検索: "online_catalog_search",
  プリンター: "printer", おはなし会: "story_time", 映画会: "film_screenings", 講座等: "classes",
  閲覧できる場所: "reading_area", 映像が見れる場所: "video_viewing_area", ソファー: "sofa",
};

function text(value: string | null | undefined): string | null {
  const normalized = value?.replace(/[\s\u3000]+/gu, " ").trim() ?? "";
  return normalized || null;
}

function sourceBoolean(value: string | undefined, warnings: string[], field: string): boolean | undefined {
  const normalized = text(value);
  if (normalized === null) return undefined;
  if (["有", "可", "可能", "あり"].includes(normalized)) return true;
  if (["無", "不可", "なし"].includes(normalized)) return false;
  warnings.push(`unrecognized_boolean:${field}:${normalized}`);
  return undefined;
}

function setBoolean(target: Record<string, boolean>, key: string, value: boolean | undefined): void {
  if (value !== undefined) target[key] = value;
}

function parseDays(value: string | undefined, warnings: string[]): WeekdayCode[] | null {
  const normalized = text(value);
  if (!normalized) return null;
  const result: WeekdayCode[] = [];
  for (const character of normalized) {
    const day = DAY_MAP[character];
    if (day && !result.includes(day)) result.push(day);
  }
  if (result.length === 0) {
    warnings.push(`unparseable_available_days:${normalized}`);
    return null;
  }
  return result;
}

function parseTime(value: string | undefined, warnings: string[], field: string): string | null {
  const normalized = text(value);
  if (!normalized) return null;
  const match = normalized.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/u);
  if (!match) {
    warnings.push(`unparseable_${field}:${normalized}`);
    return null;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? 0);
  if (hour > 23 || minute > 59 || second > 59) {
    warnings.push(`unparseable_${field}:${normalized}`);
    return null;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

function parseCoordinate(value: string | null): { value: number | null; invalid: boolean } {
  if (!value) return { value: null, invalid: false };
  const normalized = value.normalize("NFKC").trim();
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(normalized)) {
    return { value: null, invalid: true };
  }
  const number = Number(normalized);
  return Number.isFinite(number) ? { value: number, invalid: false } : { value: null, invalid: true };
}

function canonicalUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return null;
  }
}

function canonicalUrlPath(value: string | null): string | null {
  const url = canonicalUrl(value);
  if (!url) return null;
  const pathname = new URL(url).pathname.replace(/\/+$/u, "");
  return pathname || "/";
}

function buildSharedAttributes(
  map: EdogawaMapPlace,
  standard: EdogawaStandardPlace | null,
  warnings: string[],
): PublicPlaceAttributes {
  const row = standard?.row ?? {};
  const accessibility: Record<string, boolean> = {};
  setBoolean(accessibility, "wheelchair_accessible", sourceBoolean(row["車椅子可"], warnings, "車椅子可"));
  setBoolean(accessibility, "accessible_toilet", sourceBoolean(row["バリアフリートイレ"], warnings, "バリアフリートイレ"));
  setBoolean(accessibility, "accessible_parking", sourceBoolean(row["優先駐車場"], warnings, "優先駐車場"));
  setBoolean(accessibility, "ostomate_toilet", sourceBoolean(row["オストメイト対応トイレ"], warnings, "オストメイト対応トイレ"));
  setBoolean(accessibility, "nursing_room", sourceBoolean(row["授乳室"], warnings, "授乳室"));

  const amenities: Record<string, boolean> = {};
  setBoolean(amenities, "free_wifi", sourceBoolean(row["フリーWi-Fi"], warnings, "フリーWi-Fi"));
  setBoolean(amenities, "changing_room", sourceBoolean(row["更衣室"], warnings, "更衣室"));
  setBoolean(amenities, "shower", sourceBoolean(row["シャワー室"], warnings, "シャワー室"));
  setBoolean(amenities, "food_available", sourceBoolean(row["飲食物を購入できる場所"], warnings, "飲食物を購入できる場所"));

  const contactEntries = {
    phone: text(row["電話番号"]) ?? map.phone ?? undefined,
    fax: map.fax ?? undefined,
    email: text(row["連絡先メールアドレス"]) ?? undefined,
    form_url: text(row["連絡先FormURL"]) ?? undefined,
    notes: text(row["連絡先備考（その他、SNSなど）"]) ?? undefined,
    postal_code: text(row["郵便番号"]) ?? map.postalCode ?? undefined,
    operator_name: text(row["団体名"]) ?? undefined,
  };
  const contact = Object.fromEntries(Object.entries(contactEntries).filter(([, item]) => item !== undefined));
  const mediaEntries = {
    image_url: map.imageUrl ?? text(row["画像"]) ?? undefined,
    image_license: text(row["画像_ライセンス"]) ?? undefined,
  };
  const media = Object.fromEntries(Object.entries(mediaEntries).filter(([, item]) => item !== undefined));

  return {
    ...(Object.keys(accessibility).length ? { accessibility } : {}),
    ...(Object.keys(amenities).length ? { amenities } : {}),
    ...(Object.keys(contact).length ? { contact } : {}),
    ...(Object.keys(media).length ? { media } : {}),
  };
}

function baseCandidate(
  match: MatchedEdogawaPublicPlaceSource,
  sourcePlaceId: string | null,
  dataset: "sports" | "libraries",
): NormalizedPublicPlaceCandidate {
  const warnings = [...match.warnings];
  const latitude = parseCoordinate(match.map.latitudeText);
  const longitude = parseCoordinate(match.map.longitudeText);
  const row = match.standard?.row ?? {};
  const attributes = buildSharedAttributes(match.map, match.standard, warnings);
  const coordinateAreaIssue = latitude.value !== null && longitude.value !== null
    ? latitude.value < 35.55 || latitude.value > 35.85 || longitude.value < 139.75 || longitude.value > 140.05
    : false;

  return {
    sourceDatasetId: dataset === "sports"
      ? EDOGAWA_SPORTS_FACILITIES_DATASET_ID
      : EDOGAWA_PUBLIC_LIBRARIES_DATASET_ID,
    sourcePlaceId,
    sourceName: "江戸川区",
    name: dataset === "libraries" ? text(match.standard?.name) : text(match.map.name),
    category: dataset === "sports" ? "sports_facility" : "library",
    address: dataset === "libraries"
      ? text(match.standard?.address) ?? text(match.map.address)
      : text(match.map.address) ?? text(match.standard?.address),
    latitude: latitude.value,
    longitude: longitude.value,
    officialUrl: canonicalUrl(match.map.officialUrl),
    description: text(row["説明"]) ?? match.map.description,
    availableDays: parseDays(row["利用可能曜日"], warnings),
    openTime: parseTime(row["開始時間"], warnings, "open_time"),
    closeTime: parseTime(row["終了時間"], warnings, "close_time"),
    hoursNote: text(row["利用可能時間特記事項"]),
    attributes,
    sourceUpdatedAt: null,
    latitudeIssue: latitude.invalid ? "invalid" : null,
    longitudeIssue: longitude.invalid ? "invalid" : null,
    coordinateAreaIssue,
    sourceUrl: match.map.officialUrl ?? "",
    warnings,
  };
}

export function normalizeEdogawaSportsFacility(
  match: MatchedEdogawaPublicPlaceSource,
  identity: EdogawaSportsPageIdentity,
): NormalizedPublicPlaceCandidate {
  const candidate = baseCandidate(match, text(identity.pageId), "sports");
  const row = match.standard?.row ?? {};
  const activities = EDOGAWA_SPORTS_ACTIVITY_HEADERS
    .filter((header) => sourceBoolean(row[header], candidate.warnings, header) === true)
    .map((header) => SPORTS_ACTIVITY_KEYS[header])
    .filter((key): key is string => Boolean(key));
  const trainingRoom = sourceBoolean(row["トレーニング室"], candidate.warnings, "トレーニング室");
  if (activities.length || trainingRoom !== undefined) {
    candidate.attributes.sports = {
      ...(activities.length ? { activities } : {}),
      ...(trainingRoom !== undefined ? { training_room: trainingRoom } : {}),
    };
  }
  return candidate;
}

export function normalizeEdogawaLibrary(
  match: MatchedEdogawaPublicPlaceSource,
): NormalizedPublicPlaceCandidate {
  const candidate = baseCandidate(match, canonicalUrlPath(match.map.officialUrl), "libraries");
  const row = match.standard?.row ?? {};
  const services = Object.entries(LIBRARY_SERVICE_KEYS)
    .filter(([header]) => sourceBoolean(row[header], candidate.warnings, header) === true)
    .map(([, key]) => key);
  const studyRoom = sourceBoolean(row["自習室"], candidate.warnings, "自習室");
  const kidsSpace = sourceBoolean(row["キッズスペース"], candidate.warnings, "キッズスペース");
  const pcWork = sourceBoolean(row["パソコン作業"], candidate.warnings, "パソコン作業");
  if (services.length || studyRoom !== undefined || kidsSpace !== undefined || pcWork !== undefined) {
    candidate.attributes.library = {
      ...(services.length ? { services } : {}),
      ...(studyRoom !== undefined ? { study_room: studyRoom } : {}),
      ...(kidsSpace !== undefined ? { kids_space: kidsSpace } : {}),
      ...(pcWork !== undefined ? { pc_work_allowed: pcWork } : {}),
    };
  }
  return candidate;
}

function culturalFacilityType(
  name: string,
): "culture_hall" | "community_facility" | "exhibition_space" {
  if (/(?:圓藏亭|文化プラザ|展示|ギャラリー)/u.test(name)) return "exhibition_space";
  if (/(?:文化センター|ホール|文化スポーツプラザ)/u.test(name)) return "culture_hall";
  return "community_facility";
}

export function normalizeEdogawaCulturalFacility(
  source: EdogawaMapPlace,
): NormalizedPublicPlaceCandidate {
  const warnings: string[] = [];
  const latitude = parseCoordinate(source.latitudeText);
  const longitude = parseCoordinate(source.longitudeText);
  const officialUrl = canonicalUrl(source.officialUrl);
  const sourcePlaceId = canonicalUrlPath(source.officialUrl);
  const name = text(source.name);
  const facilityType = name ? culturalFacilityType(name) : "community_facility";
  const coordinateAreaIssue = latitude.value !== null && longitude.value !== null
    ? latitude.value < 35.55 || latitude.value > 35.85 || longitude.value < 139.75 || longitude.value > 140.05
    : false;

  return {
    sourceDatasetId: EDOGAWA_CULTURAL_FACILITIES_DATASET_ID,
    sourcePlaceId,
    sourceName: "江戸川区",
    name,
    category: facilityType === "exhibition_space" ? "cultural_facility" : "community_facility",
    address: text(source.address),
    latitude: latitude.value,
    longitude: longitude.value,
    officialUrl,
    description: null,
    availableDays: null,
    openTime: null,
    closeTime: null,
    hoursNote: "営業時間は公式ページでご確認ください",
    attributes: {
      contact: {
        ...(source.phone ? { phone: source.phone } : {}),
        ...(source.fax ? { fax: source.fax } : {}),
        ...(source.postalCode ? { postal_code: source.postalCode } : {}),
      },
      media: {
        ...(source.imageUrl ? { image_url: source.imageUrl } : {}),
      },
      ...(name ? { cultural_facility: { facility_type: facilityType } } : {}),
    },
    sourceUpdatedAt: null,
    latitudeIssue: latitude.invalid ? "invalid" : null,
    longitudeIssue: longitude.invalid ? "invalid" : null,
    coordinateAreaIssue,
    sourceUrl: source.officialUrl ?? "",
    warnings,
  };
}

export type EdogawaRecreationDestinationType = "aquarium" | "zoo" | "museum" | "cinema";

const OFFICIAL_RECREATION_DESTINATION_IMAGES: Readonly<Record<string, string>> = {
  "葛西臨海水族園": "https://www.city.edogawa.tokyo.jp/images/8401/suizoku_1.jpg",
  "地下鉄博物館": "https://www.chikahaku.jp/images/mv/mv01a_lg.jpg",
  "船堀シネパル": "https://www.city.edogawa.tokyo.jp/images/42805/095.jpg",
};

export function classifyEdogawaRecreationDestination(
  name: string,
): EdogawaRecreationDestinationType | null {
  if (name === "葛西臨海水族園") return "aquarium";
  if (name === "自然動物園") return "zoo";
  if (name === "地下鉄博物館") return "museum";
  if (name === "船堀シネパル") return "cinema";
  return null;
}

export function normalizeEdogawaRecreationDestination(
  source: EdogawaMapPlace,
  facilityType: EdogawaRecreationDestinationType,
): NormalizedPublicPlaceCandidate {
  const warnings: string[] = [];
  const latitude = parseCoordinate(source.latitudeText);
  const longitude = parseCoordinate(source.longitudeText);
  const officialUrl = canonicalUrl(source.officialUrl);
  const name = text(source.name);
  const sourceImageUrl = source.imageUrl?.replace(/^http:\/\//u, "https://") ?? null;
  const imageUrl = sourceImageUrl ?? (name ? OFFICIAL_RECREATION_DESTINATION_IMAGES[name] : null);
  const coordinateAreaIssue = latitude.value !== null && longitude.value !== null
    ? latitude.value < 35.55 || latitude.value > 35.85 || longitude.value < 139.75 || longitude.value > 140.05
    : false;

  return {
    sourceDatasetId: EDOGAWA_RECREATION_DESTINATIONS_DATASET_ID,
    sourcePlaceId: canonicalUrlPath(source.officialUrl),
    sourceName: "江戸川区",
    name,
    category: "cultural_facility",
    address: text(source.address),
    latitude: latitude.value,
    longitude: longitude.value,
    officialUrl,
    description: text(source.description),
    availableDays: null,
    openTime: null,
    closeTime: null,
    hoursNote: "営業時間・入場条件は公式ページでご確認ください",
    attributes: {
      contact: {
        ...(source.phone ? { phone: source.phone } : {}),
        ...(source.fax ? { fax: source.fax } : {}),
        ...(source.postalCode ? { postal_code: source.postalCode } : {}),
      },
      media: {
        ...(imageUrl ? { image_url: imageUrl } : {}),
      },
      cultural_facility: { facility_type: facilityType },
    },
    sourceUpdatedAt: null,
    latitudeIssue: latitude.invalid ? "invalid" : null,
    longitudeIssue: longitude.invalid ? "invalid" : null,
    coordinateAreaIssue,
    sourceUrl: source.officialUrl ?? "",
    warnings,
  };
}
