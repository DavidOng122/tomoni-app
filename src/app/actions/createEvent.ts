'use server';

import { createClient } from '@/infrastructure/auth/server';
import { toTotalEventCapacity } from '@/features/events/domain/toTotalEventCapacity';
import { revalidatePath } from 'next/cache';

export async function createEventAction(formData: FormData) {
  const supabase = await createClient();

  const title = formData.get('title') as string;
  const startAtLocal = formData.get('startAt') as string; // YYYY-MM-DDTHH:mm
  const endAtLocal = formData.get('endAt') as string;
  const placeId = formData.get('placeId') as string | undefined;
  const placeName = formData.get('placeName') as string;
  const address = formData.get('address') as string | undefined;
  const latitudeStr = formData.get('latitude') as string | undefined;
  const longitudeStr = formData.get('longitude') as string | undefined;
  const latitude = latitudeStr ? parseFloat(latitudeStr) : undefined;
  const longitude = longitudeStr ? parseFloat(longitudeStr) : undefined;
  const description = formData.get('description') as string | undefined;
  const approvalRequired = formData.get('approvalRequired') === 'true';
  const recruitingCountStr = formData.get('recruitingCount') as string | undefined;
  const recruitingCount = recruitingCountStr ? parseInt(recruitingCountStr, 10) : undefined;
  let totalCapacity: number | null;
  try {
    totalCapacity = toTotalEventCapacity(recruitingCount);
  } catch {
    return { success: false, error: '募集人数は1人以上で入力してください' };
  }
  const posterFile = formData.get('poster') as File | null;

  // Timezone conversion (+09:00 for Asia/Tokyo)
  // Ensure we have seconds in the string before appending timezone
  const startAt = `${startAtLocal}:00+09:00`;
  const endAt = `${endAtLocal}:00+09:00`;

  // 1. Create the event using RPC
  const { data: eventId, error: createError } = await supabase.rpc('create_user_event', {
    p_title: title,
    p_start_at: startAt,
    p_end_at: endAt,
    p_place_id: placeId,
    p_place_name: placeName,
    p_address: address,
    p_latitude: latitude,
    p_longitude: longitude,
    p_description: description,
    p_approval_required: approvalRequired,
    p_capacity: totalCapacity ?? undefined
  });

  if (createError || !eventId) {
    console.error('Event creation failed:', createError);
    return { success: false, error: 'イベントの作成に失敗しました' };
  }

  // 2. Upload poster if present
  let posterWarning = null;
  if (posterFile && posterFile.size > 0) {
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id;
    
    if (uid) {
      const ext = posterFile.name.split('.').pop() || 'jpg';
      const filename = `${uid}/${eventId}/poster-${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('event-posters')
        .upload(filename, posterFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Poster upload failed:', uploadError);
        posterWarning = '画像のアップロードに失敗しましたが、イベントは作成されました。';
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('event-posters')
          .getPublicUrl(filename);
          
        if (publicUrlData?.publicUrl) {
          const { error: updateError } = await supabase.rpc('set_user_event_poster', {
            p_event_id: eventId,
            p_poster_url: publicUrlData.publicUrl
          });
          
          if (updateError) {
            console.error('Failed to set poster URL:', updateError);
            posterWarning = '画像の保存に失敗しましたが、イベントは作成されました。';
          }
        }
      }
    } else {
      posterWarning = '画像のアップロードに失敗しましたが、イベントは作成されました。';
    }
  }

  revalidatePath('/discover');
  
  return { 
    success: true, 
    eventId: eventId as string,
    warning: posterWarning
  };
}
