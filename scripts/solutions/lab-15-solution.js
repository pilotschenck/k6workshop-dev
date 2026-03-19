import { browser } from 'k6/browser';
import { check } from 'k6';

// Lab 15 — Browser Interactions: Forms, Clicks, and Waits
//
// Run:
//   k6 run scripts/solutions/lab-15-solution.js
//
// Expected output:
//   INFO[XXXX] Response body: { "custname": "Test User", ...   source=console
//   INFO[XXXX] Current URL: http://localhost:8080/post          source=console
//   INFO[XXXX] Found N input element(s) on result page          source=console
//   ✓ response contains submitted name
//   ✓ response contains custname field
//   ✓ form submission succeeded

export const options = {
  scenarios: {
    browser_test: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
};

export default async function () {
  const page = await browser.newPage();

  try {
    // Navigate to the httpbin HTML form
    await page.goto('http://localhost:8080/forms/post');

    // Fill in form fields using CSS selector locators.
    // locator() is lazy — the DOM is not queried until an action method (.fill, .click, etc.) is called.
    await page.locator('input[name="custname"]').fill('Test User');
    await page.locator('input[name="custtel"]').fill('555-1234');
    await page.locator('input[name="custemail"]').fill('test@example.com');

    // Submit the form and wait for the resulting navigation simultaneously.
    // Wrapping both in Promise.all() prevents a race condition where the navigation
    // fires before waitForNavigation() is registered.
    await Promise.all([
      page.waitForNavigation(),
      page.locator('input[type="submit"]').click(),
    ]);

    // Wait for the <pre> element that contains the submitted JSON response to appear.
    // This pattern is essential for SPAs where content loads asynchronously.
    await page.waitForSelector('pre');

    // Read text content from the page body
    const bodyText = await page.locator('body').textContent();

    // Log the first 150 characters of the response for debugging
    console.log(`Response body: ${bodyText.substring(0, 150)}`);

    // Assert the submitted data made it into the response
    check(bodyText, {
      'response contains submitted name': (t) => t.includes('Test User'),
      'response contains custname field': (t) => t.includes('custname'),
    });

    // Overall check that the whole flow succeeded
    check(bodyText, {
      'form submission succeeded': (t) => t.includes('Test User'),
    });

    // Use page.evaluate() to run JavaScript inside the browser context and return a value
    const currentUrl = await page.evaluate(() => window.location.href);
    console.log(`Current URL: ${currentUrl}`);

    const inputCount = await page.evaluate(
      () => document.querySelectorAll('input').length,
    );
    console.log(`Found ${inputCount} input element(s) on result page`);

  } catch (e) {
    console.error(`Browser interaction failed: ${e.message}`);
  } finally {
    // Always close the page to free browser resources
    await page.close();
  }
}
