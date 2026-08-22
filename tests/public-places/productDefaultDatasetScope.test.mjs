import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const importer = await readFile(
  new URL('../../scripts/open-data/importEdogawaPublicPlaces.ts', import.meta.url),
  'utf8',
);

test('the product all dataset keeps only parks, libraries, sports facilities, and approved destinations', () => {
  const run = importer.slice(importer.indexOf('async function run()'));

  assert.match(run, /args\.dataset === "sports" \|\| args\.dataset === "all"/);
  assert.match(run, /args\.dataset === "libraries" \|\| args\.dataset === "all"/);
  assert.match(run, /args\.dataset === "parks" \|\| args\.dataset === "walking" \|\| args\.dataset === "all"/);
  assert.match(run, /args\.dataset === "destinations" \|\| args\.dataset === "all"/);
  assert.doesNotMatch(run, /args\.dataset === "waterfront-parks" \|\| args\.dataset === "all"/);
  assert.doesNotMatch(run, /args\.dataset === "waterfront-greenways" \|\| args\.dataset === "all"/);
  assert.doesNotMatch(run, /args\.dataset === "cultural" \|\| args\.dataset === "all"/);
});
