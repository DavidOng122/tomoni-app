import { createClient } from '@/infrastructure/auth/client';

export const uploadAvatar = async (userId: string, file: File): Promise<string> => {
  const supabase = createClient();
  const filePath = `${userId}/avatar`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    throw new Error(`Failed to upload avatar: ${uploadError.message}`);
  }

  // Get the public URL for the newly uploaded avatar
  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

  return data.publicUrl;
};

export const getAvatarPublicUrl = (userId: string): string => {
  const supabase = createClient();
  const { data } = supabase.storage.from('avatars').getPublicUrl(`${userId}/avatar`);
  return data.publicUrl;
};
