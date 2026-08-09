const puppeteer = require('puppeteer');

async function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

async function runTests() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  async function registerNewUser(email) {
    // Tomoni uses standard supabase auth, but there's no UI for sign-up yet except maybe Welcome page.
    // We can just use the Supabase JS client to register directly, then set the cookie/session,
    // or use the UI if it exists.
    // Actually, earlier logs showed /login and /signup. Let's try to navigate to /signup.
    await page.goto('http://localhost:3000/signup', { waitUntil: 'networkidle0' });
    // If there is no signup page, we can inject a script to use supabase client
    const registered = await page.evaluate(async (email) => {
      const { createBrowserClient } = await import('@supabase/ssr');
      const supabase = createBrowserClient(
        "http://127.0.0.1:54321",
        "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
      );
      const { data, error } = await supabase.auth.signUp({
        email,
        password: 'password123'
      });
      return { data, error };
    }, email).catch(e => ({ error: e.message }));
    
    console.log(`Registration for ${email}:`, registered.error ? "FAILED: " + registered.error : "SUCCESS");
    if(registered.error) return false;
    
    // Refresh to apply session
    await page.goto('http://localhost:3000/onboarding/schedule', { waitUntil: 'networkidle0' });
    return true;
  }

  try {
    console.log("--- Starting E2E Tests ---");
    
    // Scenario B - Skip
    console.log("Testing Scenario B: Skip");
    const emailSkip = `test_skip_${Date.now()}@example.com`;
    await registerNewUser(emailSkip);
    
    await delay(1000);
    // Click Skip button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const skipBtn = buttons.find(b => b.textContent.includes('今は設定しない') || b.textContent.includes('Skip'));
      if(skipBtn) skipBtn.click();
    });
    await delay(1000);
    
    // Check if we are at profile
    let url = page.url();
    console.log("URL after skip:", url); // Should be /onboarding/profile

    // Fill profile
    await page.type('input[type="text"]', 'Skipper');
    // Select age
    await page.select('select', '25-34');
    
    // Back Navigation Test (Scenario K)
    console.log("Testing Scenario K: Back Navigation (from skip)");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const backBtn = buttons.find(b => b.textContent.includes('戻る'));
      if(backBtn) backBtn.click();
    });
    await delay(1000);
    
    url = page.url();
    console.log("URL after back (skip):", url); // Should be /onboarding/schedule
    
    // Go forward again to profile
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const skipBtn = buttons.find(b => b.textContent.includes('今は設定しない'));
      if(skipBtn) skipBtn.click();
    });
    await delay(1000);
    
    // Fill bio
    await page.type('textarea', 'Skipped schedule');
    
    // Mock a file upload or skip avatar since it might fail without a real file
    // The submit button is disabled if avatarUrl is null! 
    // We need to upload an avatar. We can set a fake avatarUrl in state for testing, 
    // or actually upload a small png. Let's create a dummy image and upload it.
    console.log("Uploading avatar...");
    const fs = require('fs');
    fs.writeFileSync('dummy.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
    
    const fileInput = await page.$('input[type="file"]');
    if(fileInput) {
      await fileInput.uploadFile('dummy.png');
      await delay(2000); // Wait for upload
    }

    console.log("Submitting Profile...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const submitBtn = buttons.find(b => b.textContent.includes('登録を完了する'));
      if(submitBtn && !submitBtn.disabled) submitBtn.click();
      else console.log("Submit button disabled!");
    });
    
    await delay(2000);
    url = page.url();
    console.log("URL after submit:", url); // Should be /discover
    
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
}

runTests();
