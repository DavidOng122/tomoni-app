import type {
  EdogawaMapPlace,
  EdogawaStandardPlace,
} from "../../../infrastructure/open-data/edogawa/edogawaPublicPlaceSourceTypes.ts";

export interface MatchedEdogawaPublicPlaceSource {
  map: EdogawaMapPlace;
  standard: EdogawaStandardPlace | null;
  matchKind: "exact_name" | "reviewed_alias" | "unmatched";
  warnings: string[];
}

export interface EdogawaSourceMatchResult {
  matched: MatchedEdogawaPublicPlaceSource[];
  excludedMapRows: EdogawaMapPlace[];
  unmatchedStandardRows: EdogawaStandardPlace[];
  ambiguousMapRows: EdogawaMapPlace[];
}

const SPORTS_NAME_ALIASES: Record<string, string> = {
  "オーエンススタジアム江戸川(江戸川区球場)": "江戸川区球場",
  "スピアーズえどりくフィールド(陸上競技場)": "陸上競技場",
  "葛西ラグビースポーツパーク(2022年4月3日オープン)": "葛西ラグビースポーツパーク",
};

const LIBRARY_NAME_ALIASES: Record<string, string> = {
  "子ども未来館(篠崎子ども図書館)": "篠崎子ども図書館",
};

function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/^江戸川区立/u, "")
    .replace(/[\s\u3000]/gu, "")
    .replace(/[（]/gu, "(")
    .replace(/[）]/gu, ")")
    .trim();
}

export function normalizeEdogawaAddress(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const normalized = value
    .normalize("NFKC")
    .replace(/^東京都/u, "")
    .replace(/^江戸川区/u, "")
    .replace(/[\s\u3000]/gu, "")
    .replace(/丁目/gu, "-")
    .replace(/番地?/gu, "-")
    .replace(/号/gu, "")
    .replace(/-+/gu, "-")
    .replace(/-$/u, "");
  return normalized || null;
}

function matchSources(
  mapPlaces: readonly EdogawaMapPlace[],
  standardPlaces: readonly EdogawaStandardPlace[],
  aliases: Record<string, string>,
): EdogawaSourceMatchResult {
  const matched: MatchedEdogawaPublicPlaceSource[] = [];
  const ambiguousMapRows: EdogawaMapPlace[] = [];
  const usedStandardRows = new Set<number>();

  for (const map of mapPlaces) {
    const normalizedMapName = normalizeName(map.name);
    const expectedStandardName = aliases[normalizedMapName] ?? normalizedMapName;
    const candidates = standardPlaces.filter(
      (standard) => normalizeName(standard.name) === expectedStandardName,
    );

    if (candidates.length > 1) {
      ambiguousMapRows.push(map);
      continue;
    }
    const standard = candidates[0] ?? null;
    if (standard) {
      usedStandardRows.add(standard.recordNumber);
    }
    const warnings: string[] = [];
    if (
      standard
      && normalizeEdogawaAddress(map.address) !== normalizeEdogawaAddress(standard.address)
    ) {
      warnings.push("source_address_mismatch");
    }
    matched.push({
      map,
      standard,
      matchKind: standard
        ? aliases[normalizedMapName]
          ? "reviewed_alias"
          : "exact_name"
        : "unmatched",
      warnings,
    });
  }

  return {
    matched,
    excludedMapRows: [],
    ambiguousMapRows,
    unmatchedStandardRows: standardPlaces.filter(
      (standard) => !usedStandardRows.has(standard.recordNumber),
    ),
  };
}

export function matchEdogawaSportsSources(
  mapPlaces: readonly EdogawaMapPlace[],
  standardPlaces: readonly EdogawaStandardPlace[],
): EdogawaSourceMatchResult {
  return matchSources(mapPlaces, standardPlaces, SPORTS_NAME_ALIASES);
}

function isFormalLibrary(map: EdogawaMapPlace): boolean {
  if (!map.officialUrl) {
    return false;
  }
  try {
    return new URL(map.officialUrl).pathname.endsWith(".php");
  } catch {
    return false;
  }
}

export function matchEdogawaLibrarySources(
  mapPlaces: readonly EdogawaMapPlace[],
  standardPlaces: readonly EdogawaStandardPlace[],
): EdogawaSourceMatchResult {
  const formal = mapPlaces.filter(isFormalLibrary);
  const result = matchSources(formal, standardPlaces, LIBRARY_NAME_ALIASES);
  result.excludedMapRows = mapPlaces.filter((map) => !isFormalLibrary(map));
  return result;
}
