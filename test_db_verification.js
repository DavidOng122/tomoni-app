const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "http://127.0.0.1:54321";
const supabaseKey = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDatabase() {
  console.log('--- Database Verification ---');

  // Check users
  const { data: users, error: userError } = await supabase.from('users').select('*');
  if (userError) console.error(userError);
  else console.log(`Total users: ${users.length}`);

  // Find the completed user
  const completedUser = users.find(u => u.onboarding_status === 'completed');
  if (completedUser) {
    console.log(`Found completed user: ${completedUser.id}`);
    
    // Check profiles
    const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', completedUser.id).single();
    if (profile) {
      console.log('Profile:', profile);
    } else {
      console.log('Profile missing for completed user!');
    }

    // Check fixed_plans
    const { data: plans } = await supabase.from('fixed_plans').select('*').eq('user_id', completedUser.id);
    if (plans) {
      console.log(`Fixed Plans for user: ${plans.length}`);
      console.log(plans);
    } else {
      console.log('Fixed plans missing for user!');
    }
  } else {
    console.log('No completed user found.');
  }
}

verifyDatabase();
