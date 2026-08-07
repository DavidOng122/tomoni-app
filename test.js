const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'; // Service role key
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
const supabaseAnon = createClient(supabaseUrl, anonKey);

async function run() {
  console.log('--- Smoke Test ---');
  // 1. Create a new auth user
  const email = `testuser_${Date.now()}@example.com`;
  const password = 'password123';
  
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  
  if (authError) {
    console.error('Create User Error:', authError);
    return;
  }
  
  const userId = authData.user.id;
  console.log(`Created User: ${userId}`);
  
  // 2. Check if users table row automatically created and is pending
  const { data: userData, error: userError } = await supabaseAdmin.from('users').select('*').eq('id', userId).single();
  console.log('Users Table Data:', userData);
  
  // 3. Login as the user to execute RPC
  const { data: loginData, error: loginError } = await supabaseAnon.auth.signInWithPassword({
    email,
    password
  });
  
  if (loginError) {
    console.error('Login Error:', loginError);
    return;
  }
  
  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${loginData.session.access_token}`
      }
    }
  });
  
  // 4. Run RPC first time
  console.log('Executing complete_onboarding RPC...');
  const payload = {
    p_profile: {
      nickname: 'Test Nick',
      avatar_url: 'http://example.com/avatar.png',
      age_range: '25-34',
      gender: 'male',
      tags: ['test1', 'test2']
    },
    p_schedules: [
      {
        activity_type: 'walking',
        days_of_week: ['mon', 'wed', 'fri'],
        start_time: '08:00:00',
        place_name: 'Yoyogi Park',
        latitude: 35.671,
        longitude: 139.697
      }
    ]
  };
  
  const { data: rpcData1, error: rpcError1 } = await supabaseAuth.rpc('complete_onboarding', payload);
  if (rpcError1) console.error('RPC Error 1:', rpcError1);
  else console.log('RPC Result 1:', rpcData1);
  
  // 5. Verify results
  const { data: checkProf } = await supabaseAdmin.from('profiles').select('*').eq('user_id', userId).single();
  const { data: checkPlans } = await supabaseAdmin.from('fixed_plans').select('*').eq('user_id', userId);
  const { data: checkUser2 } = await supabaseAdmin.from('users').select('*').eq('id', userId).single();
  
  console.log('Profiles Count:', checkProf ? 1 : 0);
  console.log('Fixed Plans Count:', checkPlans ? checkPlans.length : 0);
  console.log('Users Onboarding Status:', checkUser2?.onboarding_status);
  
  // 6. Run RPC second time
  console.log('Executing complete_onboarding RPC second time...');
  const { data: rpcData2, error: rpcError2 } = await supabaseAuth.rpc('complete_onboarding', payload);
  if (rpcError2) console.error('RPC Error 2:', rpcError2);
  else console.log('RPC Result 2:', rpcData2);
}

run().catch(console.error);
