import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { detectPublicPlaceIdentityDuplicates } from "../../src/features/public-places/domain/detectPublicPlaceIdentityDuplicates.ts";
import {
  matchEdogawaLibrarySources,
  matchEdogawaSportsSources,
  type EdogawaSourceMatchResult,
} from "../../src/features/public-places/domain/matchEdogawaPublicPlaceSources.ts";
import {
  normalizeEdogawaLibrary,
  normalizeEdogawaSportsFacility,
  normalizeEdogawaCulturalFacility,
  classifyEdogawaRecreationDestination,
  normalizeEdogawaRecreationDestination,
} from "../../src/features/public-places/domain/normalizeEdogawaPublicPlace.ts";
import {
  consolidateEdogawaWalkingPlaceSources,
  normalizeEdogawaWalkingPlace,
  type EdogawaWalkingPlaceDataset,
} from "../../src/features/public-places/domain/normalizeEdogawaWalkingPlace.ts";
import type {
  NormalizedPublicPlace,
  PublicPlaceValidationResult,
} from "../../src/features/public-places/domain/publicPlaceImportTypes.ts";
import { validateNormalizedPublicPlace } from "../../src/features/public-places/domain/validateNormalizedPublicPlace.ts";
import {
  EDOGAWA_PUBLIC_PLACE_DATASETS,
  EDOGAWA_WALKING_PLACE_DATASETS,
  EDOGAWA_CULTURAL_FACILITIES_DATASET,
  EDOGAWA_RECREATION_DESTINATIONS_DATASET,
} from "../../src/infrastructure/open-data/edogawa/edogawaPublicPlaceDatasetRegistry.ts";
import { fetchEdogawaPublicPlaceCsv } from "../../src/infrastructure/open-data/edogawa/fetchEdogawaPublicPlaceCsv.ts";
import { fetchEdogawaSportsFacilityPageIdentity } from "../../src/infrastructure/open-data/edogawa/fetchEdogawaSportsFacilityPageIdentity.ts";
import {
  parseEdogawaLibraryMapCsv,
  parseEdogawaLibraryStandardCsv,
} from "../../src/infrastructure/open-data/edogawa/parseEdogawaLibraries.ts";
import {
  parseEdogawaSportsMapCsv,
  parseEdogawaSportsStandardCsv,
} from "../../src/infrastructure/open-data/edogawa/parseEdogawaSportsFacilities.ts";
import {
  parseEdogawaParkCsv,
  parseEdogawaWaterfrontGreenwayCsv,
  parseEdogawaWaterfrontParkCsv,
} from "../../src/infrastructure/open-data/edogawa/parseEdogawaWalkingPlaces.ts";
import { parseEdogawaCulturalFacilitiesCsv } from "../../src/infrastructure/open-data/edogawa/parseEdogawaCulturalFacilities.ts";
import { parseEdogawaRecreationDestinationsCsv } from "../../src/infrastructure/open-data/edogawa/parseEdogawaRecreationDestinations.ts";

type DatasetSelection =
  | "sports"
  | "libraries"
  | "parks"
  | "waterfront-parks"
  | "waterfront-greenways"
  | "walking"
  | "cultural"
  | "destinations"
  | "all";

interface ImportArguments {
  dataset: DatasetSelection;
  write: boolean;
  outputPath: string | null;
}

interface ImportParseError {
  sourceUrl: string;
  code: string;
  message: string;
}

interface DatasetReport {
  sourceDatasetId: string;
  counts: {
    discovered: number;
    accepted: number;
    skipped: number;
    duplicate: number;
    parseErrors: number;
  };
  accepted: Array<{ place: NormalizedPublicPlace; warnings: string[] }>;
  skipped: Array<Extract<PublicPlaceValidationResult, { kind: "skipped" }>>;
  duplicates: Array<Record<string, unknown>>;
  parseErrors: ImportParseError[];
  unknownHeaders: { map: string[]; standard: string[] };
  unmatchedSourceRows: { map: Array<Record<string, unknown>>; standard: Array<Record<string, unknown>> };
  ambiguousMatches: Array<Record<string, unknown>>;
  matchSummary: Record<string, unknown>;
  requirementsMet: boolean;
}

