# Lab 29: Capstone — End-to-End Observability with k6 and Grafana

**Time:** 40 min | **Module:** Module 4 — Capstone

## Overview

This capstone brings together everything from the workshop. You'll take a full-stack observability scenario — monitoring a checkout user flow — from local load testing through synthetic monitoring, SLOs, and alerting. This mirrors the implementation you'd do for a production service on your first week with the Grafana stack.

**The scenario:** Your team just shipped a new checkout feature. Before going live, you need to: (1) validate it performs correctly under load, (2) set up continuous synthetic monitoring so you know immediately if it breaks in production, (3) define an SLO so you can measure reliability over time, and (4) configure alerts so the right people are paged if the SLO is at risk.

**The target:** The demo-app checkout flow:
```
GET /api/products  →  POST /login  →  POST /checkout
```

By the end of this lab, you will have built a complete, working observability stack for this flow — and you'll understand exactly where each piece lives in Grafana and how it connects to the equivalent DD setup you came from.

## What You'll Learn

- How to write a realistic multi-group load test with thresholds and custom metrics
- How to visualize load test results live in Grafana with InfluxDB output
- How to convert a load test script into an SM scripted check
- How to define a Grafana SLO with an error budget on a synthetic check
- How to wire burn rate alerts to a contact point
- How the complete stack compares to the equivalent DataDog implementation

## Prerequisites

- All previous labs completed (1–28 reviewed; the following are directly referenced)
  - Lab 04: groups and tags
  - Lab 05: parameterization and SharedArray
  - Lab 06: InfluxDB + Grafana output
  - Lab 13: SM scripted check upload
  - Lab 20: custom metrics
  - Lab 22: alerting and contact points
  - Lab 23: SLOs
  - Lab 25: private probes (optional but useful for Phase 2)

---

## Instructions

---

## Phase 1: Load Test the Checkout Flow (15 min)

### Step 1: Examine the Starter Script

Open `scripts/starters/lab-29-starter.js`. It provides the skeleton of the checkout flow with all the structural pieces in place but the implementation left for you:

```javascript
// TODO: import http, check, sleep, group
// TODO: import SharedArray for test user data
// TODO: import Counter, Rate for custom business metrics

// TODO: define options:
//   stages: ramp to 5 VUs over 30s, sustain 2 min, ramp down 30s
//   thresholds: p95 < 500ms, http_req_failed < 1%, checkout_success rate > 99%

// TODO: load test users from a data file or inline array via SharedArray

export default function () {
  // TODO: group('browse', () => {
  //   GET /api/products
  //   check: status 200, returns array
  // });

  // TODO: group('authenticate', () => {
  //   POST /login with JSON body
  //   check: status 200, token present
  //   extract token for next step
  // });

  // TODO: group('checkout', () => {
  //   POST /checkout with cartId and userId
  //   check: status 200 or 201, order confirmed
  //   increment orders_placed counter
  //   track checkout_success rate
  // });

  // TODO: sleep(1)
}
```

Study the skeleton before writing anything. Notice the four concerns: imports, options (including thresholds), data loading, and the three-group default function.

---

### Step 2: Complete the Script

Write the full implementation. Use the solution at `scripts/solutions/lab-29-solution.js` as a reference if you get stuck.

Key requirements:

- **Groups:** `browse`, `authenticate`, and `checkout` — these appear separately in the Grafana k6 dashboard and make it easy to see which phase has latency
- **Checks on every response:** don't let a failed login silently break the checkout step
- **Token passing:** extract the auth token from the login response and use it in the checkout request
- **Thresholds:**
  - `http_req_duration{group:::browse}: p(95)<500`
  - `http_req_duration{group:::authenticate}: p(95)<500`
  - `http_req_duration{group:::checkout}: p(95)<500`
  - `http_req_failed: rate<0.01`
  - `checkout_success: rate>0.99`
- **Custom metrics:** a `Counter` named `orders_placed` and a `Rate` named `checkout_success`

---

### Step 3: Run with InfluxDB Output

```bash
k6 run --out influxdb=http://localhost:8086/k6 scripts/solutions/lab-29-solution.js
```

Watch the real-time progress output. You should see the stages ramp up from 1 VU to 5 VUs and back down. While the test runs, move on to Step 4.

---

### Step 4: View Results in Grafana

Open `http://localhost:3030` and navigate to the **k6 Load Testing Results** dashboard (it should be pre-imported from Lab 06).

While the test is running (or after it finishes):

