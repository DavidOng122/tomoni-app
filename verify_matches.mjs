import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'; // From task-263 log
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runSQL(sql) {
  // We can just use the admin client's rpc or query if available. Unfortunately, no direct SQL query via PostgREST unless there is an RPC.
  // We'll just do it via standard PostgREST inserts.
}

async function main() {
  console.log("Starting Verification...");
  
  // Clean up
  const { data: existing } = await supabaseAdmin.from('users').select('id');
  if (existing) {
    for (const u of existing) {
      await supabaseAdmin.auth.admin.deleteUser(u.id).catch(()=>null);
    }
  }

  // Create Users A, B, C, D, E
  const usersInfo = {};
  for (const name of ['A', 'B', 'C', 'D', 'E']) {
    const { data } = await supabaseAdmin.auth.admin.createUser({
      email: `test_${name}@example.com`,
      password: 'password123',
      email_confirm: true
    });
    const uid = data.user.id;
    usersInfo[name] = uid;
    const { error: userError } = await supabaseAdmin.from('users').update({ onboarding_status: 'completed', account_status: 'active' }).eq('id', uid);
    if (userError) console.error("User update error:", userError);
    const { error: profError } = await supabaseAdmin.from('profiles').insert({ user_id: uid, nickname: `User ${name}`, profile_status: 'active', age_range: '25-34', gender: 'male', avatar_url: 'https://example.com/a.jpg' });
    if (profError) console.error("Profile insert error:", profError);
  }

  // Create Plans
  // A: Walking, Wed, 18:00
  const { data: planA1 } = await supabaseAdmin.from('fixed_plans').insert({
    user_id: usersInfo['A'], activity_type: 'walking', days_of_week: ['wed'], start_time: '18:00',
    latitude: 35.658, longitude: 139.702, place_name: 'Loc A', plan_status: 'active'
  }).select().single();
  // A: Running, Mon, 07:00 (for deduplication)
  await supabaseAdmin.from('fixed_plans').insert({
    user_id: usersInfo['A'], activity_type: 'running', days_of_week: ['mon'], start_time: '07:00',
    latitude: 35.658, longitude: 139.702, place_name: 'Loc A', plan_status: 'active'
  });

  // B: Walking, Wed, 18:30 (Matches A)
  await supabaseAdmin.from('fixed_plans').insert({
    user_id: usersInfo['B'], activity_type: 'walking', days_of_week: ['wed'], start_time: '18:30',
    latitude: 35.660, longitude: 139.704, place_name: 'Loc B', plan_status: 'active'
  });
  // B: Running, Mon, 07:15 (Matches A - deduplication should only show B once for A)
  await supabaseAdmin.from('fixed_plans').insert({
    user_id: usersInfo['B'], activity_type: 'running', days_of_week: ['mon'], start_time: '07:15',
    latitude: 35.660, longitude: 139.704, place_name: 'Loc B', plan_status: 'active'
  });

  // C: Sports, Wed, 18:00 (Activity mismatch)
  await supabaseAdmin.from('fixed_plans').insert({
    user_id: usersInfo['C'], activity_type: 'sports', days_of_week: ['wed'], start_time: '18:00',
    latitude: 35.658, longitude: 139.702, place_name: 'Loc C', plan_status: 'active'
  });

  // D: Walking, Thu, 18:00 (Weekday mismatch)
  await supabaseAdmin.from('fixed_plans').insert({
    user_id: usersInfo['D'], activity_type: 'walking', days_of_week: ['thu'], start_time: '18:00',
    latitude: 35.658, longitude: 139.702, place_name: 'Loc D', plan_status: 'active'
  });

  // E: Walking, Wed, 19:10 (Time mismatch 70m)
  await supabaseAdmin.from('fixed_plans').insert({
    user_id: usersInfo['E'], activity_type: 'walking', days_of_week: ['wed'], start_time: '19:10',
    latitude: 35.658, longitude: 139.702, place_name: 'Loc E', plan_status: 'active'
  });

  console.log("Fixtures created. Running verification...");

  // 1. Unauthenticated Call
  const unauthClient = createClient(SUPABASE_URL, ANON_KEY);
  const res1 = await unauthClient.rpc('get_discover_recommendations');
  console.log("Unauth call (expected fail/empty):", res1.error || res1.data);

  // 2. Authenticated Call as A
  const authClient = createClient(SUPABASE_URL, ANON_KEY);
  await authClient.auth.signInWithPassword({ email: 'test_A@example.com', password: 'password123' });
  const res2 = await authClient.rpc('get_discover_recommendations');
  
  console.log("\nResults for User A (Global Discover):");
  if (res2.data) {
    res2.data.forEach(c => {
      console.log(`- Matched Candidate: ${c.profile.nickname}`);
      console.log(`  Distance: ${c.match.distanceKm}km, TimeDiff: ${c.match.timeDifferenceMinutes}m`);
      console.log(`  Reason: ${c.match.reasons.join(',')}`);
      if (c.profile.latitude || c.profile.longitude || c.match.latitude || c.match.longitude || c.match.exactPlaceName) {
         console.log("  WARNING: Privacy leaked!");
      }
    });
    console.log("Has User C (Activity mismatch)?", res2.data.some(c => c.candidateId === usersInfo['C']));
    console.log("Has User D (Weekday mismatch)?", res2.data.some(c => c.candidateId === usersInfo['D']));
    console.log("Has User E (Time boundary 70m)?", res2.data.some(c => c.candidateId === usersInfo['E']));
    console.log("Has User A (Self)?", res2.data.some(c => c.candidateId === usersInfo['A']));
    console.log("User B count (Deduplication):", res2.data.filter(c => c.candidateId === usersInfo['B']).length);
  } else {
    console.log("Error:", res2.error);
  }

  // 3. Foreign plan auth test
  const res3 = await authClient.rpc('get_discover_recommendations', { p_my_plan_id: planA1.fixed_plan_id });
  console.log("\nSpecific plan (A1) call:", res3.data ? "Success" : "Failed");

  const foreignPlanId = '11111111-0000-0000-0000-000000000000'; // Or any B plan
  const { data: planB } = await supabaseAdmin.from('fixed_plans').select('fixed_plan_id').eq('user_id', usersInfo['B']).limit(1).single();
  
  const res4 = await authClient.rpc('get_discover_recommendations', { p_my_plan_id: planB.fixed_plan_id });
  console.log("Foreign plan (B1) call (expected empty):", res4.data);

  // 4. RLS Block Test
  const { data: directRLS, error: rlsError } = await authClient.from('fixed_plans').select('*').eq('user_id', usersInfo['B']);
  console.log("\nDirect RLS Query for B's plans (expected empty):", directRLS);

  // 5. Connections Exclusion
  console.log("\nTesting Connection Exclusion:");
  await supabaseAdmin.from('connections').insert({
    user_a_id: usersInfo['A'], user_b_id: usersInfo['B'], connection_status: 'active'
  });
  const res5 = await authClient.rpc('get_discover_recommendations');
  console.log("Has User B after connection?", res5.data.some(c => c.candidateId === usersInfo['B']));

}

main().catch(console.error);
