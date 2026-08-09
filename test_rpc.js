const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "http://127.0.0.1:54321";
const supabaseKey = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
  console.log("=== Testing complete_onboarding RPC ===");
  
  const email = `test_rpc_${Date.now()}@example.com`;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });

  if (authError) {
    console.error("Auth Error:", authError);
    return;
  }
  
  const { execSync } = require('child_process');
  console.log("Confirming email via db query...");
  execSync(`npx.cmd supabase db query "UPDATE auth.users SET email_confirmed_at = now() WHERE email = '${email}';"`);

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: 'password123'
  });
  
  if (signInError) {
    console.error("Sign In Error:", signInError);
    return;
  }
  
  const session = signInData.session;
  console.log(`User signed in: ${signInData.user.id}`);

  // Test A - Normal
  const p_profile = {
    nickname: "TestUser",
    avatar_url: "https://example.com/avatar.png",
    age_range: "25-34",
    gender: "male",
    tags: ["walking", "movie"],
    bio: "Hello world"
  };

  const p_schedules = [{
    activity_type: "walking",
    custom_activity_name: null,
    days_of_week: ["mon", "wed"],
    start_time: "15:00:00",
    place_id: "ChIJpwV08AOMGGAR_aXzLd8GfXU",
    place_name: "Yoyogi Park",
    latitude: 35.671,
    longitude: 139.697
  }];

  // Set session explicitly or pass headers
  const headers = { Authorization: `Bearer ${session.access_token}` };

  const { data, error } = await supabase.rpc('complete_onboarding', {
    p_profile,
    p_schedules
  }, { head: false, count: null }); // wait, rpc doesn't accept headers here easily in js client.

  // The easiest way is to create a new client with the global header:
  const authSupabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } }
  });

  const { data: d1, error: e1 } = await authSupabase.rpc('complete_onboarding', {
    p_profile,
    p_schedules
  });

  if (e1) {
    console.error("RPC Error:", e1);
  } else {
    console.log("RPC Success:", d1);
  }

  // Verify DB using the same auth client
  const { data: user } = await authSupabase.from('users').select('onboarding_status').eq('id', signInData.user.id).single();
  console.log("Onboarding Status:", user?.onboarding_status);
  
  const { data: profile, error: profileErr } = await authSupabase.from('profiles').select('*').eq('user_id', signInData.user.id).single();
  console.log("Profile Nickname:", profile?.nickname, profileErr ? profileErr : "");

  const { data: plans } = await authSupabase.from('fixed_plans').select('*').eq('user_id', signInData.user.id);
  console.log("Fixed Plans Count:", plans?.length);
  
  // Test TM005 (already completed)
  const { data: data2, error: error2 } = await authSupabase.rpc('complete_onboarding', {
    p_profile,
    p_schedules
  });
  
  if (error2 && error2.code === 'TM005') {
    console.log("TM005 successfully triggered on double submit.");
  } else {
    console.log("Failed to trigger TM005. Data:", data2, "Error:", error2);
  }
  
  // Test Skip
  const emailSkip = `test_skip_${Date.now()}@example.com`;
  await supabase.auth.signUp({ email: emailSkip, password: 'password123' });
  execSync(`npx.cmd supabase db query "UPDATE auth.users SET email_confirmed_at = now() WHERE email = '${emailSkip}';"`);
  const { data: skipSignIn } = await supabase.auth.signInWithPassword({ email: emailSkip, password: 'password123' });

  const authSupabaseSkip = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${skipSignIn.session.access_token}` } }
  });
  
  const { error: errorSkip } = await authSupabaseSkip.rpc('complete_onboarding', {
    p_profile,
    p_schedules: []
  });
  
  if (errorSkip) {
    console.error("Skip Error:", errorSkip);
  } else {
    console.log("Skip Success!");
    const { data: skipPlans } = await authSupabaseSkip.from('fixed_plans').select('*');
    console.log("Skip Plans Count (should be 0):", skipPlans?.length);
  }
}

testRpc();
