# Lab 16: Browser + HTTP Mixed Testing

**Time:** 20 min | **Module:** Module 3 — Browser Testing

## Overview

k6 lets you mix HTTP protocol tests and browser tests in a single test run using scenarios. This means you can load test your API with dozens of virtual users while simultaneously verifying that the UI still works correctly — catching both backend performance regressions and frontend breakage in one run, with unified metrics in the terminal and in Grafana.

This approach reflects a real production concern: your API might handle the load fine while the frontend silently degrades (slow renders, broken JS, missing assets). A single browser VU alongside your API VUs catches that immediately without requiring a separate test run.

> **DataDog comparison:** DataDog does not offer native mixed-mode testing. You would run DD Browser tests and DD Load tests separately, then manually correlate results across two different dashboards. k6's scenario system integrates both into one script with one output stream and one set of metrics.

## What You'll Learn

- How to define multiple scenarios in `options.scenarios`
- How to assign different executor functions to API VUs and browser VUs
- How to write and run an HTTP load function alongside a browser check function
- How to read mixed metric output (both `http_req_duration` and `browser_*` metrics)
- How to export mixed results to InfluxDB and view them in Grafana

## Prerequisites

- Labs 14–15 complete (browser module basics, page navigation, interactions)
- Lab 03 complete (scenarios and stages)
- Demo app running at http://localhost:3000

## Instructions

### Step 1: Understand the Scenario Configuration

Open the starter script:

```bash
cat scripts/starters/lab-16-starter.js
```

The `options.scenarios` block is the key. Each key in `scenarios` defines an independent group of VUs with its own executor, VU count, duration, and — critically — which exported function those VUs call via the `exec` property.

```javascript
export const options = {
  scenarios: {
    api_load: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'apiTest',          // calls the exported function named apiTest
    },
    browser_check: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      exec: 'browserTest',      // calls the exported function named browserTest
      options: {
        browser: {
          type: 'chromium',     // this scenario runs a real browser
        },
      },
    },
  },
};
```

Important details:
- The `browser` option block inside a scenario is what activates the k6 browser module for those VUs. Only VUs in a browser-typed scenario get a browser context.
- The `exec` property tells k6 which exported function to run instead of `default`. This is how you have two different behaviors in one file.
- API VUs and browser VUs run concurrently — 5 API VUs hammering endpoints while 1 browser VU loads the full page in Chromium.

### Step 2: Write the apiTest Function

