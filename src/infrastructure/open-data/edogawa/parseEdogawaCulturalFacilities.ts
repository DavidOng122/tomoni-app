import { EDOGAWA_CULTURAL_FACILITY_HEADERS } from "./edogawaPublicPlaceHeaders.ts";
import type {
  EdogawaMapPlace,
  ParsedEdogawaMapSource,
} from "./edogawaPublicPlaceSourceTypes.ts";
import { decodeCsvBytes, parseCsvRecords, type CsvEncoding } from "./parseCsvRecords.ts";

function value(input: string | undefined): string | null {
  const normalized = input?.replace(/[\s\u3000]+/gu, " ").trim() ?? "";
  return normalized || null;
}

export function parseEdogawaCulturalFacilitiesCsv(
  bytes: Uint8Array,
  encoding: CsvEncoding = "shift_jis",
): ParsedEdogawaMapSource {
  const parsed = parseCsvRecords(decodeCsvBytes(bytes, encoding), {
    requiredHeaders: ["名称", "所在地", "URL", "緯度", "経度"],
    knownHeaders: EDOGAWA_CULTURAL_FACILITY_HEADERS,
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
      imageUrl: value(row["写真"]),
      phone: value(row["電話番号"]),
      fax: value(row["FAX"]),
      latitudeText: value(row["緯度"]),
      longitudeText: value(row["経度"]),
    })),
  };
}
