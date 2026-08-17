'use server';

import { createClient } from '@/infrastructure/auth/server';
import { FixedPlanDraft } from '@/features/fixed-schedules/types';
import { normalizeFixedPlanDraft } from '@/features/fixed-schedules/domain/normalizeFixedPlanDraft';

export async function createFixedPlanAction(draft: Omit<FixedPlanDraft, 'clientId'>) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('認証エラー: ログインし直してください。');
  }

  const normalizedDraft = normalizeFixedPlanDraft(draft);

  const { error: insertError } = await supabase.from('fixed_plans').insert({
    user_id: user.id,
    ...normalizedDraft,
    plan_status: 'active'
  });

  if (insertError) {
    console.error('Failed to insert fixed plan:', insertError);
    throw new Error('予定の保存に失敗しました');
  }
}