The `apiTest` function is a standard HTTP function — identical to what you wrote in Labs 01–03. It gets called by every VU in the `api_load` scenario, running in a tight loop for 30 seconds.

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export function apiTest() {
  // Hit the product catalog
  const productsRes = http.get('http://localhost:3000/api/products');
  check(productsRes, {
    'api: products status 200': (r) => r.status === 200,
    'api: products response < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);

  // Attempt a login
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
```

This function is synchronous — no `async/await` needed for HTTP tests. k6 handles the difference between sync (HTTP) and async (browser) functions automatically based on the scenario configuration.

### Step 3: Write the browserTest Function

The `browserTest` function must be `async` because the browser module APIs return Promises. It is called by the single VU in the `browser_check` scenario.

```javascript
import { browser } from 'k6/browser';

export async function browserTest() {
  const page = await browser.newPage();

  try {
    // Navigate to the demo app homepage
    await page.goto('http://localhost:3000/');

    // Capture a screenshot for visual debugging
    await page.screenshot({ path: 'mixed-test-screenshot.png' });

    // Read the page title
    const title = await page.title();
    console.log(`Browser VU — page title: ${title}`);

    // Check the page loaded with meaningful content
    check(title, {
      'browser: page title is not empty': (t) => t.length > 0,
    });

    // Verify the page body loaded
    const bodyText = await page.locator('body').textContent();
    check(bodyText, {
      'browser: body has content': (t) => t && t.trim().length > 0,
    });
  } finally {
    await page.close();
  }
}
```

Note that `browserTest` does not call `sleep()`. The browser navigation itself takes time (network round-trip + page render), so it naturally paces itself. Adding a `sleep()` here would just increase idle time in the browser VU.

### Step 4: Run the Mixed Test

Set the headless environment variable so Chromium runs without a display, then run the starter:

```bash
K6_BROWSER_HEADLESS=true k6 run scripts/starters/lab-16-starter.js
```

You will see k6 print startup messages for both scenarios simultaneously. The test will run for 30 seconds. Watch the progress bar — it shows both scenario VU counts.

If you see an error like `cannot use both http and browser in the same VU`, double-check that the `browser` option block is only inside the `browser_check` scenario, not at the top level.

### Step 5: Read the Mixed Output

After the test completes, the summary shows metrics from both scenarios interleaved. Here is what to look for:

```
     browser_dom_content_loaded.....: avg=245ms  min=210ms  med=240ms  max=290ms
     browser_first_contentful_paint.: avg=310ms  min=280ms  med=305ms  max=360ms
     browser_loaded.................: avg=430ms  min=390ms  med=425ms  max=510ms
     checks.........................: 100.00% ✓ 62  ✗ 0
     http_req_duration..............: avg=8.2ms  min=2.1ms  med=7.5ms  max=45ms  p(90)=14ms p(95)=18ms
     http_req_failed................: 0.00%   ✓ 0   ✗ 150
     iterations.....................: 212     6.98/s
```

| Metric | Source scenario |
|---|---|
| `browser_dom_content_loaded` | `browser_check` — Chromium timing |
| `browser_first_contentful_paint` | `browser_check` — Web Vital |
| `browser_loaded` | `browser_check` — full page load |
| `http_req_duration` | `api_load` — HTTP VUs |
| `http_req_failed` | `api_load` — HTTP VUs |

You can also filter the per-scenario iteration counts: look for `apiTest` and `browserTest` labels in the iterations breakdown if your k6 version prints per-scenario stats.

The `iterations` count will be much higher for `api_load` than `browser_check` — that is expected. Five fast HTTP VUs will complete many more iterations per second than one browser VU navigating a full page.

### Step 6: Export to InfluxDB and View in Grafana

Run the complete solution script with InfluxDB output:

```bash
K6_BROWSER_HEADLESS=true k6 run \
  --out influxdb=http://localhost:8086/k6 \
  scripts/solutions/lab-16-solution.js
```

This writes all metrics — both HTTP and browser — to InfluxDB in real time.

Open Grafana at http://localhost:3030 (admin / admin) and navigate to the k6 dashboard. You will see:

- Request rate and latency graphs populated by the API VUs
- Browser timing panels (FCP, DOMContentLoaded, loaded) populated by the browser VU
- Both sets of metrics on the same time axis, so you can correlate browser slowdowns with API load spikes

### Step 7: Interpret the Combined View

Look at the timeline in Grafana while the test runs (or immediately after):

1. Do `browser_first_contentful_paint` values increase as `http_req_duration` p95 climbs? If so, backend latency is affecting browser render time.
2. Is `http_req_failed` 0% throughout? If not, the API broke under load — and the browser check likely also failed.
3. Is the browser check consistently passing even at peak API load? That confirms the frontend remains functional under the load level you tested.

This correlation — in a single dashboard, from a single test run — is the core value of mixed testing.

## Expected Output

Running the starter with 5 API VUs + 1 browser VU for 30 seconds:

```
  execution: local
     script: scripts/starters/lab-16-starter.js
     output: -

  scenarios: (100.00%) 2 scenarios, 6 max VUs, 1m0s max duration (incl. graceful stop):
           * api_load: 5 looping VUs for 30s (exec: apiTest, gracefulStop: 30s)
           * browser_check: 1 looping VUs for 30s (exec: browserTest, gracefulStop: 30s)

INFO[0002] Browser VU — page title: Demo Store          source=console

✓ api: products status 200
✓ api: products response < 300ms
✓ api: login response received
✓ browser: page title is not empty
✓ browser: body has content

     browser_dom_content_loaded.....: avg=250ms
     browser_first_contentful_paint.: avg=315ms
     checks.........................: 100.00% ✓ 68  ✗ 0
     http_req_duration..............: avg=9ms  p(90)=16ms p(95)=21ms
     http_req_failed................: 0.00%
     iterations.....................: 220     7.3/s
```

A `mixed-test-screenshot.png` file will also appear in the current directory.

## Key Takeaways

- `options.scenarios` lets you run multiple independent executor groups from one script, each calling a different exported function via the `exec` property.
- Only scenarios with `options: { browser: { type: 'chromium' } }` activate the browser module. HTTP functions and browser functions coexist in the same file without conflict.
- Mixed tests let you validate two things simultaneously: backend throughput under load (HTTP VUs) and frontend correctness under that same load (browser VU).
- Both HTTP and browser metrics flow into the same InfluxDB/Grafana output, enabling direct timeline correlation.
- In production load tests, a common pattern is 50–100 API VUs with 1–2 browser VUs. The browser VUs add minimal load but provide continuous UI health validation.
- DataDog requires separate Load tests and Browser tests with manual result correlation. k6 unifies both into one script, one run, and one metrics stream.
