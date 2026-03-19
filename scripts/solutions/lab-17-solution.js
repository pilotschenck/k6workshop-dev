// scripts/solutions/lab-17-solution.js
// Lab 17: Browser Synthetic Checks in Grafana SM — Solution Script
//
// This script is designed to be:
//   1. Run locally to verify correctness before uploading to SM
//   2. Pasted directly into Grafana Synthetic Monitoring as a Browser check
//
// Target: https://grafana.com (publicly accessible — required for SM cloud probes)
//
// Run locally:
//   K6_BROWSER_HEADLESS=true k6 run scripts/solutions/lab-17-solution.js
//
// In SM: Add Check > Browser > paste this script content

import { browser } from 'k6/browser';
import { check } from 'k6';

// options.scenarios is REQUIRED for SM browser checks.
// SM validates that the script declares a browser scenario before accepting it.
// shared-iterations with 1 VU matches how SM executes: one iteration per schedule tick.
export const options = {
  scenarios: {
    browser_check: {
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

  // Thresholds are evaluated when running locally.
  // SM uses its own assertion system layered on top of check() results.
  thresholds: {
    checks: ['rate==1.0'],
    browser_web_vital_lcp: ['p(95)<5000'],   // LCP under 5s at p95
    browser_web_vital_fcp: ['p(95)<3000'],   // FCP under 3s at p95
  },
};

export default async function () {
  const page = await browser.newPage();

  try {
    // Navigate to the Grafana homepage.
    // waitUntil: 'networkidle' waits until there are no more than 0 in-flight
    // network connections for 500ms — a good signal that the page is fully loaded.
    await page.goto('https://grafana.com', { waitUntil: 'networkidle' });

    // --- Check 1: Page title contains "Grafana" ---
    // This is the most basic sanity check — confirms we reached the right page
    // and the server returned a proper HTML document (not an error page).
    const title = await page.title();
    console.log(`Page title: "${title}"`);

    check(title, {
      'page title contains Grafana': (t) => t.includes('Grafana'),
    });

    // --- Check 2: Main navigation is visible ---
    // The nav element appearing means the page has rendered enough for users
    // to interact with it. A 10-second timeout is generous but necessary for
    // slow probe locations (SM runs checks from regions that may be far from
    // Grafana's CDN edge nodes).
    await page.waitForSelector('nav', { timeout: 10000 });
    console.log('Main nav visible — proceeding with content checks');

    // --- Check 3: Page body contains meaningful content ---
    // Checks that we didn't land on a blank page, maintenance page, or error.
    // We look for "Grafana" or "observability" — both are core to the homepage copy.
    const bodyText = await page.locator('body').textContent();
    check(bodyText, {
      'hero content is present': (t) =>
        t.includes('Grafana') || t.includes('observability') || t.includes('monitoring'),
    });

    // --- Screenshot ---
    // When running locally: saves to disk as 'grafana-homepage.png'.
    // In SM: SM captures screenshots automatically on assertion failures.
    //        This call is harmless in SM but useful for local debugging.
    await page.screenshot({ path: 'grafana-homepage.png' });

    // --- Log current URL ---
    // Confirms we weren't unexpectedly redirected (e.g., to a login page or
    // a regional variant of the site).
    const currentUrl = await page.evaluate(() => window.location.href);
    console.log(`Current URL: ${currentUrl}`);

  } catch (e) {
    // Log the error clearly so it appears in SM's check log and in local output.
    console.error(`Browser check failed: ${e.message}`);

    // Attempt a failure screenshot — in SM this is automatic, but locally it
    // helps diagnose what the page looked like at the moment of failure.
    try {
      await page.screenshot({ path: 'grafana-homepage-failure.png' });
    } catch (_) {
      // Ignore secondary errors during failure handling
    }

    // Re-throw so k6 marks this iteration as failed
    throw e;

  } finally {
    // Always close the page. Releasing the browser context is especially
    // important in SM where each check execution is a fresh process.
    await page.close();
  }
}
