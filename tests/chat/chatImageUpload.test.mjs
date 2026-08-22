import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CHAT_IMAGE_MAX_BYTES,
  validateChatImageFile,
} from '../../src/features/chat/domain/validateChatImageFile.ts';

const composer = await readFile(
  new URL('../../src/features/chat/components/ChatComposer.tsx', import.meta.url),
  'utf8',
);
const chatMessage = await readFile(
  new URL('../../src/features/chat/components/ChatMessage.tsx', import.meta.url),
  'utf8',
);
const migration = await readFile(
  new URL('../../supabase/migrations/20260821040000_add_chat_image_messages.sql', import.meta.url),
  'utf8',
);

test('accepts supported chat images and returns a deterministic extension', () => {
  assert.deepEqual(validateChatImageFile({ size: 10, type: 'image/jpeg' }), {
    valid: true,
    extension: 'jpg',
  });
  assert.deepEqual(validateChatImageFile({ size: 10, type: 'image/png' }), {
    valid: true,
    extension: 'png',
  });
});

test('rejects empty, oversized, and unsupported chat image files', () => {
  assert.deepEqual(validateChatImageFile({ size: 0, type: 'image/jpeg' }), {
    valid: false,
    reason: 'empty_file',
  });
  assert.deepEqual(validateChatImageFile({ size: CHAT_IMAGE_MAX_BYTES + 1, type: 'image/jpeg' }), {
    valid: false,
    reason: 'file_too_large',
  });
  assert.deepEqual(validateChatImageFile({ size: 10, type: 'image/heic' }), {
    valid: false,
    reason: 'unsupported_type',
  });
});

test('offers separate native camera and photo-library inputs', () => {
  assert.match(composer, /aria-label="写真を追加"/);
  assert.match(composer, /capture="environment"/);
  assert.match(composer, />\s*カメラ\s*<\/button>/);
  assert.match(composer, />\s*写真\s*<\/button>/);
  assert.match(composer, /onSendImage\(file\)/);
});

test('renders image messages through a private signed URL component', () => {
  assert.match(chatMessage, /messageType === 'image'/);
  assert.match(chatMessage, /<ChatImage storagePath=\{content\} \/>/);
});

test('migration keeps chat images private and binds writes to sender and conversation', () => {
  assert.match(migration, /'chat-images',[\s\S]*false,[\s\S]*10485760/);
  assert.match(migration, /message_type in \('text', 'system', 'image'\)/);
  assert.match(migration, /public\.is_active_conversation_member\(\(storage\.foldername\(name\)\)\[2\]\)/);
  assert.match(migration, /\(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/);
  assert.match(migration, /content like auth\.uid\(\)::text \|\| '\/' \|\| conversation_id::text/);
});