1. Select your test run from the run ID dropdown
2. Look at the **Request Duration** panel — you should see three distinct lines for the three groups
3. Check the **VUs** panel to confirm the ramp-up stages executed correctly
4. After the run: verify the **Threshold Results** panel shows all thresholds passing (green)
5. Look for your custom metrics: `orders_placed` (counter) and `checkout_success` (rate) should appear in the **Custom Metrics** panel

If any threshold fails, check which group has elevated latency and examine the demo-app logs.

---

## Phase 2: Set Up Synthetic Monitoring (10 min)

### Step 5: Adapt the Script for SM

The load test script runs for a defined duration. An SM scripted check runs once per probe execution (SM calls the default function once, on its schedule). You need to adapt the script:

1. Copy `scripts/solutions/lab-29-solution.js` to a new file: `scripts/solutions/lab-29-sm-check.js` (you can do this in your editor)
2. Remove the `export const options` block — SM ignores it and manages scheduling
3. Change the target URL: for a real production deployment you'd point to a staging URL that SM probes can reach. For this workshop, use `https://httpbin.org/post` as a stand-in for the checkout endpoint, or configure a private probe (Step 7)
4. Keep all the checks and groups — they appear as named assertions in SM's check result view

The adapted script should look like this at the top:

```javascript
// SM Scripted Check — no options block
import http from 'k6/http';
import { check, group } from 'k6';
// Note: sleep() is optional in SM scripted checks; SM controls timing

export default function () {
  // Same groups and checks as the load test
  // Just no stages, no SharedArray (use a fixed test user)
}
```

---

### Step 6: Upload to SM

1. Open Grafana → **Testing & synthetics → Synthetics → Checks**
2. Click **+ Create new check** → click the **Scripted** card
3. Paste or upload the adapted script
4. Configure:
   - **Job name:** `Checkout Flow`
   - **Target:** `http://localhost:3000` (or your staging URL)
   - **Frequency:** 5 minutes
   - **Probes:** select 3 probe locations (US East, EU West, AP Singapore)
   - **Labels:** `service=checkout`, `env=prod`, `team=backend`
5. Save and verify the check runs successfully — it should show green within 5 minutes

### Step 7 (Optional — Lab 25 required): Route Through Private Probe

If you completed Lab 25 and have a private probe registered:

1. In the SM check configuration, deselect the public probes
2. Select your private probe
3. Set the target to `http://localhost:3000/api/products` — the private probe can reach localhost
4. This is how you'd monitor an internal service that public probes can't reach

---

### Step 8: Add an HTTP Availability Check

Alongside the scripted check, create a simple HTTP availability monitor:

1. **+ Create new check** → **API Endpoint** card (HTTP is the default request type)
2. Target: `http://localhost:3000/health`
3. Job name: `Checkout Service Health`
4. Frequency: 1 minute (faster than the scripted check — cheap to run)
5. Probes: same 3 locations
6. Expected status: 200

You now have two complementary checks: a deep scripted check that validates the full checkout flow every 5 minutes, and a lightweight health endpoint check every minute that gives you faster signal on outages.

---

## Phase 3: Define an SLO (5 min)

### Step 9: Create the SLO

Your checkout flow is now generating synthetic monitoring data. Turn that into an SLO:

1. Open Grafana → expand **Alerts & IRM** in the sidebar → click **SLO** (or navigate directly to `/a/grafana-slo-app/`)
2. Click **Create SLO**
3. Configure:
   - **Name:** `Checkout Flow SLO`
   - **Description:** `99.5% of checkout scripted check executions succeed over a 7-day window`
   - **SLI:** select **Ratio** → **Success Rate**
   - **Query:** choose your `Checkout Flow` scripted check as the source
   - **Target:** `99.5%`
   - **Time window:** rolling `7 days`
4. Save the SLO

Grafana automatically calculates the error budget: with 99.5% target over 7 days, you have ~50 minutes of allowable failure time per week.

---

## Phase 4: Configure Alerting (5 min)

### Step 10: Add a Burn Rate Alert to the SLO

A 99.5% SLO is only useful if you're alerted when you're burning through the error budget faster than you can afford.

1. On the SLO you just created, click **Add Alert**
2. Configure a fast burn alert:
   - **Burn rate:** `14x`
   - **Window:** `5 minutes`
   - **Severity label:** `severity=critical`
   - This means: if errors are arriving 14 times faster than the SLO allows, page immediately
3. (Optional) Add a slow burn alert:
   - **Burn rate:** `2x`
   - **Window:** `1 hour`
   - **Severity label:** `severity=warning`
   - This catches gradual degradation before it consumes too much budget

### Step 11: Verify the Contact Point

