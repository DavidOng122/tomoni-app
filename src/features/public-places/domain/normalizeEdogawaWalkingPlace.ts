import type { EdogawaWalkingPlaceSource } from "../../../infrastructure/open-data/edogawa/edogawaPublicPlaceSourceTypes.ts";
import {
  EDOGAWA_PARKS_DATASET_ID,
  EDOGAWA_WATERFRONT_GREENWAYS_DATASET_ID,
  EDOGAWA_WATERFRONT_PARKS_DATASET_ID,
  type NormalizedPublicPlaceCandidate,
  type PublicPlaceCategory,
} from "./publicPlaceImportTypes.ts";

export type EdogawaWalkingPlaceDataset = "parks" | "waterfront_parks" | "waterfront_greenways";

export const LARGE_PARK_MIN_AREA_SQUARE_METERS = 10_000;
const EARTH_RADIUS_METERS = 6_371_008.8;

const DATASET_CONFIG: Record<EdogawaWalkingPlaceDataset, {
  sourceDatasetId:
    | typeof EDOGAWA_PARKS_DATASET_ID
    | typeof EDOGAWA_WATERFRONT_PARKS_DATASET_ID
    | typeof EDOGAWA_WATERFRONT_GREENWAYS_DATASET_ID;
  category: PublicPlaceCategory;
}> = {
  parks: { sourceDatasetId: EDOGAWA_PARKS_DATASET_ID, category: "park" },
  waterfront_parks: {
    sourceDatasetId: EDOGAWA_WATERFRONT_PARKS_DATASET_ID,
    category: "waterfront_park",
  },
  waterfront_greenways: {
    sourceDatasetId: EDOGAWA_WATERFRONT_GREENWAYS_DATASET_ID,
    category: "waterfront_greenway",
  },
};

function text(value: string | null | undefined): string | null {
  const normalized = value?.replace(/[\s\u3000]+/gu, " ").trim() ?? "";
  return normalized || null;
}

function canonicalUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function sourceIdentity(name: string | null, address: string | null): string | null {
  if (!name) return null;
  return address
    ? `name_address_v1:${encodeURIComponent(name)}|${encodeURIComponent(address)}`
    : `name_v1:${encodeURIComponent(name)}`;
}

function joinCoordinateText(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;
  return `${left}|${right}`;
}

export function consolidateEdogawaWalkingPlaceSources(
  sources: EdogawaWalkingPlaceSource[],
): EdogawaWalkingPlaceSource[] {
  const consolidated = new Map<string, EdogawaWalkingPlaceSource>();
  for (const source of sources) {
    const key = sourceIdentity(text(source.name), text(source.address))
      ?? `invalid_source_row:${source.recordNumber}`;
    const existing = consolidated.get(key);
    if (!existing) {
      consolidated.set(key, { ...source, imageUrls: [...source.imageUrls] });
      continue;
    }
    consolidated.set(key, {
      ...existing,
      description: existing.description ?? source.description,
      officialUrl: existing.officialUrl ?? source.officialUrl,
      imageUrls: [...new Set([...existing.imageUrls, ...source.imageUrls])],
      latitudeText: joinCoordinateText(existing.latitudeText, source.latitudeText),
      longitudeText: joinCoordinateText(existing.longitudeText, source.longitudeText),
    });
  }
  return [...consolidated.values()];
}

function coordinateParts(value: string | null): { parts: number[][]; invalid: boolean } {
  if (!value) return { parts: [], invalid: false };
  const rawParts = value.split("|").map((geometryPart) =>
    geometryPart.split(":").map((part) => part.normalize("NFKC").trim())
  );
  if (rawParts.some((part) => part.some((valuePart) =>
    !/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(valuePart)
  ))) {
    return { parts: [], invalid: true };
  }
  const parts = rawParts.map((part) => part.map(Number));
  return {
    parts,
    invalid: parts.some((part) => part.some((item) => !Number.isFinite(item))),
  };
}

function distanceMeters(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number): number {
  const radians = Math.PI / 180;
  const latitudeDelta = (latitudeB - latitudeA) * radians;
  const longitudeDelta = (longitudeB - longitudeA) * radians;
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitudeA * radians) * Math.cos(latitudeB * radians)
      * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

function lineLengthMeters(latitudes: number[], longitudes: number[]): number {
  let length = 0;
  for (let index = 1; index < latitudes.length; index += 1) {
    length += distanceMeters(
      latitudes[index - 1],
      longitudes[index - 1],
      latitudes[index],
      longitudes[index],
    );
  }
  return length;
}

