# Lab 17: Browser Synthetic Checks in Grafana SM

**Time:** 20 min | **Module:** Module 3 — Browser Testing

## Overview

Grafana Synthetic Monitoring supports browser checks — it runs a k6 browser script from cloud probe locations on a schedule, just like scripted HTTP checks but using a real Chromium browser. This lets you monitor critical user journeys (login flow, checkout, key page loads) from global locations continuously, capturing Web Vitals and screenshots on failure.

The defining advantage: SM browser checks are written in the same k6 JavaScript you already know. There is no separate recorder format or domain-specific language to learn. The same script you run locally with `k6 run` can be pasted directly into SM — the language is identical.

> **DataDog comparison:** DataDog Browser tests and k6/SM Browser checks both run real Chromium browsers. The key difference is the scripting language. DD Browser tests use a recorder-generated format that diverges from your performance test scripts. With k6 + SM you maintain ONE scripting language for both load testing and synthetic monitoring — the same skills, the same patterns, the same `check()` calls.

## What You'll Learn

- How to write a k6 browser script suitable for Grafana SM browser checks
- How to test the script locally before uploading to SM
- How to create a browser check in the SM UI
- How to interpret Web Vitals (LCP, FCP, CLS) per probe location in SM
- How to set duration assertions on browser checks
- The difference between SM browser checks and local k6 browser runs

## Prerequisites

- Labs 14–15 complete (browser module basics, navigation, interactions)
- Lab 13 complete (scripted checks in SM)
- A Grafana Cloud account (created during the pre-lab)
- Access to Grafana Cloud Synthetic Monitoring

## Instructions

### Step 1: Write the Browser Check Script

SM browser checks require a script that:
1. Includes the browser scenario config in `options` (SM validates the script structure)
2. Uses `async/await` throughout (browser APIs are async)
3. Targets a **publicly accessible URL** (SM probes run from the cloud, not from localhost)

For this lab we use `https://grafana.com` — publicly accessible and on-brand.

Open the solution script to see the full implementation:

```bash
cat scripts/solutions/lab-17-solution.js
```

The script structure looks like this:

```javascript
import { browser } from 'k6/browser';
import { check } from 'k6';

export const options = {
  scenarios: {
    browser_check: {
      executor: 'shared-iterations',
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
    await page.goto('https://grafana.com', { waitUntil: 'networkidle' });

    const title = await page.title();
    check(title, {
      'page title contains Grafana': (t) => t.includes('Grafana'),
    });

    // Wait for the main navigation to be visible
    await page.waitForSelector('nav', { timeout: 10000 });

    // Check a key element exists
    const bodyText = await page.locator('body').textContent();
    check(bodyText, {
      'hero content is present': (t) =>
        t.includes('Grafana') || t.includes('observability'),
    });

    await page.screenshot({ path: 'grafana-homepage.png' });
  } finally {
    await page.close();
  }
}
```

Key points about the SM browser script structure:
- Use `shared-iterations` as the executor. SM runs exactly one iteration per scheduled check, so `shared-iterations` with 1 VU is the right model.
- The `options.scenarios` block is **required even for SM**. SM validates that the script declares a browser scenario before accepting it.
- Screenshots captured via `page.screenshot()` during local runs are saved to disk. In SM, screenshots are captured automatically on assertion failures and displayed in the SM UI — you do not need to call `page.screenshot()` explicitly in the SM script, but it does not hurt to include it.

### Step 2: Test the Script Locally First

Always verify a SM script locally before uploading. This catches syntax errors, selector mismatches, and network issues before they become failing synthetic checks.

```bash
K6_BROWSER_HEADLESS=true k6 run scripts/solutions/lab-17-solution.js
```

Expected output:

```
INFO[0003] Page title: "Grafana: The open observability platform"   source=console

✓ page title contains Grafana
✓ hero content is present

     browser_dom_content_loaded.....: avg=1.2s
     browser_first_contentful_paint.: avg=1.4s
     browser_loaded.................: avg=3.1s
     checks.........................: 100.00% ✓ 2  ✗ 0
```

