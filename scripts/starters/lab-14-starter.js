import { browser } from 'k6/browser';
import { check } from 'k6';

// Lab 14 — k6 Browser: Intro and Page Navigation
//
// The browser module ships with k6 — no extra install required.
// Browser tests require an async default function because all browser APIs return Promises.
//
// Run:
//   k6 run scripts/starters/lab-14-starter.js
//
// In CI or headless environments set:
//   K6_BROWSER_HEADLESS=true k6 run scripts/starters/lab-14-starter.js

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
  // Open a new browser page (tab).
  // Always close it in a finally block so resources are released even if an assertion throws.
  const page = await browser.newPage();

  try {
    // TODO: Navigate to the httpbin HTML page at http://localhost:8080/html
    //   await page.goto('...');

    // TODO: Get the page title and log it with console.log
    //   const title = await page.title();
    //   console.log(`Page title: ${title}`);

    // TODO: Check that the page title is not empty using k6's check()
    //   check(title, { 'page title is not empty': (t) => t.length > 0 });

    // TODO: Take a screenshot and save it to 'screenshots/lab-14.png'
    //   await page.screenshot({ path: 'screenshots/lab-14.png' });

  } finally {
    await page.close();
  }
}
