import { parse } from "csv-parse/sync";

import type { CsvSourceRow, ParsedCsvSource } from "./edogawaPublicPlaceSourceTypes.ts";

export type CsvEncoding = "shift_jis" | "utf-8";

export class CsvSourceParseError extends Error {
  readonly code: "csv_parse_error" | "duplicate_header" | "missing_required_header";

  constructor(
    code: CsvSourceParseError["code"],
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CsvSourceParseError";
    this.code = code;
  }
}

export function decodeCsvBytes(bytes: Uint8Array, encoding: CsvEncoding): string {
  return new TextDecoder(encoding, { fatal: true }).decode(bytes);
}

export function parseCsvRecords(
  csvText: string,
  options: {
    requiredHeaders: readonly string[];
    knownHeaders: readonly string[];
  },
): ParsedCsvSource {
  let headers: string[] = [];
  let rows: CsvSourceRow[];

  try {
    rows = parse(csvText, {
      bom: true,
      columns(rawHeaders: string[]) {
        headers = rawHeaders.map((header) => header.trim());
        const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index);
        if (duplicates.length > 0) {
          throw new CsvSourceParseError(
            "duplicate_header",
            `Duplicate CSV headers: ${[...new Set(duplicates)].join(", ")}.`,
          );
        }
        const missing = options.requiredHeaders.filter((header) => !headers.includes(header));
        if (missing.length > 0) {
          throw new CsvSourceParseError(
            "missing_required_header",
            `Missing required CSV headers: ${missing.join(", ")}.`,
          );
        }
        return headers;
      },
      relax_column_count: false,
      skip_empty_lines: true,
    }) as CsvSourceRow[];
  } catch (error) {
    if (error instanceof CsvSourceParseError) {
      throw error;
    }
    throw new CsvSourceParseError(
      "csv_parse_error",
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }

  const known = new Set(options.knownHeaders);
  return {
    headers,
    unknownHeaders: headers.filter((header) => !known.has(header)),
    rows,
  };
}
