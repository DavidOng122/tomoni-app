import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { detectOfficialEventIdentityDuplicates } from "../../src/features/events/domain/detectOfficialEventIdentityDuplicates.ts";
import { filterOfficialEventCatalogEntry } from "../../src/features/events/domain/filterOfficialEventCatalogEntry.ts";
import { normalizeEdogawaOfficialEvent } from "../../src/features/events/domain/normalizeEdogawaOfficialEvent.ts";
import type {
  NormalizedOfficialEvent,
  OfficialEventValidationResult,
} from "../../src/features/events/domain/officialEventImportTypes.ts";
import { validateNormalizedOfficialEvent } from "../../src/features/events/domain/validateNormalizedOfficialEvent.ts";
import { fetchEdogawaEventCalendar } from "../../src/infrastructure/open-data/edogawa/fetchEdogawaEventCalendar.ts";
import { fetchEdogawaEventPage } from "../../src/infrastructure/open-data/edogawa/fetchEdogawaEventPage.ts";
import { parseEdogawaEventPage } from "../../src/infrastructure/open-data/edogawa/parseEdogawaEventPage.ts";

interface ImportArguments {
  year: number;
  month: number;
  write: boolean;
  outputPath: string | null;
}

interface ImportParseError {
  sourceUrl: string;
  code: string;
  message: string;
}

function usage(): string {
  return [
    "Usage:",
    "  npm run open-data:edogawa-events -- --month YYYY-MM [--dry-run] [--output path]",
    "  npm run open-data:edogawa-events -- --month YYYY-MM --write [--output path]",
    "",
    "Dry-run is the default. Write mode is enabled only by the explicit --write flag.",
  ].join("\n");
}

function readOption(argv: string[], name: string): string | null {
  const index = argv.indexOf(name);
  if (index < 0) {
    return null;
  }
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function parseArguments(argv: string[]): ImportArguments {
  if (argv.includes("--help")) {
    process.stdout.write(`${usage()}\n`);
    process.exit(0);
  }

  const monthValue = readOption(argv, "--month");
  const monthMatch = monthValue?.match(/^(\d{4})-(\d{2})$/u);
  if (!monthMatch) {
    throw new Error("--month must use YYYY-MM format.");
  }

  const year = Number(monthMatch[1]);
  const month = Number(monthMatch[2]);
  if (year < 2000 || year > 2200 || month < 1 || month > 12) {
    throw new Error("--month is outside the supported range.");
  }

  const write = argv.includes("--write");
  if (write && argv.includes("--dry-run")) {
    throw new Error("--write and --dry-run are mutually exclusive.");
  }

  return {
    year,
    month,
    write,
    outputPath: readOption(argv, "--output"),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorReport(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }

  const report: Record<string, unknown> = {
    name: error.name,
    message: error.message,
  };
  if ("completedBatches" in error) {
    report.completedBatches = error.completedBatches;
  }
  if ("failedSourceIdentities" in error) {
    report.failedSourceIdentities = error.failedSourceIdentities;
  }
  return report;
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
  const calendar = await fetchEdogawaEventCalendar(
    { year: args.year, month: args.month },
    { signal: AbortSignal.timeout(20_000) },
  );

  const validationResults: OfficialEventValidationResult[] = [];
  const parseErrors: ImportParseError[] = [];

  for (const discoveredPage of calendar.pages) {
    try {
      const fetched = await fetchEdogawaEventPage(discoveredPage.url, {
        signal: AbortSignal.timeout(20_000),
      });
      const parsed = parseEdogawaEventPage(fetched.html, fetched.sourceUrl);
      if (parsed.kind === "parse_error") {
        parseErrors.push({
          sourceUrl: parsed.sourceUrl,
          code: parsed.code,
          message: parsed.message,
        });
        continue;
      }

      const candidate = normalizeEdogawaOfficialEvent(parsed.page, {
        now: runStartedAt,
      });
      validationResults.push(filterOfficialEventCatalogEntry(validateNormalizedOfficialEvent(candidate)));
    } catch (error) {
      parseErrors.push({
        sourceUrl: discoveredPage.url,
        code: "fetch_or_parse_failed",
        message: errorMessage(error),
      });
    }
  }

  const initiallyAccepted = validationResults
    .filter((result): result is Extract<OfficialEventValidationResult, { kind: "accepted" }> => result.kind === "accepted")
    .map((result) => result.event);
  const skipped = validationResults.filter(
    (result): result is Extract<OfficialEventValidationResult, { kind: "skipped" }> => result.kind === "skipped",
  );
  const identityResult = detectOfficialEventIdentityDuplicates(initiallyAccepted);
  const accepted: NormalizedOfficialEvent[] = identityResult.unique;

  const counts = {
    discovered: calendar.pages.length,
    accepted: accepted.length,
    skipped: skipped.length,
    duplicate: identityResult.duplicateCount,
    parseErrors: parseErrors.length,
  };
  const classifiedCount = counts.accepted
    + counts.skipped
    + counts.duplicate
    + counts.parseErrors;

  if (counts.discovered !== classifiedCount) {
    throw new Error(
      `Import accounting invariant failed: discovered=${counts.discovered}, classified=${classifiedCount}.`,
    );
  }

  const report: Record<string, unknown> = {
    sourceDatasetId: "edogawa_event_calendar",
    mode: args.write ? "write" : "dry-run",
    runStartedAt: runStartedAt.toISOString(),
    scope: {
      year: args.year,
      month: args.month,
      calendarUrl: calendar.calendarUrl,
    },
    counts,
    accepted,
    skipped,
    duplicates: identityResult.duplicates.map((duplicate) => ({
      sourceDatasetId: duplicate.sourceDatasetId,
      sourceEventId: duplicate.sourceEventId,
      sourceUrls: duplicate.events.map((event) => event.officialUrl),
    })),
    parseErrors,
  };

  if (args.write) {
    if (identityResult.duplicateCount > 0) {
      throw new Error("Duplicate source identities detected; write mode aborted before connecting to Supabase.");
    }

    const [serviceRoleModule, upsertModule] = await Promise.all([
      import("../../src/infrastructure/supabase/createServiceRoleClient.ts"),
      import("../../src/infrastructure/events/upsertOfficialEvents.ts"),
    ]);
    const client = serviceRoleModule.createServiceRoleClient();
    report.writeResult = await upsertModule.upsertOfficialEvents(client, accepted, {
      runStartedAt,
      batchSize: 50,
    });
  }

  if (args.outputPath) {
    report.outputPath = await writeReviewFile(args.outputPath, report);
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

run().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({ error: errorReport(error) }, null, 2)}\n\n${usage()}\n`);
  process.exitCode = 1;
});
