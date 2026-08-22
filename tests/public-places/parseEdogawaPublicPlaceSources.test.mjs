import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parseEdogawaSportsFacilityPageIdentity } from '../../src/infrastructure/open-data/edogawa/fetchEdogawaSportsFacilityPageIdentity.ts';
import { parseEdogawaLibraryMapCsv, parseEdogawaLibraryStandardCsv } from '../../src/infrastructure/open-data/edogawa/parseEdogawaLibraries.ts';
import { decodeCsvBytes, parseCsvRecords } from '../../src/infrastructure/open-data/edogawa/parseCsvRecords.ts';
import { parseEdogawaSportsMapCsv, parseEdogawaSportsStandardCsv } from '../../src/infrastructure/open-data/edogawa/parseEdogawaSportsFacilities.ts';
import { parseEdogawaCulturalFacilitiesCsv } from '../../src/infrastructure/open-data/edogawa/parseEdogawaCulturalFacilities.ts';
import { parseEdogawaRecreationDestinationsCsv } from '../../src/infrastructure/open-data/edogawa/parseEdogawaRecreationDestinations.ts';
import {
  parseEdogawaParkCsv,
  parseEdogawaWaterfrontGreenwayCsv,
  parseEdogawaWaterfrontParkCsv,
} from '../../src/infrastructure/open-data/edogawa/parseEdogawaWalkingPlaces.ts';

const fixtures = new URL('../fixtures/edogawa-public-places/', import.meta.url);
const bytes = async (name) => new Uint8Array(await readFile(new URL(name, fixtures)));

test('Node runtime decodes Shift-JIS Japanese headers', () => {
  assert.equal(decodeCsvBytes(Uint8Array.of(0x96, 0xbc, 0x8f, 0xcc), 'shift_jis'), '名称');
});

test('parses standard sports CSV with BOM-safe quoted comma and newline handling', async () => {
  const source = await bytes('sports-standard.csv');
  const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...source]);
  const parsed = parseEdogawaSportsStandardCsv(withBom);

  assert.equal(parsed.places.length, 2);
  assert.match(parsed.places[0].row['説明'], /\n/u);
  assert.equal(parsed.places[1].row['説明'], '球場, 観客席');
  assert.deepEqual(parsed.unknownHeaders, []);
});

test('parses sanitized map and library CSV fixtures', async () => {
  const sports = parseEdogawaSportsMapCsv(await bytes('sports-map.csv'), 'utf-8');
  const libraryMap = parseEdogawaLibraryMapCsv(await bytes('library-map.csv'), 'utf-8');
  const libraryStandard = parseEdogawaLibraryStandardCsv(await bytes('library-standard.csv'));

  assert.equal(sports.places[0].latitudeText, '35.7101000');
  assert.equal(libraryMap.places.length, 3);
  assert.equal(libraryStandard.places[0].name, '江戸川区立中央図書館');
});

test('parses cultural facilities with media, coordinates, and semantic headers', async () => {
  const parsed = parseEdogawaCulturalFacilitiesCsv(
    await bytes('cultural-facilities.csv'),
    'utf-8',
  );

  assert.equal(parsed.places.length, 2);
  assert.equal(parsed.places[0].name, '篠崎文化プラザ');
  assert.equal(parsed.places[0].imageUrl, 'https://example.test/shinozaki.jpg');
  assert.equal(parsed.places[0].latitudeText, '35.7069000');
  assert.deepEqual(parsed.unknownHeaders, []);
});

test('cultural facility parser rejects missing and unexpected headers', () => {
  const invalid = new TextEncoder().encode('名称,所在地,URL,緯度,未知項目\n施設,住所,https://example.test,35.7,value\n');
  assert.throws(
    () => parseEdogawaCulturalFacilitiesCsv(invalid, 'utf-8'),
    /Missing required CSV headers/u,
  );
});

test('parses official recreation destinations including zoo and museum media', async () => {
  const parsed = parseEdogawaRecreationDestinationsCsv(
    await bytes('recreation-destinations.csv'),
    'utf-8',
  );
  assert.equal(parsed.places.length, 5);
  assert.equal(parsed.places[0].name, '葛西臨海水族園');
  assert.equal(parsed.places[1].imageUrl, 'http://example.test/zoo.jpg');
  assert.equal(parsed.places[2].name, '地下鉄博物館');
  assert.deepEqual(parsed.unknownHeaders, []);
});

test('parses official walking-place headers including duplicate park photo columns', async () => {
  const parks = parseEdogawaParkCsv(await bytes('parks.csv'), 'utf-8');
  const waterfrontParks = parseEdogawaWaterfrontParkCsv(await bytes('waterfront-parks.csv'), 'utf-8');
  const greenways = parseEdogawaWaterfrontGreenwayCsv(await bytes('waterfront-greenways.csv'), 'utf-8');

  assert.equal(parks.places.length, 2);
  assert.deepEqual(parks.places[0].imageUrls, [
    'https://example.test/nakamachi-1.jpg',
    'https://example.test/nakamachi-2.jpg',
  ]);
  assert.equal(waterfrontParks.places[0].description, '自然とのふれあいを味わえる親水公園 水遊び広場があります');
  assert.equal(greenways.places[0].name, '下小岩親水緑道');
});

test('walking-place parser rejects unexpected source headers', () => {
  assert.throws(
    () => parseEdogawaParkCsv(new TextEncoder().encode('名称,所在地,緯度,経度\n公園,住所,35.7,139.8\n'), 'utf-8'),
    /Unexpected parks CSV headers/u,
  );
});

test('strict CSV parsing rejects missing and duplicate headers and reports unknown headers', () => {
  assert.throws(
    () => parseCsvRecords('名称,名称\na,b\n', { requiredHeaders: ['名称'], knownHeaders: ['名称'] }),
    /Duplicate CSV headers/u,
  );
  assert.throws(
    () => parseCsvRecords('名称\na\n', { requiredHeaders: ['名称', '緯度'], knownHeaders: ['名称', '緯度'] }),
    /Missing required CSV headers/u,
  );
  const parsed = parseCsvRecords('名称,新規項目\na,b\n', {
    requiredHeaders: ['名称'],
    knownHeaders: ['名称'],
  });
  assert.deepEqual(parsed.unknownHeaders, ['新規項目']);
});

test('extracts only the visible semantic page ID', async () => {
  const html = await readFile(new URL('sports-facility-page.html', fixtures), 'utf8');
  const missing = await readFile(new URL('sports-facility-page-missing-id.html', fixtures), 'utf8');

  assert.equal(parseEdogawaSportsFacilityPageIdentity(html, 'https://example.test').pageId, '1427');
  assert.equal(parseEdogawaSportsFacilityPageIdentity(missing, 'https://example.test').pageId, null);
});
