import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyOfficialEventRecommendationTags } from '../../src/features/events/domain/classifyOfficialEventRecommendationTags.ts';
import { filterOfficialEventCatalogEntry } from '../../src/features/events/domain/filterOfficialEventCatalogEntry.ts';

test('classifies only exhibition, film, and music destinations deterministically', () => {
  const cases = [
    ['区民美術展覧会', 'art_exhibition'],
    ['名作映画上映会', 'film'],
    ['室内楽コンサート', 'music_performance'],
  ];

  for (const [title, expected] of cases) {
    assert.ok(classifyOfficialEventRecommendationTags({ title, description: null }).includes(expected));
  }
});

test('returns no recommendation category for unapproved or explicitly excluded content', () => {
  assert.deepEqual(classifyOfficialEventRecommendationTags({ title: '行政手続きのお知らせ', description: null }), []);
  assert.deepEqual(classifyOfficialEventRecommendationTags({ title: '小学生対象 文化体験', description: null }), []);
  assert.deepEqual(classifyOfficialEventRecommendationTags({ title: '認知症サポーター養成講座', description: null }), []);
  assert.deepEqual(classifyOfficialEventRecommendationTags({ title: '地域まつり フリーマーケット', description: null }), []);
  assert.deepEqual(classifyOfficialEventRecommendationTags({ title: '伝統工芸ワークショップ', description: null }), []);
});

test('keeps only approved recommendation categories in the imported official Event catalog', () => {
  const base = {
    kind: 'accepted',
    warnings: [],
    event: {
      officialUrl: 'https://example.test/event',
      recommendationTags: [],
    },
  };

  const skipped = filterOfficialEventCatalogEntry(base);
  const accepted = filterOfficialEventCatalogEntry({
    ...base,
    event: { ...base.event, recommendationTags: ['music_performance'] },
  });

  assert.equal(skipped.kind, 'skipped');
  assert.equal(skipped.reason, 'unsupported_recommendation_category');
  assert.equal(accepted.kind, 'accepted');
});