function polygonAreaSquareMeters(latitudes: number[], longitudes: number[]): number {
  if (latitudes.length < 3) return 0;
  const radians = Math.PI / 180;
  const referenceLatitude = latitudes.reduce((sum, item) => sum + item, 0) / latitudes.length * radians;
  const points = latitudes.map((latitude, index) => ({
    x: EARTH_RADIUS_METERS * longitudes[index] * radians * Math.cos(referenceLatitude),
    y: EARTH_RADIUS_METERS * latitude * radians,
  }));
  let twiceArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    twiceArea += points[index].x * next.y - next.x * points[index].y;
  }
  return Math.abs(twiceArea) / 2;
}

function representativeCoordinate(
  latitudeText: string | null,
  longitudeText: string | null,
): {
  latitude: number | null;
  longitude: number | null;
  latitudeInvalid: boolean;
  longitudeInvalid: boolean;
  vertexCount: number;
  areaSquareMeters: number;
  lengthMeters: number;
} {
  const latitudes = coordinateParts(latitudeText);
  const longitudes = coordinateParts(longitudeText);
  const countMismatch = latitudes.parts.length !== longitudes.parts.length
    || latitudes.parts.some((part, index) => part.length !== longitudes.parts[index]?.length);
  const allLatitudes = latitudes.parts.flat();
  const allLongitudes = longitudes.parts.flat();
  if (latitudes.invalid || longitudes.invalid || countMismatch || allLatitudes.length === 0) {
    return {
      latitude: null,
      longitude: null,
      latitudeInvalid: latitudes.invalid || countMismatch,
      longitudeInvalid: longitudes.invalid || countMismatch,
      vertexCount: 0,
      areaSquareMeters: 0,
      lengthMeters: 0,
    };
  }
  const vertexCount = allLatitudes.length;
  return {
    latitude: allLatitudes.reduce((sum, item) => sum + item, 0) / vertexCount,
    longitude: allLongitudes.reduce((sum, item) => sum + item, 0) / vertexCount,
    latitudeInvalid: false,
    longitudeInvalid: false,
    vertexCount,
    areaSquareMeters: latitudes.parts.reduce(
      (sum, part, index) => sum + polygonAreaSquareMeters(part, longitudes.parts[index]),
      0,
    ),
    lengthMeters: latitudes.parts.reduce(
      (sum, part, index) => sum + lineLengthMeters(part, longitudes.parts[index]),
      0,
    ),
  };
}

export function normalizeEdogawaWalkingPlace(
  source: EdogawaWalkingPlaceSource,
  dataset: EdogawaWalkingPlaceDataset,
  sourceUrl: string,
): NormalizedPublicPlaceCandidate {
  const config = DATASET_CONFIG[dataset];
  const name = text(source.name);
  const address = text(source.address);
  const coordinate = representativeCoordinate(source.latitudeText, source.longitudeText);
  const coordinateAreaIssue = coordinate.latitude !== null && coordinate.longitude !== null
    ? coordinate.latitude < 35.55 || coordinate.latitude > 35.85
      || coordinate.longitude < 139.75 || coordinate.longitude > 140.05
    : false;

  return {
    sourceDatasetId: config.sourceDatasetId,
    sourcePlaceId: sourceIdentity(name, address),
    sourceName: "江戸川区",
    name,
    category: config.category,
    address,
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    officialUrl: canonicalUrl(source.officialUrl),
    description: text(source.description),
    availableDays: null,
    openTime: null,
    closeTime: null,
    hoursNote: null,
    attributes: {
      walking_place: {
        coordinate_method: "mean_of_official_geometry_vertices",
        source_vertex_count: coordinate.vertexCount,
        ...(source.imageUrls.length ? { image_urls: source.imageUrls } : {}),
        ...(dataset === "parks" ? {
          area_square_meters: Math.round(coordinate.areaSquareMeters),
          large_park_candidate: coordinate.areaSquareMeters >= LARGE_PARK_MIN_AREA_SQUARE_METERS,
          large_park_min_area_square_meters: LARGE_PARK_MIN_AREA_SQUARE_METERS,
        } : {
          length_meters: Math.round(coordinate.lengthMeters),
        }),
      },
    },
    sourceUpdatedAt: null,
    latitudeIssue: coordinate.latitudeInvalid ? "invalid" : null,
    longitudeIssue: coordinate.longitudeInvalid ? "invalid" : null,
    coordinateAreaIssue,
    sourceUrl,
    warnings: [],
  };
}
