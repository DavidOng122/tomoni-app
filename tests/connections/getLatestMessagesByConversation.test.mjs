import assert from 'node:assert/strict';
import test from 'node:test';

import { getLatestMessagesByConversation } from '../../src/features/connections/domain/getLatestMessagesByConversation.ts';

test('keeps the first message for each conversation when rows are newest first', () => {
  const latest = getLatestMessagesByConversation([
    { conversation_id: 'julia', content: 'new', created_at: '2026-08-17T10:00:00Z' },
    { conversation_id: 'sora', content: 'hello', created_at: '2026-08-17T09:00:00Z' },
    { conversation_id: 'julia', content: 'old', created_at: '2026-08-16T10:00:00Z' },
  ]);

  assert.deepEqual(latest.get('julia'), {
    content: 'new',
    created_at: '2026-08-17T10:00:00Z',
  });
  assert.equal(latest.get('sora')?.content, 'hello');
});

test('ignores messages without text content', () => {
  const latest = getLatestMessagesByConversation([
    { conversation_id: 'ken', content: null, created_at: '2026-08-17T10:00:00Z' },
  ]);

  assert.equal(latest.has('ken'), false);
});
