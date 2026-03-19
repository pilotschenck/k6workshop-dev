// scripts/solutions/lab-16-solution.js
// Lab 16: Browser + HTTP Mixed Testing — Solution Script
//
// Runs two concurrent scenarios for 30 seconds:
//   - api_load:      5 HTTP VUs hitting GET /api/products and POST /login
//   - browser_check: 1 Chromium VU loading the demo-app homepage and verifying it
//
// Both scenarios emit metrics to the same output stream (terminal, InfluxDB, etc.)
// allowing direct timeline correlation of API latency and browser load times.
//
// Run (terminal only):
//   K6_BROWSER_HEADLESS=true k6 run scripts/solutions/lab-16-solution.js
//
// Run with InfluxDB output (view in Grafana at http://localhost:3030):
//   K6_BROWSER_HEADLESS=true k6 run \
//     --out influxdb=http://localhost:8086/k6 \
//     scripts/solutions/lab-16-solution.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { browser } from 'k6/browser';
import { Trend } from 'k6/metrics';

// Custom metric to track browser navigation time separately from the built-in
// browser_loaded metric. Useful for filtering in Grafana by scenario tag.
const browserNavTime = new Trend('browser_nav_time_ms', true);

export const options = {
  scenarios: {
    api_load: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'apiTest',
    },
    browser_check: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      exec: 'browserTest',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },

  thresholds: {
    // API thresholds — applied to http_req_duration across all HTTP VUs
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05'],

    // Check pass rate must stay at 100% across both scenarios
    checks: ['rate==1.0'],
  },
};

// ---------------------------------------------------------------------------
// API scenario function (synchronous — no async/await needed for HTTP)
// ---------------------------------------------------------------------------
export function apiTest() {
  // --- Product catalog ---
  const productsRes = http.get('http://localhost:3000/api/products');
  check(productsRes, {
    'api: products status 200': (r) => r.status === 200,
    'api: products response < 300ms': (r) => r.timings.duration < 300,
    'api: products body is array': (r) => {
      try {
        return Array.isArray(JSON.parse(r.body));
      } catch (_) {
        return false;
      }
    },
  });

  sleep(1);

  // --- Login ---
  const loginRes = http.post(
    'http://localhost:3000/login',
    JSON.stringify({ username: 'testuser', password: 'password123' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(loginRes, {
    'api: login response received': (r) => r.status !== 0,
    'api: login response < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}

// ---------------------------------------------------------------------------
// Browser scenario function (async — required for browser module APIs)
// ---------------------------------------------------------------------------
export async function browserTest() {
  const page = await browser.newPage();

  // Record when navigation starts so we can compute total nav time
  const navStart = Date.now();

  try {
    // Navigate to the demo app homepage
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    // Record custom navigation time metric
    browserNavTime.add(Date.now() - navStart);

    // Take a screenshot — useful for visual debugging if checks fail
    await page.screenshot({ path: 'mixed-test-screenshot.png' });

    // Read and log the page title
    const title = await page.title();
    console.log(`Browser VU — page title: "${title}"`);

    check(title, {
      'browser: page title is not empty': (t) => t.length > 0,
    });

    // Verify the page body has meaningful content
    const bodyText = await page.locator('body').textContent();
    check(bodyText, {
      'browser: body has content': (t) => t && t.trim().length > 0,
    });

    // Log the current URL to confirm we didn't get redirected unexpectedly
    const currentUrl = await page.evaluate(() => window.location.href);
    console.log(`Browser VU — current URL: ${currentUrl}`);

  } catch (e) {
    console.error(`Browser interaction failed: ${e.message}`);

    // Take a failure screenshot for debugging
    try {
      await page.screenshot({ path: 'mixed-test-failure.png' });
    } catch (_) {
      // Ignore screenshot errors during error handling
    }
  } finally {
    // Always close the page to release Chromium resources
    await page.close();
  }
}
