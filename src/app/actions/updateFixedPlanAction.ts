'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/infrastructure/auth/server';
import type { FixedPlanDraft } from '@/features/fixed-schedules/types';
import { normalizeFixedPlanDraft } from '@/features/fixed-schedules/domain/normalizeFixedPlanDraft';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function updateFixedPlanAction(
  fixedPlanId: string,
  draft: Omit<FixedPlanDraft, 'clientId'>,
) {
  if (!uuidPattern.test(fixedPlanId)) {
    throw new Error('固定予定が見つかりません');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('認証エラー: ログインし直してください。');
  }

  const normalizedDraft = normalizeFixedPlanDraft(draft);
  const { data, error } = await supabase
    .from('fixed_plans')
    .update({
      ...normalizedDraft,
      updated_at: new Date().toISOString(),
    })
    .eq('fixed_plan_id', fixedPlanId)
    .eq('user_id', user.id)
    .neq('plan_status', 'deleted')
    .select('fixed_plan_id')
    .maybeSingle();

  if (error || !data) {
    throw new Error('固定予定の更新に失敗しました');
  }

  revalidatePath('/mypage');
  revalidatePath('/discover');
}
