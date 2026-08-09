const puppeteer = require('puppeteer');

async function run() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => errors.push(err.message));
  page.on('requestfailed', request => {
    errors.push(request.url() + ' ' + request.failure().errorText);
  });
  
  await page.goto('http://localhost:3000/onboarding/schedule', { waitUntil: 'domcontentloaded' });
  
  // Try to find the location input
  const inputSelector = 'input[placeholder]'; // the location input has a placeholder, or we can just find any input
  // Wait for React to render
  await new Promise(r => setTimeout(r, 1000));
  
  // We need to type "Shinjuku" into the first text input that looks like location
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input[type="text"]');
    if (inputs.length > 0) {
      inputs[0].value = 'Shinjuku';
      inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      inputs[0].focus();
    }
  });
  
  // Wait a bit for the autocomplete to fetch
  await new Promise(r => setTimeout(r, 2000));
  
  const suggestions = await page.evaluate(() => {
    const listItems = document.querySelectorAll('li');
    return Array.from(listItems).map(li => li.textContent).filter(t => t.includes('Shinjuku') || t.length > 0);
  });
  
  console.log('Suggestions:', suggestions);
  console.log('Errors:', errors);
  
  await browser.close();
}

run().catch(console.error);
