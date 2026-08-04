const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const widths = [320, 360, 390, 412, 430];
  let hasErrors = false;

  for (const width of widths) {
    console.log(`\nTesting viewport: ${width}x844`);
    await page.setViewport({ width, height: 844 });
    await page.goto('http://localhost:3000/dev/mobile-foundation', { waitUntil: 'networkidle0' });

    const layoutIssues = await page.evaluate(() => {
      const issues = [];
      
      // 1. Check horizontal overflow
      if (document.documentElement.scrollWidth > window.innerWidth) {
        issues.push(`Horizontal overflow detected! scrollWidth: ${document.documentElement.scrollWidth}, innerWidth: ${window.innerWidth}`);
      }

      // 2. Check Bottom Navigation width and center
      const nav = document.querySelector('nav');
      if (nav) {
        const rect = nav.getBoundingClientRect();
        const expectedWidth = Math.min(window.innerWidth, 430);
        if (Math.abs(rect.width - expectedWidth) > 1) {
          issues.push(`BottomNavigation width mismatch. Expected: ${expectedWidth}, Actual: ${rect.width}`);
        }
        const expectedLeft = (window.innerWidth - expectedWidth) / 2;
        if (Math.abs(rect.left - expectedLeft) > 1) {
          issues.push(`BottomNavigation not centered. Expected left: ${expectedLeft}, Actual left: ${rect.left}`);
        }
      }

      return issues;
    });

    if (layoutIssues.length > 0) {
      console.log(`❌ Issues found at ${width}px:`);
      layoutIssues.forEach(i => console.log('   - ' + i));
      hasErrors = true;
    } else {
      console.log(`✅ Layout looks good at ${width}px.`);
    }
  }

  await browser.close();
  process.exit(hasErrors ? 1 : 0);
})();