function usage(): string {
  return [
    "Usage:",
    "  npm run open-data:edogawa-public-places -- [--dataset sports|libraries|parks|waterfront-parks|waterfront-greenways|walking|cultural|destinations|all] [--dry-run] [--output path]",
    "  npm run open-data:edogawa-public-places -- [--dataset sports|libraries|parks|waterfront-parks|waterfront-greenways|walking|cultural|destinations|all] --write [--output path]",
    "",
    "Dry-run is the default. Write mode requires the explicit --write flag.",
    "Product default --dataset all includes parks, libraries, sports, and selected destinations only.",
  ].join("\n");
}

function option(argv: string[], name: string): string | null {
  const index = argv.indexOf(name);
  if (index < 0) return null;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function parseArguments(argv: string[]): ImportArguments {
  if (argv.includes("--help")) {
    process.stdout.write(`${usage()}\n`);
    process.exit(0);
  }
  const datasetValue = option(argv, "--dataset") ?? "all";
  if (![
    "sports",
    "libraries",
    "parks",
    "waterfront-parks",
    "waterfront-greenways",
    "walking",
    "cultural",
    "destinations",
    "all",
  ].includes(datasetValue)) {
    throw new Error("Unsupported --dataset value.");
  }
  const write = argv.includes("--write");
  if (write && argv.includes("--dry-run")) {
    throw new Error("--write and --dry-run are mutually exclusive.");
  }
  return {
    dataset: datasetValue as DatasetSelection,
    write,
    outputPath: option(argv, "--output"),
  };
}

function classify(
  discovered: number,
  validationResults: PublicPlaceValidationResult[],
  preclassifiedSkipped: DatasetReport["skipped"],
  parseErrors: ImportParseError[],
): Pick<DatasetReport, "counts" | "accepted" | "skipped" | "duplicates"> {
  const initiallyAccepted = validationResults
    .filter((result): result is Extract<PublicPlaceValidationResult, { kind: "accepted" }> => result.kind === "accepted");
  const duplicateResult = detectPublicPlaceIdentityDuplicates(
    initiallyAccepted.map((result) => result.place),
  );
  const duplicateKeys = new Set(
    duplicateResult.duplicates.map((duplicate) => `${duplicate.sourceDatasetId}\u0000${duplicate.sourcePlaceId}`),
  );
  const accepted = initiallyAccepted
    .filter((result) => !duplicateKeys.has(`${result.place.sourceDatasetId}\u0000${result.place.sourcePlaceId}`))
    .map((result) => ({ place: result.place, warnings: result.warnings }));
  const skipped = [
    ...preclassifiedSkipped,
    ...validationResults.filter(
      (result): result is Extract<PublicPlaceValidationResult, { kind: "skipped" }> => result.kind === "skipped",
    ),
  ];
  const counts = {
    discovered,
    accepted: accepted.length,
    skipped: skipped.length,
    duplicate: duplicateResult.duplicateCount,
    parseErrors: parseErrors.length,
  };
  const classified = counts.accepted + counts.skipped + counts.duplicate + counts.parseErrors;
  if (classified !== discovered) {
    throw new Error(`Import accounting invariant failed: discovered=${discovered}, classified=${classified}.`);
  }
  return {
    counts,
    accepted,
    skipped,
    duplicates: duplicateResult.duplicates.map((duplicate) => ({
      sourceDatasetId: duplicate.sourceDatasetId,
      sourcePlaceId: duplicate.sourcePlaceId,
      names: duplicate.places.map((place) => place.name),
    })),
  };
}

function matchReport(result: EdogawaSourceMatchResult): Pick<
  DatasetReport,
  "unmatchedSourceRows" | "ambiguousMatches" | "matchSummary"
> {
  return {
    unmatchedSourceRows: {
      map: result.matched
        .filter((match) => match.standard === null)
        .map((match) => ({ recordNumber: match.map.recordNumber, name: match.map.name })),
      standard: result.unmatchedStandardRows.map((row) => ({
        recordNumber: row.recordNumber,
        name: row.name,
      })),
    },
    ambiguousMatches: result.ambiguousMapRows.map((row) => ({
      recordNumber: row.recordNumber,
      name: row.name,
    })),
    matchSummary: {
      exactName: result.matched.filter((match) => match.matchKind === "exact_name").length,
      reviewedAlias: result.matched.filter((match) => match.matchKind === "reviewed_alias").length,
      unmatchedMap: result.matched.filter((match) => match.matchKind === "unmatched").length,
      unmatchedStandard: result.unmatchedStandardRows.length,
      excludedMap: result.excludedMapRows.length,
      ambiguous: result.ambiguousMapRows.length,
    },
  };
}

async function sportsReport(): Promise<DatasetReport> {
  const definition = EDOGAWA_PUBLIC_PLACE_DATASETS.edogawa_sports_facilities;
  const [mapFetch, standardFetch] = await Promise.all([
    fetchEdogawaPublicPlaceCsv(definition.mapCsvUrl, { signal: AbortSignal.timeout(30_000) }),
    fetchEdogawaPublicPlaceCsv(definition.standardCsvUrl, { signal: AbortSignal.timeout(30_000) }),
  ]);
  const mapSource = parseEdogawaSportsMapCsv(mapFetch.bytes);
  const standardSource = parseEdogawaSportsStandardCsv(standardFetch.bytes);
  const matches = matchEdogawaSportsSources(mapSource.places, standardSource.places);
  const validationResults: PublicPlaceValidationResult[] = [];
  const parseErrors: ImportParseError[] = [];
  const preclassifiedSkipped: DatasetReport["skipped"] = matches.ambiguousMapRows.map((row) => ({
    kind: "skipped",
    reason: "ambiguous_source_match",
    evidence: row.name,
    sourceUrl: row.officialUrl ?? "",
  }));

  await Promise.all(matches.matched.map(async (match) => {
    if (!match.map.officialUrl) {
      validationResults.push(validateNormalizedPublicPlace(
        normalizeEdogawaSportsFacility(match, { sourceUrl: "", pageId: null }),
      ));
      return;
    }
    try {
      const identity = await fetchEdogawaSportsFacilityPageIdentity(match.map.officialUrl, {
        signal: AbortSignal.timeout(30_000),
      });
      validationResults.push(validateNormalizedPublicPlace(normalizeEdogawaSportsFacility(match, identity)));
    } catch (error) {
      parseErrors.push({
        sourceUrl: match.map.officialUrl,
        code: "facility_page_fetch_or_parse_failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }));

  const classified = classify(mapSource.places.length, validationResults, preclassifiedSkipped, parseErrors);
  const matching = matchReport(matches);
  const requirementsMet = classified.counts.accepted === 13
    && classified.counts.skipped === 0
    && classified.counts.duplicate === 0
    && classified.counts.parseErrors === 0
    && new Set(classified.accepted.map((item) => item.place.sourcePlaceId)).size === 13;
  return {
    sourceDatasetId: definition.id,
    ...classified,
    parseErrors,
    unknownHeaders: { map: mapSource.unknownHeaders, standard: standardSource.unknownHeaders },
    ...matching,
    requirementsMet,
  };
}

async function librariesReport(): Promise<DatasetReport> {
  const definition = EDOGAWA_PUBLIC_PLACE_DATASETS.edogawa_public_libraries;
  const [mapFetch, standardFetch] = await Promise.all([
    fetchEdogawaPublicPlaceCsv(definition.mapCsvUrl, { signal: AbortSignal.timeout(30_000) }),
    fetchEdogawaPublicPlaceCsv(definition.standardCsvUrl, { signal: AbortSignal.timeout(30_000) }),
  ]);
  const mapSource = parseEdogawaLibraryMapCsv(mapFetch.bytes);
  const standardSource = parseEdogawaLibraryStandardCsv(standardFetch.bytes);
  const matches = matchEdogawaLibrarySources(mapSource.places, standardSource.places);
  const preclassifiedSkipped: DatasetReport["skipped"] = [
    ...matches.excludedMapRows.map((row) => ({
      kind: "skipped" as const,
      reason: "unsupported_record" as const,
      evidence: "school_library_satellite",
      sourceUrl: row.officialUrl ?? "",
    })),
    ...matches.ambiguousMapRows.map((row) => ({
      kind: "skipped" as const,
      reason: "ambiguous_source_match" as const,
      evidence: row.name,
      sourceUrl: row.officialUrl ?? "",
    })),
  ];
  const validationResults = matches.matched.map((match) =>
    validateNormalizedPublicPlace(normalizeEdogawaLibrary(match))
  );
  const parseErrors: ImportParseError[] = [];
  const classified = classify(mapSource.places.length, validationResults, preclassifiedSkipped, parseErrors);
  const matching = matchReport(matches);
  const formalMatches = matches.matched.filter((match) => match.standard !== null).length;
  const requirementsMet = classified.counts.accepted === 12
    && classified.counts.skipped === 10
    && classified.counts.duplicate === 0
    && classified.counts.parseErrors === 0
    && formalMatches === 12
    && matches.unmatchedStandardRows.length === 0
    && matches.ambiguousMapRows.length === 0
    && new Set(classified.accepted.map((item) => item.place.sourcePlaceId)).size === 12;
  return {
    sourceDatasetId: definition.id,
    ...classified,
    parseErrors,
    unknownHeaders: { map: mapSource.unknownHeaders, standard: standardSource.unknownHeaders },
    ...matching,
    requirementsMet,
  };
}

async function walkingPlaceReport(dataset: EdogawaWalkingPlaceDataset): Promise<DatasetReport> {
  const definition = EDOGAWA_WALKING_PLACE_DATASETS[dataset];
  const fetched = await fetchEdogawaPublicPlaceCsv(definition.csvUrl, {
    signal: AbortSignal.timeout(30_000),
  });
  const parsed = dataset === "parks"
    ? parseEdogawaParkCsv(fetched.bytes)
    : dataset === "waterfront_parks"
      ? parseEdogawaWaterfrontParkCsv(fetched.bytes)
      : parseEdogawaWaterfrontGreenwayCsv(fetched.bytes);
  const consolidated = consolidateEdogawaWalkingPlaceSources(parsed.places);
  const validationResults = consolidated.map((place) =>
    validateNormalizedPublicPlace(normalizeEdogawaWalkingPlace(place, dataset, fetched.sourceUrl))
  );
  const parseErrors: ImportParseError[] = [];
  const classified = classify(consolidated.length, validationResults, [], parseErrors);
  const requirementsMet = classified.counts.accepted > 0
    && classified.counts.duplicate === 0
    && classified.counts.parseErrors === 0;

  return {
    sourceDatasetId: definition.id,
    ...classified,
    parseErrors,
    unknownHeaders: { map: parsed.unknownHeaders, standard: [] },
    unmatchedSourceRows: { map: [], standard: [] },
    ambiguousMatches: [],
    matchSummary: {
      sourceRows: parsed.places.length,
      consolidatedPlaces: consolidated.length,
      mergedSourceRows: parsed.places.length - consolidated.length,
    },
    requirementsMet,
  };
}

async function culturalFacilitiesReport(): Promise<DatasetReport> {
  const definition = EDOGAWA_CULTURAL_FACILITIES_DATASET;
  const fetched = await fetchEdogawaPublicPlaceCsv(definition.csvUrl, {
    signal: AbortSignal.timeout(30_000),
  });
  const parsed = parseEdogawaCulturalFacilitiesCsv(fetched.bytes);
  const validationResults = parsed.places.map((place) =>
    validateNormalizedPublicPlace(normalizeEdogawaCulturalFacility(place))
  );
  const parseErrors: ImportParseError[] = [];
  const classified = classify(parsed.places.length, validationResults, [], parseErrors);
  const requirementsMet = classified.counts.accepted === 39
    && classified.counts.skipped === 0
    && classified.counts.duplicate === 0
    && classified.counts.parseErrors === 0;

  return {
    sourceDatasetId: definition.id,
    ...classified,
    parseErrors,
    unknownHeaders: { map: parsed.unknownHeaders, standard: [] },
    unmatchedSourceRows: { map: [], standard: [] },
    ambiguousMatches: [],
    matchSummary: { sourceRows: parsed.places.length },
    requirementsMet,
  };
}

async function recreationDestinationsReport(): Promise<DatasetReport> {
  const definition = EDOGAWA_RECREATION_DESTINATIONS_DATASET;
  const fetched = await fetchEdogawaPublicPlaceCsv(definition.csvUrl, {
    signal: AbortSignal.timeout(30_000),
  });
  const parsed = parseEdogawaRecreationDestinationsCsv(fetched.bytes);
  const supported = parsed.places.flatMap((place) => {
    const facilityType = classifyEdogawaRecreationDestination(place.name);
    return facilityType ? [{ place, facilityType }] : [];
  });
  const preclassifiedSkipped: DatasetReport["skipped"] = parsed.places.flatMap((place) =>
    classifyEdogawaRecreationDestination(place.name)
      ? []
      : [{
          kind: "skipped" as const,
          reason: "unsupported_record" as const,
          evidence: place.name,
          sourceUrl: place.officialUrl ?? fetched.sourceUrl,
        }]
  );
  const validationResults = supported.map(({ place, facilityType }) =>
    validateNormalizedPublicPlace(normalizeEdogawaRecreationDestination(place, facilityType))
  );
  const parseErrors: ImportParseError[] = [];
  const classified = classify(parsed.places.length, validationResults, preclassifiedSkipped, parseErrors);
  const requirementsMet = classified.counts.accepted === 4
    && classified.counts.skipped === 5
    && classified.counts.duplicate === 0
    && classified.counts.parseErrors === 0;

  return {
    sourceDatasetId: definition.id,
    ...classified,
    parseErrors,
    unknownHeaders: { map: parsed.unknownHeaders, standard: [] },
    unmatchedSourceRows: { map: [], standard: [] },
    ambiguousMatches: [],
    matchSummary: { sourceRows: parsed.places.length, curatedDestinations: supported.length },
    requirementsMet,
  };
}

async function writeReviewFile(path: string, report: unknown): Promise<string> {
  const absolutePath = resolve(path);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return absolutePath;
}

async function run(): Promise<void> {
  const args = parseArguments(process.argv.slice(2));
  const runStartedAt = new Date();
  const reports: DatasetReport[] = [];
  if (args.dataset === "sports" || args.dataset === "all") reports.push(await sportsReport());
  if (args.dataset === "libraries" || args.dataset === "all") reports.push(await librariesReport());
  if (args.dataset === "parks" || args.dataset === "walking" || args.dataset === "all") {
    reports.push(await walkingPlaceReport("parks"));
  }
  if (args.dataset === "waterfront-parks" || args.dataset === "walking") {
    reports.push(await walkingPlaceReport("waterfront_parks"));
  }
  if (args.dataset === "waterfront-greenways" || args.dataset === "walking") {
    reports.push(await walkingPlaceReport("waterfront_greenways"));
  }
  if (args.dataset === "cultural") {
    reports.push(await culturalFacilitiesReport());
  }
  if (args.dataset === "destinations" || args.dataset === "all") {
    reports.push(await recreationDestinationsReport());
  }

  const totals = reports.reduce(
    (result, report) => ({
      discovered: result.discovered + report.counts.discovered,
      accepted: result.accepted + report.counts.accepted,
      skipped: result.skipped + report.counts.skipped,
      duplicate: result.duplicate + report.counts.duplicate,
      parseErrors: result.parseErrors + report.counts.parseErrors,
    }),
    { discovered: 0, accepted: 0, skipped: 0, duplicate: 0, parseErrors: 0 },
  );
  const requirementsMet = reports.every((report) => report.requirementsMet);
  const report: Record<string, unknown> = {
    mode: args.write ? "write" : "dry-run",
    runStartedAt: runStartedAt.toISOString(),
    datasetSelection: args.dataset,
    totals,
    requirementsMet,
    datasets: reports,
  };

  if (!requirementsMet) {
    report.writeAborted = args.write;
    if (args.outputPath) report.outputPath = await writeReviewFile(args.outputPath, report);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = 2;
    return;
  }

  const accepted = reports.flatMap((dataset) => dataset.accepted.map((item) => item.place));
  if (args.write) {
    const duplicateResult = detectPublicPlaceIdentityDuplicates(accepted);
    if (duplicateResult.duplicateCount > 0) {
      throw new Error("Duplicate identities detected; write mode aborted before connecting to Supabase.");
    }
    const [serviceRoleModule, upsertModule] = await Promise.all([
      import("../../src/infrastructure/supabase/createServiceRoleClient.ts"),
      import("../../src/infrastructure/public-places/upsertPublicPlaces.ts"),
    ]);
    const client = serviceRoleModule.createServiceRoleClient();
    report.writeResult = await upsertModule.upsertPublicPlaces(client, accepted, {
      runStartedAt,
      batchSize: 50,
    });
  }

  if (args.outputPath) report.outputPath = await writeReviewFile(args.outputPath, report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

run().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({
    error: error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) },
  }, null, 2)}\n\n${usage()}\n`);
  process.exitCode = 1;
});
