export const CHAT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

const CHAT_IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export type ChatImageValidationResult =
  | { valid: true; extension: string }
  | { valid: false; reason: 'empty_file' | 'file_too_large' | 'unsupported_type' };

export function validateChatImageFile(file: Pick<File, 'size' | 'type'>): ChatImageValidationResult {
  if (file.size <= 0) {
    return { valid: false, reason: 'empty_file' };
  }

  if (file.size > CHAT_IMAGE_MAX_BYTES) {
    return { valid: false, reason: 'file_too_large' };
  }

  const extension = CHAT_IMAGE_EXTENSIONS[file.type.toLowerCase()];
  if (!extension) {
    return { valid: false, reason: 'unsupported_type' };
  }

  return { valid: true, extension };
}
