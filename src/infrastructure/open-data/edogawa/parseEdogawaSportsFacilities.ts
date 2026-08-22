import {
  EDOGAWA_SPORTS_MAP_HEADERS,
  EDOGAWA_SPORTS_STANDARD_HEADERS,
} from "./edogawaPublicPlaceHeaders.ts";
import type {
  EdogawaMapPlace,
  ParsedEdogawaMapSource,
  ParsedEdogawaStandardSource,
} from "./edogawaPublicPlaceSourceTypes.ts";
import { decodeCsvBytes, parseCsvRecords, type CsvEncoding } from "./parseCsvRecords.ts";

function value(value: string | undefined): string | null {
  const normalized = value?.replace(/[\s\u3000]+/gu, " ").trim() ?? "";
  return normalized || null;
}

export function parseEdogawaSportsMapCsv(
  bytes: Uint8Array,
  encoding: CsvEncoding = "shift_jis",
): ParsedEdogawaMapSource {
  const parsed = parseCsvRecords(decodeCsvBytes(bytes, encoding), {
    requiredHeaders: ["名称", "所在地", "URL", "緯度", "経度"],
    knownHeaders: EDOGAWA_SPORTS_MAP_HEADERS,
  });
  return {
    headers: parsed.headers,
    unknownHeaders: parsed.unknownHeaders,
    places: parsed.rows.map((row, index): EdogawaMapPlace => ({
      recordNumber: index + 2,
      name: value(row["名称"]) ?? "",
      description: null,
      postalCode: value(row["郵便番号"]),
      address: value(row["所在地"]),
      officialUrl: value(row["URL"]),
      imageUrl: value(row["写真URL"]),
      phone: value(row["電話番号"]),
      fax: value(row["FAX"]),
      latitudeText: value(row["緯度"]),
      longitudeText: value(row["経度"]),
    })),
  };
}

export function parseEdogawaSportsStandardCsv(bytes: Uint8Array): ParsedEdogawaStandardSource {
  const parsed = parseCsvRecords(decodeCsvBytes(bytes, "utf-8"), {
    requiredHeaders: ["ID", "名称", "所在地_連結表記", "利用可能曜日", "開始時間", "終了時間"],
    knownHeaders: EDOGAWA_SPORTS_STANDARD_HEADERS,
  });
  return {
    headers: parsed.headers,
    unknownHeaders: parsed.unknownHeaders,
    places: parsed.rows.map((row, index) => ({
      recordNumber: index + 2,
      row,
      name: value(row["名称"]) ?? "",
      address: value(row["所在地_連結表記"]),
    })),
  };
}
