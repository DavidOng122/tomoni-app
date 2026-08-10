import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

if (!SERVICE_ROLE_KEY) {
  console.error("Please provide SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log("Setting up event fixtures...");
  
  // Clear previous events
  await supabaseAdmin.from('events').delete().neq('event_id', '00000000-0000-0000-0000-000000000000');

  // Let's create an organizer user
  const { data: userData } = await supabaseAdmin.auth.admin.createUser({
    email: `organizer_${Date.now()}@example.com`,
    password: 'password123',
    email_confirm: true
  });
  const uid = userData.user.id;
  await supabaseAdmin.from('users').update({ onboarding_status: 'completed', account_status: 'active' }).eq('id', uid);
  await supabaseAdmin.from('profiles').insert({ user_id: uid, nickname: `Org`, profile_status: 'active', age_range: '35-44', gender: 'female', avatar_url: 'https://example.com/a.jpg' });

  const now = new Date();
  
  // 1. scheduled future event -> visible
  const futureStart = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
  const futureEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  
  // 2. scheduled currently-running event -> visible
  const runningStart = new Date(now.getTime() - 1 * 60 * 60 * 1000); // started 1 hour ago
  const runningEnd = new Date(now.getTime() + 1 * 60 * 60 * 1000); // ends in 1 hour
  
  // 3. scheduled already-finished event -> not visible
  const finishedStart = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const finishedEnd = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  
  // 4. cancelled -> not visible
  
  // 5. postponed -> not visible
  
  // 6. ended -> not visible

  const eventsToInsert = [
    {
      event_type: 'official', created_by_user_id: uid, title: 'Future Event', 
      start_at: futureStart.toISOString(), end_at: futureEnd.toISOString(), place_name: 'Park',
      registration_required: false, event_status: 'scheduled', poster_url: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?q=80&w=800'
    },
    {
      event_type: 'official', created_by_user_id: uid, title: 'Running Event', 
      start_at: runningStart.toISOString(), end_at: runningEnd.toISOString(), place_name: 'Gym',
      registration_required: false, event_status: 'scheduled'
    },
    {
      event_type: 'official', created_by_user_id: uid, title: 'Finished Event', 
      start_at: finishedStart.toISOString(), end_at: finishedEnd.toISOString(), place_name: 'Library',
      registration_required: false, event_status: 'scheduled'
    },
    {
      event_type: 'official', created_by_user_id: uid, title: 'Cancelled Event', 
      start_at: futureStart.toISOString(), end_at: futureEnd.toISOString(), place_name: 'Park',
      registration_required: false, event_status: 'cancelled'
    },
    {
      event_type: 'official', created_by_user_id: uid, title: 'Postponed Event', 
      start_at: futureStart.toISOString(), end_at: futureEnd.toISOString(), place_name: 'Park',
      registration_required: false, event_status: 'postponed'
    },
    {
      event_type: 'official', created_by_user_id: uid, title: 'Ended Event', 
      start_at: finishedStart.toISOString(), end_at: finishedEnd.toISOString(), place_name: 'Park',
      registration_required: false, event_status: 'ended'
    }
  ];

  for (const ev of eventsToInsert) {
    const { error } = await supabaseAdmin.from('events').insert(ev);
    if (error) console.error("Error inserting event:", error);
  }
  console.log("Fixtures inserted successfully.");
}

main().catch(console.error);
