const { createClient } = require('@supabase/supabase-js');

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Testing avatars bucket storage policies...');

  // 1. Sign up test user 1
  const email1 = `test1_${Date.now()}@example.com`;
  const { data: authData1, error: authErr1 } = await supabase.auth.signUp({
    email: email1,
    password: 'password123',
  });
  if (authErr1) throw new Error(`Sign up user 1 failed: ${authErr1.message}`);
  const user1 = authData1.user;
  console.log(`User 1 created: ${user1.id}`);

  // 2. Upload to own folder (should succeed)
  console.log('Test A: Uploading to own folder...');
  const fileContent = 'fake image data';
  const { data: uploadData1, error: uploadErr1 } = await supabase.storage
    .from('avatars')
    .upload(`${user1.id}/avatar`, fileContent, { upsert: true, contentType: 'image/png' });
  
  if (uploadErr1) {
    console.error('Test A FAILED: Could not upload to own folder.', uploadErr1);
  } else {
    console.log('Test A PASSED: Uploaded to own folder successfully.');
  }

  // 3. Get Public URL
  console.log('Test B: Getting public URL...');
  const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(`${user1.id}/avatar`);
  if (!publicUrlData.publicUrl) {
    console.error('Test B FAILED: Could not get public URL.');
  } else {
    console.log(`Test B PASSED: Public URL is ${publicUrlData.publicUrl}`);
  }

  // 4. Try to upload to someone else's folder (should fail)
  const otherUserId = '00000000-0000-0000-0000-000000000000'; // Fake user
  console.log('Test C: Uploading to another user folder...');
  const { data: uploadData2, error: uploadErr2 } = await supabase.storage
    .from('avatars')
    .upload(`${otherUserId}/avatar`, fileContent, { upsert: true });

  if (uploadErr2) {
    console.log('Test C PASSED: Blocked from uploading to another user folder (as expected). Error:', uploadErr2.message);
  } else {
    console.error('Test C FAILED: Was able to upload to another user folder!');
  }

  console.log('Done testing.');
}

run().catch(console.error);
