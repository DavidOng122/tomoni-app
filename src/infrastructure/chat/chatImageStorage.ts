import { createClient } from '@/infrastructure/auth/client';
import { validateChatImageFile } from '@/features/chat/domain/validateChatImageFile';

const CHAT_IMAGES_BUCKET = 'chat-images';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export class ChatImageUploadError extends Error {
  constructor(public readonly code: 'empty_file' | 'file_too_large' | 'unsupported_type' | 'upload_failed') {
    super(code);
    this.name = 'ChatImageUploadError';
  }
}

export async function uploadChatImage({
  conversationId,
  userId,
  file,
}: {
  conversationId: string;
  userId: string;
  file: File;
}): Promise<string> {
  const validation = validateChatImageFile(file);
  if (!validation.valid) {
    throw new ChatImageUploadError(validation.reason);
  }

  const storagePath = `${userId}/${conversationId}/${crypto.randomUUID()}.${validation.extension}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from(CHAT_IMAGES_BUCKET).upload(storagePath, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new ChatImageUploadError('upload_failed');
  }

  return storagePath;
}

export async function deleteChatImage(storagePath: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(CHAT_IMAGES_BUCKET).remove([storagePath]);
}

export async function createChatImageSignedUrl(storagePath: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(CHAT_IMAGES_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error('chat_image_signed_url_failed');
  }

  return data.signedUrl;
}
