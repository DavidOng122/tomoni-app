import { parse } from "csv-parse/sync";

import type {
  EdogawaWalkingPlaceSource,
  ParsedEdogawaWalkingPlaceSource,
} from "./edogawaPublicPlaceSourceTypes.ts";
import { CsvSourceParseError, decodeCsvBytes, type CsvEncoding } from "./parseCsvRecords.ts";

export type EdogawaWalkingDatasetKind = "parks" | "waterfront_parks" | "waterfront_greenways";

const EXPECTED_HEADERS: Record<EdogawaWalkingDatasetKind, readonly string[]> = {
  parks: ["名称", "所在地", "写真", "写真", "緯度", "経度"],
  waterfront_parks: ["名称", "説明", "所在地", "URL", "写真", "コメント", "緯度", "経度"],
  waterfront_greenways: ["名称", "説明", "所在地", "URL", "写真", "緯度", "経度"],
};

function value(raw: unknown): string | null {
  const normalized = typeof raw === "string"
    ? raw.replace(/[\s\u3000]+/gu, " ").trim()
    : "";
  return normalized || null;
}

function indices(headers: readonly string[], target: string): number[] {
  return headers.flatMap((header, index) => header === target ? [index] : []);
}

export function parseEdogawaWalkingPlaceCsv(
  bytes: Uint8Array,
  kind: EdogawaWalkingDatasetKind,
  encoding: CsvEncoding = "shift_jis",
): ParsedEdogawaWalkingPlaceSource {
  let records: string[][];
  try {
    records = parse(decodeCsvBytes(bytes, encoding), {
      bom: true,
      relax_column_count: false,
      skip_empty_lines: true,
    }) as string[][];
  } catch (error) {
    throw new CsvSourceParseError(
      "csv_parse_error",
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }

  const [rawHeaders, ...rows] = records;
  if (!rawHeaders) {
    throw new CsvSourceParseError("missing_required_header", "CSV has no header row.");
  }
  const headers = rawHeaders.map((header) => header.trim());
  const expected = [...EXPECTED_HEADERS[kind]];
  if (headers.length !== expected.length || headers.some((header, index) => header !== expected[index])) {
    throw new CsvSourceParseError(
      "missing_required_header",
      `Unexpected ${kind} CSV headers. Expected: ${expected.join(", ")}. Received: ${headers.join(", ")}.`,
    );
  }

  const nameIndex = headers.indexOf("名称");
  const addressIndex = headers.indexOf("所在地");
  const descriptionIndex = headers.indexOf("説明");
  const commentIndex = headers.indexOf("コメント");
  const urlIndex = headers.indexOf("URL");
  const latitudeIndex = headers.indexOf("緯度");
  const longitudeIndex = headers.indexOf("経度");
  const imageIndices = indices(headers, "写真");

  const places = rows.map((row, index): EdogawaWalkingPlaceSource => {
    const description = value(descriptionIndex >= 0 ? row[descriptionIndex] : null);
    const comment = value(commentIndex >= 0 ? row[commentIndex] : null);
    return {
      recordNumber: index + 2,
      name: value(row[nameIndex]) ?? "",
      description: [description, comment].filter(Boolean).join(" ") || null,
      address: value(row[addressIndex]),
      officialUrl: value(urlIndex >= 0 ? row[urlIndex] : null),
      imageUrls: imageIndices.map((imageIndex) => value(row[imageIndex])).filter((item): item is string => item !== null),
      latitudeText: value(row[latitudeIndex]),
      longitudeText: value(row[longitudeIndex]),
    };
  });

  return { places, headers, unknownHeaders: [] };
}

export const parseEdogawaParkCsv = (bytes: Uint8Array, encoding?: CsvEncoding) =>
  parseEdogawaWalkingPlaceCsv(bytes, "parks", encoding);

export const parseEdogawaWaterfrontParkCsv = (bytes: Uint8Array, encoding?: CsvEncoding) =>
  parseEdogawaWalkingPlaceCsv(bytes, "waterfront_parks", encoding);

export const parseEdogawaWaterfrontGreenwayCsv = (bytes: Uint8Array, encoding?: CsvEncoding) =>
  parseEdogawaWalkingPlaceCsv(bytes, "waterfront_greenways", encoding);
