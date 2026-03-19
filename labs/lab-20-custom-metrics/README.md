# Lab 20: Custom Metrics — Counter, Gauge, Rate, and Trend

**Time:** 20 min | **Module:** Module 3 — Advanced

## Overview

k6's built-in metrics tell you how fast your HTTP requests were. Custom metrics tell you whether your *business logic* is working correctly. This lab implements all four metric types — Counter, Gauge, Rate, and Trend — to track domain-specific KPIs like login success rate, orders placed, and cart value distribution. Custom metrics appear in the CLI summary alongside built-ins, can have thresholds, and flow through to Grafana dashboards exactly like any other metric.

Lab 04 introduced Counter briefly. This lab goes deep on all four types.

## What You'll Learn

- The purpose and behavior of all four k6 custom metric types
- How to create and record custom metrics in a test script
- How to add thresholds to custom metrics
- How to tag metric samples for Grafana dashboard filtering
- How to view custom metrics in InfluxDB via Grafana Explore
- The k6 vs DataDog custom metric pricing story

## Prerequisites

- Labs 01–08 completed (especially lab 06 for InfluxDB/Grafana)
- demo-app running at http://localhost:3000
- InfluxDB running at http://localhost:8086
- Grafana running at http://localhost:3030 (admin/admin)

## Instructions

### Step 1: The Four Metric Types

| Type | What it tracks | Value behavior | Example use case |
|------|---------------|----------------|-----------------|
| `Counter` | Cumulative sum | Always increases | Total orders placed, total 5xx errors |
| `Gauge` | Current point-in-time value | Last sample wins | Active sessions, queue depth |
| `Rate` | Ratio of truthy (non-zero) adds | Value between 0–1 | Login success rate, cache hit rate |
| `Trend` | Statistical distribution | Stores all samples; reports min/max/avg/percentiles | Cart total, page size, upload duration |

Key behavioral notes:
- **Counter** — adding `1` ten times gives you `count=10`. It never decreases within a run.
- **Gauge** — adding `5` then `3` gives you the *last* value, `3`. Useful for snapshotting a current state.
- **Rate** — `add(true)` and `add(1)` count as truthy; `add(false)` and `add(0)` count as falsy. The reported value is `truthy / total`.
- **Trend** — stores every sample and reports p(50), p(90), p(95), p(99), min, max, avg. The second constructor argument `isTime` controls whether the summary displays in milliseconds (`true`) or raw units (`false`).

### Step 2: Import and Define Custom Metrics

Open `scripts/starters/lab-20-starter.js`. At the top of the file, after your existing imports, add:

```javascript
import { Counter, Gauge, Rate, Trend } from 'k6/metrics';

// Counter: total number of successful orders across the entire run
const ordersPlaced = new Counter('orders_placed');

// Gauge: current active VU count (snapshot — last value wins)
const activeUsers = new Gauge('active_users');

// Rate: proportion of login attempts that succeed
const loginSuccessRate = new Rate('login_success_rate');

// Trend: distribution of cart total values in USD
// isTime=false because this is a dollar value, not a duration
const cartValueTrend = new Trend('cart_value_usd', false);
```

These four lines create the metric objects. Nothing is recorded yet — that happens in the default function when you call `.add()`.

### Step 3: Record Metric Values in the Test Loop

Add the recording calls inside `default`:

**Rate — login success:**
```javascript
const loginRes = http.post(
  'http://localhost:3000/login',
  JSON.stringify({ username: 'user1', password: 'pass1' }),
  { headers: { 'Content-Type': 'application/json' } }
);
// add() accepts boolean, number, or expression — truthy = success
loginSuccessRate.add(loginRes.status === 200);
```

**Counter and Trend — orders placed and cart value:**
```javascript
const checkoutPayload = JSON.stringify({ cartId: 'cart-001', userId: 'user-1' });
const checkoutRes = http.post(
  'http://localhost:3000/checkout',
  checkoutPayload,
  { headers: { 'Content-Type': 'application/json' } }
);

if (checkoutRes.status === 201) {
  ordersPlaced.add(1);

  try {
    const body = JSON.parse(checkoutRes.body);
    if (body.total) {
      cartValueTrend.add(parseFloat(body.total));
    }
  } catch (_) {
    console.warn(`VU ${__VU}: could not parse checkout body`);
  }
}
```

**Gauge — active VU snapshot:**
```javascript
// Record which VU numbers are active. Since Gauge keeps the last value,
// this reflects the highest-numbered active VU at any moment.
// More useful patterns: track queue depth from an API endpoint,
// or record the current memory usage returned by a /metrics endpoint.
activeUsers.add(__VU);
```

Run the starter to see the custom metrics in the CLI summary:

```bash
k6 run scripts/starters/lab-20-starter.js
```

At the bottom of the summary you should now see `orders_placed`, `active_users`, `login_success_rate`, and `cart_value_usd` alongside the standard `http_req_duration` metrics.

