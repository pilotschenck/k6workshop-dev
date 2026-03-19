import { browser } from 'k6/browser';
import { check } from 'k6';

// Lab 15 — Browser Interactions: Forms, Clicks, and Waits
//
// Run:
//   k6 run scripts/starters/lab-15-starter.js
//
// This test uses the httpbin form page at http://localhost:8080/forms/post
// Preview the form fields first:
//   curl http://localhost:8080/forms/post

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
    // Navigate to the form page
    await page.goto('http://localhost:8080/forms/post');

    // TODO: Use page.locator() with a CSS selector to find the customer name input
    //       and call .fill() to enter 'Test User'
    //   await page.locator('input[name="custname"]').fill('...');

    // TODO: Fill in the phone number field (input[name="custtel"]) with '555-1234'

    // TODO: Fill in the email field (input[name="custemail"]) with 'test@example.com'

    // TODO: Click the submit button and wait for navigation at the same time.
    //       Wrap both in Promise.all() to avoid a race condition:
    //   await Promise.all([
    //     page.waitForNavigation(),
    //     page.locator('input[type="submit"]').click(),
    //   ]);

    // TODO: After navigation, wait for the <pre> element to appear (it contains the response JSON)
    //   await page.waitForSelector('pre');

    // TODO: Read the text content of the <body> and store it in a variable
    //   const bodyText = await page.locator('body').textContent();

    // TODO: Add check() calls to verify the response contains 'Test User' and 'custname'

    // TODO: Use page.evaluate() to get the current URL and log it with console.log

  } catch (e) {
    console.error(`Browser interaction failed: ${e.message}`);
  } finally {
    await page.close();
  }
}
