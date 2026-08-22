import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { detectPublicPlaceIdentityDuplicates } from '../../src/features/public-places/domain/detectPublicPlaceIdentityDuplicates.ts';
import { matchEdogawaLibrarySources, matchEdogawaSportsSources } from '../../src/features/public-places/domain/matchEdogawaPublicPlaceSources.ts';
import { classifyEdogawaRecreationDestination, normalizeEdogawaCulturalFacility, normalizeEdogawaLibrary, normalizeEdogawaRecreationDestination, normalizeEdogawaSportsFacility } from '../../src/features/public-places/domain/normalizeEdogawaPublicPlace.ts';
import {
  consolidateEdogawaWalkingPlaceSources,
  normalizeEdogawaWalkingPlace,
} from '../../src/features/public-places/domain/normalizeEdogawaWalkingPlace.ts';
import { validateNormalizedPublicPlace } from '../../src/features/public-places/domain/validateNormalizedPublicPlace.ts';
import { parseEdogawaLibraryMapCsv, parseEdogawaLibraryStandardCsv } from '../../src/infrastructure/open-data/edogawa/parseEdogawaLibraries.ts';
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

async function sources() {
  return {
    sportsMap: parseEdogawaSportsMapCsv(await bytes('sports-map.csv'), 'utf-8'),
    sportsStandard: parseEdogawaSportsStandardCsv(await bytes('sports-standard.csv')),
    libraryMap: parseEdogawaLibraryMapCsv(await bytes('library-map.csv'), 'utf-8'),
    libraryStandard: parseEdogawaLibraryStandardCsv(await bytes('library-standard.csv')),
  };
}

test('matches sports exact names and reviewed aliases without fuzzy matching', async () => {
  const parsed = await sources();
  const result = matchEdogawaSportsSources(parsed.sportsMap.places, parsed.sportsStandard.places);

  assert.equal(result.matched.length, 2);
  assert.deepEqual(result.matched.map((item) => item.matchKind), ['exact_name', 'reviewed_alias']);
  assert.equal(result.ambiguousMapRows.length, 0);
});

test('matches formal libraries one-to-one and excludes satellite records', async () => {
  const parsed = await sources();
  const result = matchEdogawaLibrarySources(parsed.libraryMap.places, parsed.libraryStandard.places);

  assert.equal(result.matched.length, 2);
  assert.equal(result.excludedMapRows.length, 1);
  assert.equal(result.unmatchedStandardRows.length, 0);
  assert.deepEqual(result.matched.map((item) => item.matchKind), ['exact_name', 'reviewed_alias']);
});

test('normalizes sports page identity, map coordinates, hours and attributes', async () => {
  const parsed = await sources();
  const match = matchEdogawaSportsSources(parsed.sportsMap.places, parsed.sportsStandard.places).matched[0];
  const result = validateNormalizedPublicPlace(normalizeEdogawaSportsFacility(match, {
    sourceUrl: match.map.officialUrl,
    pageId: '1427',
  }));

  assert.equal(result.kind, 'accepted');
  assert.equal(result.place.sourcePlaceId, '1427');
  assert.equal(result.place.latitude, 35.7101);
  assert.equal(result.place.openTime, '09:00:00');
  assert.equal(result.place.attributes.accessibility.wheelchair_accessible, true);
  assert.equal(result.place.attributes.sports.activities.includes('tennis'), true);
});

test('normalizes formal library URL path as identity', async () => {
  const parsed = await sources();
  const match = matchEdogawaLibrarySources(parsed.libraryMap.places, parsed.libraryStandard.places).matched[0];
  const result = validateNormalizedPublicPlace(normalizeEdogawaLibrary(match));

  assert.equal(result.kind, 'accepted');
  assert.equal(result.place.sourcePlaceId, '/toshow/introduction/html/edg_chuo.php');
  assert.equal(result.place.name, '江戸川区立中央図書館');
  assert.equal(result.place.attributes.amenities.free_wifi, true);
});

test('normalizes a cultural facility with stable URL identity and image attributes', async () => {
  const source = parseEdogawaCulturalFacilitiesCsv(
    await bytes('cultural-facilities.csv'),
    'utf-8',
  ).places[0];
  const result = validateNormalizedPublicPlace(normalizeEdogawaCulturalFacility(source));

  assert.equal(result.kind, 'accepted');
  assert.equal(result.place.category, 'cultural_facility');
  assert.equal(result.place.sourcePlaceId, '/e026/kuseijoho/gaiyo/shisetsuguide/bunya/bunkachiiki/culture_plaza/index.html');
  assert.equal(result.place.attributes.media.image_url, 'https://example.test/shinozaki.jpg');
  assert.equal(result.place.hoursNote, '営業時間は公式ページでご確認ください');
});