A `grafana-homepage.png` file will appear in the current directory. Open it to confirm the screenshot shows the Grafana homepage as expected.

If you see a `timeout` error waiting for `nav`, increase the `waitForSelector` timeout or change the selector to match the actual page structure. This is exactly why testing locally first matters — selector mismatches are much faster to debug here than in SM.

### Step 3: Upload the Script to SM

1. Open your Grafana Cloud instance and navigate to **Testing & synthetics → Synthetics → Checks** in the left sidebar.
2. Click **+ Create new check**.
3. On the check-type picker, click the **Browser** card. The form opens on a 5-step wizard: **Script → Uptime → Labels → Execution → Alerting**.
4. On the **Script** step, fill in:

| Field | Value |
|---|---|
| **Job name** | `Grafana Homepage Browser Check` |
| **Instance** | `https://grafana.com` (the URL your script navigates to — follows the Prometheus `job`/`instance` convention for metric labels) |
| **Script** | Select-all + delete the pre-populated k6-testing template, then paste the full content of `scripts/solutions/lab-17-solution.js` |

> **Heads-up:** the script editor pre-populates with a k6-testing template that imports `expect` from `k6-testing/0.5.0` and `check` from `k6-utils/1.5.0`. Our solution uses the plain `check` from `k6` — either style works, but don't mix them in the same script.

5. Advance through **Uptime** (defaults are fine) and **Labels** (skip). On **Execution**, select 2–3 probe locations (e.g., Ohio, Frankfurt, Singapore) and click the **10m** frequency pill. Browser checks are expensive — 10 minutes is the sensible workshop default.

6. Skip **Alerting** for now (covered in Lab 22) and click **Save** at the bottom right.

> **Why 10 minutes?** Browser checks launch a full Chromium instance, render the page, and execute JavaScript — they are significantly heavier than HTTP checks. Running them every 1–2 minutes as you would an HTTP check burns through your SM quota quickly. 10 minutes is a sensible default for non-critical pages; critical checkout flows might run every 5 minutes.

### Step 4: Run an Immediate Test

After saving the check, SM shows the check detail page. At the top right, click **Run now** (or the equivalent button in your SM version — it may say "Test" or show a play icon).

SM dispatches an immediate check from all selected probe locations. This typically completes within 10–30 seconds depending on probe latency.

Watch the **Latest results** panel update. You should see:
- A green checkmark from each probe location
- Response times listed per location
- No screenshots (since the checks passed)

If a check fails, SM automatically saves a screenshot from that probe. Click on the failed result to view the screenshot and the error message.

### Step 5: View Browser Check Results

Click into the check detail to explore the results panels:

**Summary panel:**
- Pass/fail rate across all probes and time
- Uptime percentage

**Results by location:**
- Each probe location shows its own latency and pass/fail history
- Locations that are consistently slower than others may indicate a CDN gap or regional backend issue

**Screenshots tab:**
- Only populated when a check fails
- The screenshot shows exactly what Chromium rendered at the moment of the assertion failure
- This is the SM equivalent of "what did the user actually see when things broke"

**Web Vitals panel:**
- `browser_web_vital_fcp` — First Contentful Paint: how long until the first pixel was rendered
- `browser_web_vital_lcp` — Largest Contentful Paint: how long until the main content was visible
- `browser_web_vital_cls` — Cumulative Layout Shift: how much the layout jumped around during load (lower is better)

Grafana SM surfaces these Web Vitals as metrics from every probe run, giving you a trending view of real-world page performance from multiple global locations — without instrumenting your frontend or deploying any agent.

### Step 6: Explore the Web Vitals Dashboard

In SM, navigate to the **Dashboards** tab for your browser check (or open the pre-built SM dashboard in Grafana).

Look for panels showing:
- **LCP over time** — is page load getting slower after deployments?
- **FCP by location** — is the Singapore probe consistently slower (CDN miss?)?
- **CLS trend** — did a recent CSS change introduce unexpected layout shifts?

These are the same Core Web Vitals that Google uses for SEO ranking. Catching CLS regressions in synthetic monitoring before users experience them is a concrete business value.

