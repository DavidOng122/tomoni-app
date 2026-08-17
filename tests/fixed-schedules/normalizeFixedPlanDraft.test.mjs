import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeFixedPlanDraft } from '../../src/features/fixed-schedules/domain/normalizeFixedPlanDraft.ts';

const validDraft = {
  activityType: 'walking',
  customActivityName: null,
  daysOfWeek: ['tue', 'thu'],
  startTime: '09:00',
  place: {
    placeId: 'google-place',
    placeName: ' 行船公園 ',
    latitude: 35.6746,
    longitude: 139.8591,
  },
};

test('normalizes a fixed plan for both create and edit actions', () => {
  assert.deepEqual(normalizeFixedPlanDraft(validDraft), {
    activity_type: 'walking',
    custom_activity_name: null,
    days_of_week: ['tue', 'thu'],
    start_time: '09:00:00',
    place_id: 'google-place',
    place_name: '行船公園',
    latitude: 35.6746,
    longitude: 139.8591,
  });
});

test('rejects an invalid clock time during edit', () => {
  assert.throws(
    () => normalizeFixedPlanDraft({ ...validDraft, startTime: '29:00' }),
    /開始時間が無効です/,
  );
});
