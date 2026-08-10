import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const { data: futureEvents } = await supabaseAdmin.from('events').select('*').eq('title', 'Future Event').limit(1);
  if (futureEvents && futureEvents.length > 0) {
    await supabaseAdmin.from('events').update({
      registration_required: true,
      registration_url: 'https://example.com/register',
      description: 'This is a detailed description of the future event. It contains multiple lines.\n\nLine 2 is here.',
      source_name: 'City Hall',
      address: '1-1-1 City Hall, Shibuya, Tokyo'
    }).eq('event_id', futureEvents[0].event_id);
    console.log("Updated Future Event");
  }

  const { data: runningEvents } = await supabaseAdmin.from('events').select('*').eq('title', 'Running Event').limit(1);
  if (runningEvents && runningEvents.length > 0) {
    await supabaseAdmin.from('events').update({
      registration_required: true,
      registration_url: null,
      official_url: 'https://example.com/official',
      registration_status: 'closed',
      description: null,
      address: null
    }).eq('event_id', runningEvents[0].event_id);
    console.log("Updated Running Event");
  }

  console.log("Done");
}

main().catch(console.error);