1. Navigate to **Alerting > Contact Points**
2. If you created a contact point in Lab 22, verify it is still configured
3. Click **Test** to send a test notification
4. Ensure your Notification Policy routes `severity=critical` to the contact point

The SLO burn rate alert will now fire through your Notification Policy routing tree — the same one you configured in Lab 22 and reviewed conceptually in Lab 28.

---

## Phase 5: Reflection (5 min)

### Step 12: The Full Picture

You just built a complete observability stack from scratch. Compare it to the equivalent DataDog implementation:

| What you built | k6 / Grafana approach | DataDog equivalent |
|---|---|---|
| Load test | k6 local run with stages, groups, thresholds | DD Synthetic Load Testing (limited scripting, hosted only) |
| Scripted synthetic monitor | SM Scripted Check (k6 JavaScript) | DD Multistep API Test (step-builder UI) |
| Uptime / availability check | SM HTTP Check | DD Synthetic API Test |
| SLO | Grafana SM SLO (error budget + burn rate) | DD SLO (monitor-based, requires monitors as SLI source) |
| SLO burn rate alert | Grafana Alert Rule (auto-generated from SLO) | DD SLO alert |
| Metric alert (latency) | Grafana Alert Rule + PromQL | DD Monitor (metric alert) |
| Notification routing | Grafana Notification Policy (label-based routing) | DD Monitor message with @-handles |
| Dashboard | Grafana (auto-generated from SM data) | DD Dashboard |
| All in one platform? | Yes — Grafana Cloud unifies all of the above | Requires DD Synthetics + APM + Monitors + SLOs — same platform, separate product areas |
| Script format | Open k6 JavaScript (runs anywhere) | DD proprietary test format |
| Open source core | k6 OSS is free forever for local execution | DD agent is proprietary; no open-source load testing equivalent |
| Custom metrics cost | Included in k6 metrics series — no per-metric surcharge | DD charges per custom metric beyond the included count |

### Step 13: What You've Mastered

Look back at what a single week with this stack gives you:

**One language (k6 JavaScript) powers three use cases:**
- Local load testing with stages, thresholds, and custom metrics
- SM scripted checks for continuous synthetic monitoring
- SM browser checks for UI validation

**One platform (Grafana) unifies all signal types:**
- Load test results (InfluxDB → Grafana dashboard)
- Synthetic monitoring status and history
- SLO error budget tracking
- Alert rules and notification routing

**One mental model (check → SLO → alert) applies everywhere:**
- A passing check is a probe_success=1 data point
- An SLO defines how many failures are acceptable over time
- A burn rate alert tells you when you're failing too fast

This is the same model DD uses, just implemented with open standards, open-source tooling, and a query language (PromQL) that transfers to any Prometheus-compatible system.

---

## Expected Output

After completing all phases, you should have:

**Terminal (Phase 1):**
```
  ✓ products status 200
  ✓ products is array
  ✓ login status 200
  ✓ login has token
  ✓ checkout status 2xx
  ✓ checkout confirmed

  checks.........................: 100.00% ✓ 360  ✗ 0
  http_req_duration..............: avg=8.4ms   p(95)=21.3ms
  http_req_failed................: 0.00%
  orders_placed..................: 60
  checkout_success...............: 100.00% ✓ 60   ✗ 0

  ✓ http_req_duration{group:::browse}: p(95)<500
  ✓ http_req_duration{group:::authenticate}: p(95)<500
  ✓ http_req_duration{group:::checkout}: p(95)<500
  ✓ http_req_failed: rate<0.01
  ✓ checkout_success: rate>0.99
```

**Grafana (Phase 2):** SM check shows green for all probe locations within 5 minutes of creation.

**Grafana (Phase 3):** SLO dashboard shows 100% success rate and full error budget intact.

**Grafana (Phase 4):** Alert rule is in `Normal` state. Test notification delivered to contact point.

## Key Takeaways

- One k6 script, lightly adapted, serves both as a load test and as an SM scripted check — there is no second language or second skill to maintain
- Groups (`group()`) are not just organizational; they become filterable dimensions in Grafana dashboards and SM check results
- Custom metrics (`Counter`, `Rate`) let you track business outcomes (orders placed, checkout success rate) alongside infrastructure metrics — no separate instrumentation pipeline needed
- The SLO → burn rate alert pipeline is the most important alerting pattern to adopt: it tells you when reliability is degrading at a pace that matters, not just that a single check failed
- Grafana Notification Policies decouple who gets paged from what fires the alert — change your on-call rotation without touching alert rules
- Everything you built today is open-format: the k6 scripts are plain JavaScript files you own, version-control, and can run in any CI/CD pipeline without a Grafana account
