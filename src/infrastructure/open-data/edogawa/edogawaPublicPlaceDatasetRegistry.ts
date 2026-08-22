import {
  EDOGAWA_PUBLIC_LIBRARIES_DATASET_ID,
  EDOGAWA_SPORTS_FACILITIES_DATASET_ID,
  EDOGAWA_CULTURAL_FACILITIES_DATASET_ID,
  EDOGAWA_RECREATION_DESTINATIONS_DATASET_ID,
  type PublicPlaceCategory,
} from "../../../features/public-places/domain/publicPlaceImportTypes.ts";
import {
  EDOGAWA_PARKS_DATASET_ID,
  EDOGAWA_WATERFRONT_GREENWAYS_DATASET_ID,
  EDOGAWA_WATERFRONT_PARKS_DATASET_ID,
} from "../../../features/public-places/domain/publicPlaceImportTypes.ts";

type EdogawaPairedPublicPlaceDatasetId =
  | typeof EDOGAWA_SPORTS_FACILITIES_DATASET_ID
  | typeof EDOGAWA_PUBLIC_LIBRARIES_DATASET_ID;

export interface EdogawaPublicPlaceDatasetDefinition {
  id: EdogawaPairedPublicPlaceDatasetId;
  category: PublicPlaceCategory;
  sourceName: "江戸川区";
  mapCsvUrl: string;
  standardCsvUrl: string;
}

export const EDOGAWA_PUBLIC_PLACE_DATASETS: Record<
  EdogawaPairedPublicPlaceDatasetId,
  EdogawaPublicPlaceDatasetDefinition
> = {
  [EDOGAWA_SPORTS_FACILITIES_DATASET_ID]: {
    id: EDOGAWA_SPORTS_FACILITIES_DATASET_ID,
    category: "sports_facility",
    sourceName: "江戸川区",
    mapCsvUrl: "https://www.city.edogawa.tokyo.jp/documents/4408/20251211_sports.csv",
    standardCsvUrl: "https://www.opendata.metro.tokyo.lg.jp/edogawa/131237_edogawaku_sportsfacilities.csv",
  },
  [EDOGAWA_PUBLIC_LIBRARIES_DATASET_ID]: {
    id: EDOGAWA_PUBLIC_LIBRARIES_DATASET_ID,
    category: "library",
    sourceName: "江戸川区",
    mapCsvUrl: "https://www.city.edogawa.tokyo.jp/documents/4408/20251121_library.csv",
    standardCsvUrl: "https://www.opendata.metro.tokyo.lg.jp/edogawa/131237_edogawaku_library.csv",
  },
};

export const EDOGAWA_WALKING_PLACE_DATASETS = {
  parks: {
    id: EDOGAWA_PARKS_DATASET_ID,
    category: "park",
    sourceName: "江戸川区",
    csvUrl: "https://www.city.edogawa.tokyo.jp/documents/4408/20251211_kouen.csv",
  },
  waterfront_parks: {
    id: EDOGAWA_WATERFRONT_PARKS_DATASET_ID,
    category: "waterfront_park",
    sourceName: "江戸川区",
    csvUrl: "https://www.city.edogawa.tokyo.jp/documents/4408/20251211_sinsuikouen.csv",
  },
  waterfront_greenways: {
    id: EDOGAWA_WATERFRONT_GREENWAYS_DATASET_ID,
    category: "waterfront_greenway",
    sourceName: "江戸川区",
    csvUrl: "https://www.city.edogawa.tokyo.jp/documents/4408/20251211_ryokudou.csv",
  },
} as const;

export const EDOGAWA_CULTURAL_FACILITIES_DATASET = {
  id: EDOGAWA_CULTURAL_FACILITIES_DATASET_ID,
  category: "cultural_facility",
  sourceName: "江戸川区",
  csvUrl: "https://www.city.edogawa.tokyo.jp/documents/4408/20251211_bunka.csv",
} as const;

export const EDOGAWA_RECREATION_DESTINATIONS_DATASET = {
  id: EDOGAWA_RECREATION_DESTINATIONS_DATASET_ID,
  category: "cultural_facility",
  sourceName: "江戸川区",
  csvUrl: "https://www.city.edogawa.tokyo.jp/documents/4408/20251211_reku.csv",
} as const;
