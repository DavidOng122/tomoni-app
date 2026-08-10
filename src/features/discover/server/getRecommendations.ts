import { createClient } from '@/infrastructure/auth/server';
import { DiscoverRecommendation } from '../types';

export async function getRecommendations(planId: string | null = null): Promise<DiscoverRecommendation[]> {
  const supabase = await createClient();

  // Call the new RPC
  const { data, error } = await supabase.rpc('get_discover_recommendations', {
    p_my_plan_id: planId ?? undefined
  });

  if (error) {
    console.error('Error fetching recommendations:', error);
    throw new Error('Failed to fetch recommendations');
  }

  // The RPC returns jsonb which maps directly to DiscoverRecommendation[]
  return data as unknown as DiscoverRecommendation[];
}