test('keeps only exhibition-oriented culture data in the recommendation category', async () => {
  const places = parseEdogawaCulturalFacilitiesCsv(
    await bytes('cultural-facilities.csv'),
    'utf-8',
  ).places;
  assert.equal(normalizeEdogawaCulturalFacility(places[0]).category, 'cultural_facility');
  assert.equal(normalizeEdogawaCulturalFacility(places[1]).category, 'community_facility');
  assert.equal(
    validateNormalizedPublicPlace(normalizeEdogawaCulturalFacility(places[1])).reason,
    'unsupported_record',
  );
});

test('curates aquarium, zoo, museum, and cinema from recreation Open Data', async () => {
  const places = parseEdogawaRecreationDestinationsCsv(
    await bytes('recreation-destinations.csv'),
    'utf-8',
  ).places;
  assert.deepEqual(places.map((place) => classifyEdogawaRecreationDestination(place.name)), [
    'aquarium', 'zoo', 'museum', 'cinema', null,
  ]);
  const type = classifyEdogawaRecreationDestination(places[1].name);
  assert.equal(type, 'zoo');
  const result = validateNormalizedPublicPlace(normalizeEdogawaRecreationDestination(places[1], type));
  assert.equal(result.kind, 'accepted');
  assert.equal(result.place.category, 'cultural_facility');
  assert.equal(result.place.attributes.cultural_facility.facility_type, 'zoo');
  assert.equal(result.place.attributes.media.image_url, 'https://example.test/zoo.jpg');
});

test('fills missing destination photos from deterministic official-page images', async () => {
  const places = parseEdogawaRecreationDestinationsCsv(
    await bytes('recreation-destinations.csv'),
    'utf-8',
  ).places;
  const museum = places.find((place) => place.name === '地下鉄博物館');
  const cinema = places.find((place) => place.name === '船堀シネパル');

  assert.equal(
    normalizeEdogawaRecreationDestination(museum, 'museum').attributes.media.image_url,
    'https://www.chikahaku.jp/images/mv/mv01a_lg.jpg',
  );
  assert.equal(
    normalizeEdogawaRecreationDestination(cinema, 'cinema').attributes.media.image_url,
    'https://www.city.edogawa.tokyo.jp/images/42805/095.jpg',
  );
});

test('validates missing, malformed, swapped and outside-area coordinates deterministically', async () => {
  const parsed = await sources();
  const match = matchEdogawaSportsSources(parsed.sportsMap.places, parsed.sportsStandard.places).matched[0];
  const base = normalizeEdogawaSportsFacility(match, { sourceUrl: match.map.officialUrl, pageId: '1427' });

  assert.equal(validateNormalizedPublicPlace({ ...base, sourcePlaceId: null }).reason, 'missing_source_place_id');
  assert.equal(validateNormalizedPublicPlace({ ...base, name: null }).reason, 'missing_name');
  assert.equal(validateNormalizedPublicPlace({ ...base, latitude: null }).reason, 'missing_coordinates');
  assert.equal(validateNormalizedPublicPlace({ ...base, latitudeIssue: 'invalid' }).reason, 'invalid_latitude');
  assert.equal(validateNormalizedPublicPlace({ ...base, longitudeIssue: 'invalid' }).reason, 'invalid_longitude');
  assert.equal(validateNormalizedPublicPlace({ ...base, coordinateAreaIssue: true }).reason, 'coordinates_outside_dataset_area');
});

test('detects duplicate identity records separately from skipped records', async () => {
  const parsed = await sources();
  const match = matchEdogawaSportsSources(parsed.sportsMap.places, parsed.sportsStandard.places).matched[0];
  const accepted = validateNormalizedPublicPlace(normalizeEdogawaSportsFacility(match, {
    sourceUrl: match.map.officialUrl,
    pageId: '1427',
  }));
  assert.equal(accepted.kind, 'accepted');

  const result = detectPublicPlaceIdentityDuplicates([accepted.place, { ...accepted.place }]);
  assert.equal(result.unique.length, 0);
  assert.equal(result.duplicateCount, 2);
});