You can also open a Grafana Explore panel and query the SM Prometheus datasource directly:

```promql
# Average LCP across all probes for this check
avg by (probe) (probe_browser_web_vital_lcp{job="Grafana Homepage Browser Check"})
```

### Step 7: Add a Duration Assertion

Assertions in SM are additional pass/fail conditions layered on top of your script's `check()` calls. A common assertion is capping total check duration.

1. Open the check in SM and click **Edit**.
2. Scroll to the **Assertions** section.
3. Add a new assertion:
   - **Metric:** `Total Duration`
   - **Comparison:** `Less Than`
   - **Value:** `10000` (milliseconds — 10 seconds)
4. Save the check.

Now SM will mark the check as failed if the entire browser script takes longer than 10 seconds to complete, even if all `check()` calls pass. This catches degraded-but-not-broken states — the page loaded, but it took 12 seconds, which is unacceptable for users.

After saving, click **Run now** again. If the Grafana homepage loaded in under 10 seconds during your earlier test, the check should still pass. If it fails, increase the threshold or investigate why the check is slow from that probe location.

## SM Browser Checks vs Local k6 Browser Runs

| Capability | SM Browser Check | Local k6 Browser Run |
|---|---|---|
| Schedule | Automatic (every N minutes) | On-demand only |
| Probe locations | Multiple global cloud probes | Localhost only |
| VU count | 1 (per check execution) | 1 to hundreds |
| Screenshots | Automatic on failure | Manual `page.screenshot()` call |
| Web Vitals trending | Built-in, historical | Terminal summary only |
| Alerting | Native Grafana alerts | External integration required |
| Output | SM metrics in Grafana Cloud | InfluxDB, stdout, Grafana Cloud k6 |
| Script language | k6 JavaScript | k6 JavaScript (same) |

The script language row is the key insight: you write the same code for both. A script you develop and test locally with `k6 run` is the exact same script you paste into SM. There is no translation step, no format conversion, no proprietary DSL.

## Expected Output

Running locally with `K6_BROWSER_HEADLESS=true`:

```
  execution: local
     script: scripts/solutions/lab-17-solution.js
     output: -

  scenarios: (100.00%) 1 scenario, 1 max VUs, 10m30s max duration (incl. graceful stop):
           * browser_check: 1 iterations shared [exec: default] ...

INFO[0004] Page title: "Grafana: The open observability platform"  source=console
INFO[0004] Main nav visible — proceeding with content checks       source=console

✓ page title contains Grafana
✓ hero content is present

     browser_dom_content_loaded.....: avg=1.18s  min=1.18s  med=1.18s  max=1.18s
     browser_first_contentful_paint.: avg=1.42s  min=1.42s  med=1.42s  max=1.42s
     browser_loaded.................: avg=3.08s  min=3.08s  med=3.08s  max=3.08s
     browser_web_vital_cls..........: avg=0.02
     browser_web_vital_fcp..........: avg=1.42s
     browser_web_vital_lcp..........: avg=2.1s
     checks.........................: 100.00% ✓ 2  ✗ 0
```

In SM, the check detail page shows green results from each selected probe location and Web Vitals data populating within one check cycle.

## Key Takeaways

- SM browser checks are k6 browser scripts — the same language, the same `check()` calls, the same `async/await` patterns you learned in Labs 14–15.
- Scripts must include `options.scenarios` with a browser type block. SM validates this before accepting the script.
- SM browser checks target publicly accessible URLs. Test against `localhost` only in local runs.
- Always test your SM script locally first with `K6_BROWSER_HEADLESS=true k6 run` before uploading.
- SM automatically captures screenshots on assertion failures — no extra code needed.
- Web Vitals (FCP, LCP, CLS) are collected automatically by the browser module and surfaced as SM metrics, giving you trending performance data from multiple global locations.
- Frequency for browser checks should be lower than HTTP checks (10 min vs 1 min) because they are resource-intensive.
- Duration assertions in SM let you fail checks on slow-but-not-broken page loads without modifying the script.
