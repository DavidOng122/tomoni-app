import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  EDOGAWA_AREAS,
  getEdogawaAreaPlace,
  getSelectedEdogawaAreaName,
} from '../../src/features/locations/domain/edogawaAreas.ts';

const onboardingView = await readFile(
  new URL('../../src/features/fixed-schedules/components/FixedScheduleOnboardingView.tsx', import.meta.url),
  'utf8',
);
const addScheduleView = await readFile(
  new URL('../../src/app/mypage/schedule/add/AddScheduleView.tsx', import.meta.url),
  'utf8',
);
const editScheduleView = await readFile(
  new URL('../../src/app/mypage/schedule/[fixedPlanId]/edit/EditScheduleView.tsx', import.meta.url),
  'utf8',
);
const profileOnboardingView = await readFile(
  new URL('../../src/features/profiles/components/ProfileOnboardingView.tsx', import.meta.url),
  'utf8',
);

test('offers exactly the ten approved Edogawa onboarding areas', () => {
  assert.deepEqual(
    EDOGAWA_AREAS.map((area) => area.name),
    ['葛西', '西葛西', '船堀', '一之江', '瑞江', '篠崎', '小岩', '平井', '松江', '鹿骨'],
  );
});

test('maps every area to a display-only representative coordinate', () => {
  const coordinateKeys = new Set();

  for (const area of EDOGAWA_AREAS) {
    const place = getEdogawaAreaPlace(area.name);
    assert.ok(place);
    assert.equal(place.placeId, '');
    assert.equal(place.placeName, area.name);
    assert.ok(place.latitude >= 35.64 && place.latitude <= 35.75);
    assert.ok(place.longitude >= 139.83 && place.longitude <= 139.92);
    coordinateKeys.add(`${place.latitude},${place.longitude}`);
  }

  assert.equal(coordinateKeys.size, 10);
  assert.equal(getEdogawaAreaPlace('江戸川区外'), null);
});

test('recognizes only approved area selections', () => {
  assert.equal(getSelectedEdogawaAreaName(getEdogawaAreaPlace('葛西')), '葛西');
  assert.equal(getSelectedEdogawaAreaName({
    placeId: 'google-place',
    placeName: '行船公園',
    latitude: 35.6746,
    longitude: 139.8591,
  }), '');
});

test('uses the same ten broad areas for onboarding, add, and edit', () => {
  assert.match(onboardingView, /locationMode="edogawa-area"/);
  assert.match(addScheduleView, /locationMode="edogawa-area"/);
  assert.match(editScheduleView, /locationMode="edogawa-area"/);
  assert.match(addScheduleView, /isScheduleFormValid\(draft, 'edogawa-area'\)/);
  assert.match(editScheduleView, /isScheduleFormValid\(draft, 'edogawa-area'\)/);
  assert.match(profileOnboardingView, /normalizeFixedPlanDraft\(plan\)/);
});