test('normalizes walking datasets with deterministic identities and representative official coordinates', async () => {
  const park = parseEdogawaParkCsv(await bytes('parks.csv'), 'utf-8').places[0];
  const waterfrontPark = parseEdogawaWaterfrontParkCsv(await bytes('waterfront-parks.csv'), 'utf-8').places[0];
  const greenway = parseEdogawaWaterfrontGreenwayCsv(await bytes('waterfront-greenways.csv'), 'utf-8').places[0];

  const normalizedPark = validateNormalizedPublicPlace(
    normalizeEdogawaWalkingPlace(park, 'parks', 'https://example.test/parks.csv'),
  );
  const normalizedWaterfrontPark = validateNormalizedPublicPlace(
    normalizeEdogawaWalkingPlace(waterfrontPark, 'waterfront_parks', 'https://example.test/waterfront-parks.csv'),
  );
  const normalizedGreenway = validateNormalizedPublicPlace(
    normalizeEdogawaWalkingPlace(greenway, 'waterfront_greenways', 'https://example.test/greenways.csv'),
  );

  assert.equal(normalizedPark.kind, 'accepted');
  assert.equal(normalizedPark.place.category, 'park');
  assert.equal(normalizedPark.place.sourcePlaceId, 'name_address_v1:%E4%BB%B2%E7%94%BA%E5%85%AC%E5%9C%92|%E6%B1%9F%E6%88%B8%E5%B7%9D%E5%8C%BA%E6%9D%B1%E8%91%9B%E8%A5%BF6%E4%B8%81%E7%9B%AE12%E7%95%AA1%E5%8F%B7');
  assert.equal(normalizedPark.place.latitude, (35.6609 + 35.6605 + 35.6609) / 3);
  assert.equal(normalizedPark.place.attributes.walking_place.source_vertex_count, 3);
  assert.equal(normalizedPark.place.attributes.walking_place.large_park_candidate, false);
  assert.equal(normalizedPark.place.attributes.walking_place.large_park_min_area_square_meters, 10_000);
  assert.equal(normalizedWaterfrontPark.kind, 'accepted');
  assert.equal(normalizedWaterfrontPark.place.category, 'waterfront_park');
  assert.equal(normalizedGreenway.kind, 'accepted');
  assert.equal(normalizedGreenway.place.category, 'waterfront_greenway');
});

test('marks only parks with at least 10,000 square metres of official boundary area as large candidates', () => {
  const result = validateNormalizedPublicPlace(normalizeEdogawaWalkingPlace({
    recordNumber: 1,
    name: '大型テスト公園',
    description: null,
    address: '江戸川区テスト1丁目',
    officialUrl: null,
    imageUrls: [],
    latitudeText: '35.6000:35.6000:35.6010:35.6010',
    longitudeText: '139.8000:139.8012:139.8012:139.8000',
  }, 'parks', 'https://example.test/parks.csv'));

  assert.equal(result.kind, 'accepted');
  assert.ok(result.place.attributes.walking_place.area_square_meters >= 10_000);
  assert.equal(result.place.attributes.walking_place.large_park_candidate, true);
});

test('walking-place normalization skips malformed and mismatched source coordinates', async () => {
  const parsed = parseEdogawaParkCsv(await bytes('parks.csv'), 'utf-8');
  const malformed = parsed.places[1];
  const valid = parsed.places[0];

  assert.equal(
    validateNormalizedPublicPlace(
      normalizeEdogawaWalkingPlace(malformed, 'parks', 'https://example.test/parks.csv'),
    ).reason,
    'invalid_latitude',
  );
  assert.equal(
    validateNormalizedPublicPlace(
      normalizeEdogawaWalkingPlace(
        { ...valid, longitudeText: '139.8750:139.8760' },
        'parks',
        'https://example.test/parks.csv',
      ),
    ).reason,
    'invalid_latitude',
  );
});

test('consolidates multipart source rows before identity duplicate detection', async () => {
  const source = parseEdogawaParkCsv(await bytes('parks.csv'), 'utf-8').places[0];
  const consolidated = consolidateEdogawaWalkingPlaceSources([
    source,
    {
      ...source,
      recordNumber: 99,
      imageUrls: ['https://example.test/another.jpg'],
      latitudeText: '35.6610',
      longitudeText: '139.8755',
    },
  ]);

  assert.equal(consolidated.length, 1);
  assert.equal(consolidated[0].latitudeText, `${source.latitudeText}|35.6610`);
  assert.equal(consolidated[0].imageUrls.length, 3);
});

test('uses a name-only stable identity when the official source has no address', () => {
  const result = validateNormalizedPublicPlace(normalizeEdogawaWalkingPlace({
    recordNumber: 1,
    name: '新川千本桜',
    description: null,
    address: null,
    officialUrl: null,
    imageUrls: [],
    latitudeText: '35.68',
    longitudeText: '139.86',
  }, 'parks', 'https://example.test/parks.csv'));

  assert.equal(result.kind, 'accepted');
  assert.equal(result.place.sourcePlaceId, 'name_v1:%E6%96%B0%E5%B7%9D%E5%8D%83%E6%9C%AC%E6%A1%9C');
  assert.equal(result.place.address, null);
});