### Step 4: Add Thresholds on Custom Metrics

Custom metrics support the same threshold syntax as built-in metrics. Add these to your `options`:

```javascript
export const options = {
  vus: 3,
  duration: '30s',
  thresholds: {
    // At least 95% of login attempts must succeed
    'login_success_rate': ['rate>0.95'],

    // At least 10 orders must complete during the run
    'orders_placed': ['count>10'],

    // 95th percentile cart value must be under $200
    'cart_value_usd': ['p(95)<200'],

    // Standard HTTP latency threshold still applies
    'http_req_duration': ['p(95)<500'],
  },
};
```

If any threshold fails, k6 exits with a non-zero status code — which causes CI pipelines to fail the build. This is how you enforce business SLOs, not just infrastructure SLOs.

Run the solution and observe threshold pass/fail indicators in the summary:

```bash
k6 run scripts/solutions/lab-20-solution.js
```

### Step 5: Tag Metric Samples for Dashboard Filtering

Tags added to a `.add()` call are stored with the sample and available as label filters in Grafana:

```javascript
// Tag by product category so you can compare cart values per category
// in a Grafana panel using a group-by filter
cartValueTrend.add(parseFloat(body.total), { product_category: 'electronics' });

// Tag login success rate by user tier
loginSuccessRate.add(loginRes.status === 200, { user_tier: 'premium' });
```

Tags appear as fields in InfluxDB and as labels in Prometheus. In Grafana, you can build panels that break down `cart_value_usd` by `product_category` using a simple tag filter — exactly the same as you would filter DataDog custom metrics by tag, but with no per-distinct-tag-combination pricing.

### Step 6: View Custom Metrics in Grafana

Run the solution with InfluxDB output:

```bash
k6 run --out influxdb=http://localhost:8086/k6 scripts/solutions/lab-20-solution.js
```

Then open Grafana at http://localhost:3030 (admin/admin):

1. Click **Explore** in the left sidebar
2. Select the **InfluxDB** data source from the dropdown
3. Switch to **raw query mode** and enter:
   ```
   SELECT * FROM "orders_placed" WHERE time > now() - 5m
   ```
4. Try querying `login_success_rate`:
   ```
   SELECT mean("value") FROM "login_success_rate" WHERE time > now() - 5m GROUP BY time(10s)
   ```
5. For the Trend metric, query percentiles:
   ```
   SELECT percentile("value", 95) FROM "cart_value_usd" WHERE time > now() - 5m
   ```

Each custom metric is a separate measurement in InfluxDB, stored identically to built-in metrics. You can build dashboards, set alerts, and create SLO panels on them exactly as you would on `http_req_duration`.

### Step 7: Custom Metrics Summary and CLI Output

After the run completes, the CLI summary shows all custom metrics:

```
custom metrics
  cart_value_usd.............: avg=84.50 min=12.99 med=74.99 max=249.99 p(90)=149.99 p(95)=199.99
  login_success_rate.........: 97.22%   ✓ 35   ✗ 1
  orders_placed..............: 18       0.6/s
  active_users...............: 3        min=1    max=3
```

Counter shows both the total count and the rate per second. Rate shows the percentage plus raw truthy/falsy counts. Trend shows the full statistical distribution. Gauge shows the last recorded value with min/max seen.

## Expected Output

```bash
k6 run scripts/solutions/lab-20-solution.js
```

```
  ✓ checks.........................: 100.00% ✓ 90   ✗ 0

  cart_value_usd.................: avg=84.50  min=12.99  med=74.99  max=249.99  p(90)=149.99  p(95)=199.99
  login_success_rate.............: 100.00%   ✓ 30   ✗ 0
  orders_placed..................: 15        0.5/s
  active_users...................: 3         min=1   max=3
  http_req_duration..............: avg=8.2ms  min=2.1ms  med=6.9ms  max=42ms  p(90)=14ms  p(95)=18ms
  http_req_failed................: 0.00%     ✓ 0    ✗ 90

  ✓ login_success_rate.........: rate>0.95
  ✓ orders_placed..............: count>10
  ✓ cart_value_usd.............: p(95)<200
  ✓ http_req_duration..........: p(95)<500
```

## Key Takeaways

- Counter, Gauge, Rate, and Trend each have distinct semantics — pick the type that matches how the value behaves in reality
- Custom metrics appear in CLI output, InfluxDB, Prometheus, and Grafana exactly like built-in metrics
- Thresholds on custom metrics enforce business SLOs in CI — not just infrastructure SLOs
- Tags on `.add()` calls enable dashboard filtering without creating separate metrics
- DataDog charges per custom metric and per distinct tag value combination — a common source of bill shock at scale. k6 Cloud and the open-source stack have no per-metric pricing, making it practical to define as many domain-specific metrics as your tests need.
