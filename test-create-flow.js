const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('🔄 Navigating to /dashboard/create...');
    await page.goto('http://localhost:3000/dashboard/create', { waitUntil: 'networkidle' });

    // Wait a bit for the page to render
    await page.waitForTimeout(2000);

    // Take screenshot of initial page
    await page.screenshot({ path: 'screenshot-1-initial.png', fullPage: true });
    console.log('✅ Screenshot 1 taken: Initial page load');

    // Check if mode selection page is visible
    const modeSelectionVisible = await page.isVisible('text=Choose one to get started');
    console.log(`📍 Mode selection page visible: ${modeSelectionVisible}`);

    // Check if CREATE INVITE button exists
    const createInviteBtn = await page.isVisible('text=CREATE INVITE');
    console.log(`📍 CREATE INVITE button visible: ${createInviteBtn}`);

    // Check if POST EVENT button exists
    const postEventBtn = await page.isVisible('text=POST EVENT');
    console.log(`📍 POST EVENT button visible: ${postEventBtn}`);

    // Check for bounce animation class
    const bounceElements = await page.locator('.bounce-button').count();
    console.log(`🎯 Elements with bounce animation: ${bounceElements}`);

    if (createInviteBtn) {
      console.log('🔄 Clicking CREATE INVITE button...');
      await page.click('text=CREATE INVITE');
      await page.waitForTimeout(1500);

      // Take screenshot after clicking
      await page.screenshot({ path: 'screenshot-2-after-click.png', fullPage: true });
      console.log('✅ Screenshot 2 taken: After clicking CREATE INVITE');

      // Check if form is visible
      const formVisible = await page.isVisible('text=Template & style');
      console.log(`📍 Form page visible after click: ${formVisible}`);
    }

    console.log('\n✨ Test completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
