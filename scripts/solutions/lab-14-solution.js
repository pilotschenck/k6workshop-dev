import { browser } from 'k6/browser';
import { check } from 'k6';

// Lab 14 — k6 Browser: Intro and Page Navigation
//
// Run:
//   k6 run scripts/solutions/lab-14-solution.js
//
// Headless mode (CI / no display server):
//   K6_BROWSER_HEADLESS=true k6 run scripts/solutions/lab-14-solution.js
//
// After the run, verify the screenshot was created:
//   ls -lh screenshots/lab-14.png

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
  // Open a new Chromium tab
  const page = await browser.newPage();

  try {
    // Navigate to the httpbin HTML page — it renders real HTML with a page title
    await page.goto('http://localhost:8080/html');

    // Retrieve the <title> element text
    const title = await page.title();

    // Log it — appears as INFO[XXXX] in k6 terminal output
    console.log(`Page title: ${title}`);
    console.log(`Current URL: ${page.url()}`);

    // Assert the title is not empty
    check(title, {
      'page title is not empty': (t) => t.length > 0,
    });

    // Capture a screenshot for visual debugging.
    // The 'screenshots/' directory must exist relative to the working directory.
    await page.screenshot({ path: 'screenshots/lab-14.png' });

  } finally {
    // Always close the page — releases the browser tab and its resources
    await page.close();
  }
}
