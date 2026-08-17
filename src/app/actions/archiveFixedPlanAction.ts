'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/infrastructure/auth/server';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function archiveFixedPlanAction(fixedPlanId: string) {
  if (!uuidPattern.test(fixedPlanId)) {
    throw new Error('固定予定が見つかりません');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('認証エラー: ログインし直してください。');
  }

  const { error } = await supabase.rpc('archive_fixed_plan', {
    p_fixed_plan_id: fixedPlanId,
  });

  if (error) {
    throw new Error('固定予定の削除に失敗しました');
  }

  revalidatePath('/mypage');
  revalidatePath('/discover');
  revalidatePath('/connections');
}
