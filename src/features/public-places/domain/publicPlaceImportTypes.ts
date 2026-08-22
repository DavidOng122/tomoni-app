import type { Database, Json } from "../../../types/database.types.ts";

export const EDOGAWA_SPORTS_FACILITIES_DATASET_ID = "edogawa_sports_facilities" as const;
export const EDOGAWA_PUBLIC_LIBRARIES_DATASET_ID = "edogawa_public_libraries" as const;
export const EDOGAWA_PARKS_DATASET_ID = "edogawa_parks" as const;
export const EDOGAWA_WATERFRONT_PARKS_DATASET_ID = "edogawa_waterfront_parks" as const;
export const EDOGAWA_WATERFRONT_GREENWAYS_DATASET_ID = "edogawa_waterfront_greenways" as const;
export const EDOGAWA_CULTURAL_FACILITIES_DATASET_ID = "edogawa_cultural_facilities" as const;
export const EDOGAWA_RECREATION_DESTINATIONS_DATASET_ID = "edogawa_recreation_destinations" as const;

export type EdogawaPublicPlaceDatasetId =
  | typeof EDOGAWA_SPORTS_FACILITIES_DATASET_ID
  | typeof EDOGAWA_PUBLIC_LIBRARIES_DATASET_ID
  | typeof EDOGAWA_PARKS_DATASET_ID
  | typeof EDOGAWA_WATERFRONT_PARKS_DATASET_ID
  | typeof EDOGAWA_WATERFRONT_GREENWAYS_DATASET_ID
  | typeof EDOGAWA_CULTURAL_FACILITIES_DATASET_ID
  | typeof EDOGAWA_RECREATION_DESTINATIONS_DATASET_ID;

export const PUBLIC_PLACE_CATEGORIES = [
  "library",
  "sports_facility",
  "park",
  "waterfront_park",
  "waterfront_greenway",
  "cultural_facility",
  "community_facility",
] as const;
export type PublicPlaceCategory = (typeof PUBLIC_PLACE_CATEGORIES)[number];

export const PUBLIC_PLACE_SKIP_REASONS = [
  "missing_source_place_id",
  "missing_name",
  "missing_coordinates",
  "invalid_latitude",
  "invalid_longitude",
  "coordinates_outside_dataset_area",
  "ambiguous_source_match",
  "unsupported_record",
] as const;

export type PublicPlaceSkipReason = (typeof PUBLIC_PLACE_SKIP_REASONS)[number];
export type WeekdayCode = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface PublicPlaceAttributes {
  [key: string]: Json | undefined;
  accessibility?: Record<string, boolean>;
  amenities?: Record<string, boolean>;
  sports?: {
    [key: string]: Json | undefined;
    activities?: string[];
    training_room?: boolean;
  };
  library?: {
    [key: string]: Json | undefined;
    services?: string[];
    study_room?: boolean;
    kids_space?: boolean;
    pc_work_allowed?: boolean;
  };
  contact?: {
    [key: string]: Json | undefined;
    phone?: string;
    fax?: string;
    email?: string;
    form_url?: string;
    notes?: string;
    postal_code?: string;
    operator_name?: string;
  };
  media?: {
    [key: string]: Json | undefined;
    image_url?: string;
    image_license?: string;
  };
  walking_place?: {
    [key: string]: Json | undefined;
    coordinate_method: "mean_of_official_geometry_vertices";
    source_vertex_count: number;
    image_urls?: string[];
    area_square_meters?: number;
    length_meters?: number;
    large_park_candidate?: boolean;
    large_park_min_area_square_meters?: number;
  };
  cultural_facility?: {
    [key: string]: Json | undefined;
    facility_type?:
      | "culture_hall"
      | "community_facility"
      | "exhibition_space"
      | "aquarium"
      | "zoo"
      | "museum"
      | "cinema";
  };
}

export interface NormalizedPublicPlace {
  sourceDatasetId: EdogawaPublicPlaceDatasetId;
  sourcePlaceId: string;
  sourceName: string;
  name: string;
  category: PublicPlaceCategory;
  address: string | null;
  latitude: number;
  longitude: number;
  officialUrl: string | null;
  description: string | null;
  availableDays: WeekdayCode[] | null;
  openTime: string | null;
  closeTime: string | null;
  hoursNote: string | null;
  attributes: PublicPlaceAttributes;
  sourceUpdatedAt: string | null;
}

export interface NormalizedPublicPlaceCandidate
  extends Omit<NormalizedPublicPlace, "sourcePlaceId" | "name" | "latitude" | "longitude"> {
  sourcePlaceId: string | null;
  name: string | null;
  latitude: number | null;
  longitude: number | null;
  latitudeIssue: "invalid" | null;
  longitudeIssue: "invalid" | null;
  coordinateAreaIssue: boolean;
  sourceUrl: string;
  warnings: string[];
}

export type PublicPlaceValidationResult =
  | { kind: "accepted"; place: NormalizedPublicPlace; warnings: string[] }
  | { kind: "skipped"; reason: PublicPlaceSkipReason; evidence?: string; sourceUrl: string };

export interface PublicPlaceIdentityDuplicate {
  sourceDatasetId: EdogawaPublicPlaceDatasetId;
  sourcePlaceId: string;
  places: NormalizedPublicPlace[];
}

export type PublicPlaceUpsertRow = Database["public"]["Tables"]["public_places"]["Insert"];
