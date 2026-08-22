import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { normalizeFixedPlanDraft } from '../../src/features/fixed-schedules/domain/normalizeFixedPlanDraft.ts';

const validDraft = {
  activityType: 'walking',
  customActivityName: null,
  daysOfWeek: ['tue', 'thu'],
  startTime: '09:00',
  place: {
    placeId: '',
    placeName: ' 葛西 ',
    latitude: 0,
    longitude: 0,
  },
};

test('normalizes a fixed plan for both create and edit actions', () => {
  assert.deepEqual(normalizeFixedPlanDraft(validDraft), {
    activity_type: 'walking',
    custom_activity_name: null,
    days_of_week: ['tue', 'thu'],
    start_time: '09:00:00',
    place_id: null,
    place_name: '葛西',
    latitude: 35.6635,
    longitude: 139.8726,
  });
});

test('rejects an invalid clock time during edit', () => {
  assert.throws(
    () => normalizeFixedPlanDraft({ ...validDraft, startTime: '29:00' }),
    /開始時間が無効です/,
  );
});

test('normalizes an event plan without asking for a specific time', () => {
  const normalized = normalizeFixedPlanDraft({
    ...validDraft,
    activityType: 'event',
    daysOfWeek: ['sat'],
    startTime: '',
    place: {
      placeId: 'edogawa-area:koiwa',
      placeName: '小岩',
      latitude: 0,
      longitude: 0,
    },
  });

  assert.equal(normalized.start_time, '12:00:00');
  assert.deepEqual(normalized.days_of_week, ['sat']);
});

test('event Fixed Plan form does not render the time selector', async () => {
  const source = await readFile(
    new URL('../../src/features/fixed-schedules/components/FixedScheduleForm.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /draft\.activityType !== 'event' && \(/u);
  assert.match(source, /<StartTimeSelector/u);
});

test('rejects arbitrary Google Places and canonicalizes approved area coordinates', () => {
  assert.throws(
    () => normalizeFixedPlanDraft({
      ...validDraft,
      place: {
        placeId: 'google-place',
        placeName: '行船公園',
        latitude: 35.6746,
        longitude: 139.8591,
      },
    }),
    /江戸川区のエリアを選択してください/,
  );

  const normalized = normalizeFixedPlanDraft({
    ...validDraft,
    place: {
      placeId: 'spoofed-place-id',
      placeName: '葛西',
      latitude: 1,
      longitude: 1,
    },
  });

  assert.equal(normalized.place_id, null);
  assert.equal(normalized.latitude, 35.6635);
  assert.equal(normalized.longitude, 139.8726);
});
