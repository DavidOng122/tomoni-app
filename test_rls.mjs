import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'; // Using PUBLISHABLE_KEY which acts as ANON key here

async function run() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Create User A
  const emailA = `testA_${Date.now()}@example.com`;
  const { data: authA, error: errA } = await supabase.auth.signUp({
    email: emailA,
    password: 'password123'
  });
  if (errA) throw errA;
  const userA = authA.user;
  console.log('User A created:', userA.id);

  // Profile A will be implicitly missing unless we insert it.
  // Wait, the trigger handle_new_auth_user only inserts into `users`.
  // We need to insert into `profiles` and `fixed_plans` for User A.
  const { error: profErrA } = await supabase.from('profiles').insert({
    user_id: userA.id,
    nickname: 'User A',
    age_range: '18-24',
    gender: 'male',
    profile_status: 'active',
    avatar_url: ''
  });
  if (profErrA) throw profErrA;
  console.log('Profile A created');

  const { error: planErrA } = await supabase.from('fixed_plans').insert({
    user_id: userA.id,
    activity_type: 'walking',
    days_of_week: ['mon'],
    start_time: '10:00',
    place_name: 'Place A',
    latitude: 0,
    longitude: 0,
    plan_status: 'active'
  });
  if (planErrA) throw planErrA;
  console.log('Plan A created');

  // 2. Create User B
  await supabase.auth.signOut();
  
  const emailB = `testB_${Date.now()}@example.com`;
  const { data: authB, error: errB } = await supabase.auth.signUp({
    email: emailB,
    password: 'password123'
  });
  if (errB) throw errB;
  const userB = authB.user;
  console.log('User B created:', userB.id);

  const { error: profErrB } = await supabase.from('profiles').insert({
    user_id: userB.id,
    nickname: 'User B',
    age_range: '25-34',
    gender: 'female',
    profile_status: 'active',
    avatar_url: ''
  });
  if (profErrB) throw profErrB;
  console.log('Profile B created');

  const { error: planErrB } = await supabase.from('fixed_plans').insert({
    user_id: userB.id,
    activity_type: 'sports',
    days_of_week: ['fri'],
    start_time: '18:00',
    place_name: 'Place B',
    latitude: 0,
    longitude: 0,
    plan_status: 'active'
  });
  if (planErrB) throw planErrB;
  console.log('Plan B created');

  // 3. Test RLS Isolation (Currently authenticated as User B)
  console.log('\n--- RLS Verification as User B ---');
  
  // Try to read User B's profile
  const { data: bProfile, error: bProfErr } = await supabase.from('profiles').select('*').eq('user_id', userB.id);
  console.log('Read User B profile:', bProfErr ? bProfErr.message : bProfile.length > 0 ? 'SUCCESS' : 'FAILED');

  // Try to read User A's profile
  // Note: profiles_select_active policy allows anyone to read 'active' profiles!
  // wait, the migration says: create policy profiles_select_active on public.profiles for select to authenticated using (profile_status = 'active' or user_id = auth.uid());
  // So User B CAN read User A's profile if it's active. This is expected for a social app!
  // But Fixed Plans are isolated:
  // create policy fixed_plans_select_own on public.fixed_plans for select to authenticated using (user_id = auth.uid());
  
  const { data: aProfile, error: aProfErr } = await supabase.from('profiles').select('*').eq('user_id', userA.id);
  console.log('Read User A profile (should be allowed if active):', aProfErr ? aProfErr.message : aProfile.length > 0 ? 'SUCCESS' : 'FAILED');

  // Try to read User B's plans
  const { data: bPlans, error: bPlanErr } = await supabase.from('fixed_plans').select('*').eq('user_id', userB.id);
  console.log('Read User B plans:', bPlanErr ? bPlanErr.message : bPlans.length > 0 ? 'SUCCESS' : 'FAILED');

  // Try to read User A's plans (MUST BE BLOCKED)
  const { data: aPlans, error: aPlanErr } = await supabase.from('fixed_plans').select('*').eq('user_id', userA.id);
  if (aPlanErr) {
    console.log('Read User A plans Error (expected):', aPlanErr.message);
  } else if (aPlans.length === 0) {
    console.log('Read User A plans SUCCESS: Blocked by RLS (0 rows returned)');
  } else {
    console.log('Read User A plans FAILED: Data leaked!', aPlans);
  }
}

run().catch(console.error);
