import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { detectOfficialEventIdentityDuplicates } from "../../src/features/events/domain/detectOfficialEventIdentityDuplicates.ts";
import { normalizeEdogawaFleaMarketRow } from "../../src/features/events/domain/normalizeEdogawaFleaMarketSchedule.ts";
import { fetchEdogawaFleaMarketSchedule } from "../../src/infrastructure/open-data/edogawa/fetchEdogawaFleaMarketSchedule.ts";

function option(argv: string[], name: string): string | null {
  const index = argv.indexOf(name);
  if (index < 0) return null;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

async function run(): Promise<void> {
  const argv = process.argv.slice(2);
  const write = argv.includes("--write");
  if (write && argv.includes("--dry-run")) throw new Error("--write and --dry-run are mutually exclusive.");
  const outputPath = option(argv, "--output");
  const runStartedAt = new Date();
  const schedule = await fetchEdogawaFleaMarketSchedule({ signal: AbortSignal.timeout(30_000) });
  const results = schedule.rows.map((row) => normalizeEdogawaFleaMarketRow(schedule, row, { now: runStartedAt }));
  const initiallyAccepted = results.flatMap((result) => result.kind === "accepted" ? [result.event] : []);
  const skipped = results.filter((result) => result.kind === "skipped");
  const identities = detectOfficialEventIdentityDuplicates(initiallyAccepted);
  const report: Record<string, unknown> = {
    mode: write ? "write" : "dry-run",
    sourceDatasetId: "edogawa_flea_market_schedule",
    runStartedAt: runStartedAt.toISOString(),
    counts: {
      discovered: schedule.rows.length,
      accepted: identities.unique.length,
      skipped: skipped.length,
      duplicate: identities.duplicateCount,
      parseErrors: 0,
    },
    accepted: identities.unique,
    skipped,
    duplicates: identities.duplicates,
  };

  if (write) {
    if (identities.duplicateCount > 0) throw new Error("Duplicate source identities detected; write aborted.");
    const [{ createServiceRoleClient }, { upsertOfficialEvents }] = await Promise.all([
      import("../../src/infrastructure/supabase/createServiceRoleClient.ts"),
      import("../../src/infrastructure/events/upsertOfficialEvents.ts"),
    ]);
    report.writeResult = await upsertOfficialEvents(createServiceRoleClient(), identities.unique, { runStartedAt });
  }

  if (outputPath) {
    const absolutePath = resolve(outputPath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    report.outputPath = absolutePath;
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

run().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2)}\n`);
  process.exitCode = 1;
});
