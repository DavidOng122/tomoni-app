import { createClient } from '@/infrastructure/auth/server';

export async function getAuthDestination(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return '/welcome';
  }

  const { data: userData, error } = await supabase
    .from('users')
    .select('onboarding_status')
    .eq('id', user.id)
    .single();

  if (error || !userData) {
    // If the user record isn't fully created yet or error occurs,
    // default to onboarding route safely.
    return '/onboarding/schedules';
  }

  if (userData.onboarding_status === 'completed') {
    return '/discover';
  }

  return '/onboarding/schedules';
}
