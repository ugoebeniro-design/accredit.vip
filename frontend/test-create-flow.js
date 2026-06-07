const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('🔄 Navigating to home page first...');
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    console.log('🔄 Now navigating to /dashboard/create...');
    await page.goto('http://localhost:3000/dashboard/create', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // Take screenshot of current page
    await page.screenshot({ path: 'screenshot-1-initial.png', fullPage: true });
    console.log('✅ Screenshot 1 taken');

    // Check what's visible on the page
    const pageContent = await page.content();
    const hasSelection = pageContent.includes('CREATE INVITE') && pageContent.includes('POST EVENT');
    const hasForm = pageContent.includes('Template & style');
    const hasLogin = pageContent.includes('Login') || pageContent.includes('login') || currentUrl.includes('login');

    console.log(`\n📋 Page Content Check:`);
    console.log(`  - Has mode selection (CREATE INVITE + POST EVENT): ${hasSelection}`);
    console.log(`  - Has form (Template & style): ${hasForm}`);
    console.log(`  - Is on login page: ${hasLogin}`);

    if (hasSelection) {
      console.log('\n✅ MODE SELECTION PAGE IS SHOWING - FIX IS WORKING!');

      console.log('\n🔄 Clicking CREATE INVITE button...');
      await page.click('text=CREATE INVITE');
      await page.waitForTimeout(1500);

      await page.screenshot({ path: 'screenshot-2-after-click.png', fullPage: true });
      console.log('✅ Screenshot 2 taken');

      const pageContent2 = await page.content();
      if (pageContent2.includes('Template & style')) {
        console.log('✅ FORM APPEARED AFTER CLICKING - FIX CONFIRMED!');
      }
    } else if (hasForm) {
      console.log('\n❌ FORM IS SHOWING DIRECTLY - MODE SELECTION PAGE SKIPPED (BUG!)');
    } else if (hasLogin) {
      console.log('\n⚠️  Page redirected to login - need to authenticate first');
    } else {
      console.log('\n❓ Unknown page state');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
