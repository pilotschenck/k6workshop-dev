// Lab 20 Solution: Custom Metrics — Counter, Gauge, Rate, and Trend
//
// Run locally (CLI summary only):
//   k6 run scripts/solutions/lab-20-solution.js
//
// Run with InfluxDB output (view in Grafana at http://localhost:3030):
//   k6 run --out influxdb=http://localhost:8086/k6 scripts/solutions/lab-20-solution.js
//
// Query custom metrics in Grafana Explore (InfluxDB data source):
//   SELECT * FROM "orders_placed" WHERE time > now() - 5m
//   SELECT mean("value") FROM "login_success_rate" WHERE time > now() - 5m GROUP BY time(10s)
//   SELECT percentile("value", 95) FROM "cart_value_usd" WHERE time > now() - 5m

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Gauge, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Counter: cumulative total of successful orders placed during the run.
// Increases by 1 each time a checkout returns 201. Never decreases.
const ordersPlaced = new Counter('orders_placed');

// Gauge: snapshot of the current active VU number.
// Reports the last value added — useful for tracking current state
// (e.g., queue depth from a /metrics endpoint, not just __VU).
const activeUsers = new Gauge('active_users');

// Rate: proportion of login attempts that returned HTTP 200.
// add(true) or add(1) = truthy sample; add(false) or add(0) = falsy sample.
// Reported as a percentage (e.g., 97.22%).
const loginSuccessRate = new Rate('login_success_rate');

// Trend: full statistical distribution of cart total values in USD.
// isTime=false means the summary labels are "units" not "ms".
// Reports min, max, avg, p(50), p(90), p(95), p(99).
const cartValueTrend = new Trend('cart_value_usd', false);

export const options = {
  vus: 3,
  duration: '30s',
  thresholds: {
    // Business SLOs on custom metrics — these fail the CI build if violated
    'login_success_rate': ['rate>0.95'],  // 95%+ of logins must succeed
    'orders_placed': ['count>10'],         // at least 10 orders must complete
    'cart_value_usd': ['p(95)<200'],      // 95th percentile cart value < $200

    // Standard infrastructure SLO
    'http_req_duration': ['p(95)<500'],
  },
};

export default function () {
  // Gauge: record which VU is active right now.
  // In a real test you might GET /admin/stats and record the returned
  // queue depth or session count instead of using __VU.
  activeUsers.add(__VU);

  // --- POST /login ---
  const loginPayload = JSON.stringify({ username: 'user1', password: 'pass1' });
  const loginParams = { headers: { 'Content-Type': 'application/json' } };
  const loginRes = http.post(`${BASE_URL}/login`, loginPayload, loginParams);

  check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'login response time < 1s': (r) => r.timings.duration < 1000,
  });

  // Rate: record whether this login attempt succeeded.
  // The Rate metric accumulates truthy/falsy counts across all VUs and
  // reports the ratio at the end of the run.
  loginSuccessRate.add(loginRes.status === 200);

  // Tag the rate sample by user tier for dashboard segmentation.
  // In Grafana you can filter the login_success_rate panel to show
  // only 'premium' users vs 'standard' users.
  loginSuccessRate.add(loginRes.status === 200, { user_tier: 'standard' });

  sleep(1);

  // --- GET /api/products ---
  const productsRes = http.get(`${BASE_URL}/api/products`);

  check(productsRes, {
    'products status 200': (r) => r.status === 200,
    'products response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // --- POST /checkout ---
  const checkoutPayload = JSON.stringify({ cartId: 'cart-001', userId: 'user-1' });
  const checkoutRes = http.post(
    `${BASE_URL}/checkout`,
    checkoutPayload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(checkoutRes, {
    'checkout status 201': (r) => r.status === 201,
  });

  if (checkoutRes.status === 201) {
    // Counter: increment for every successful order.
    // In the CLI summary this shows as "count=N   N/s"
    ordersPlaced.add(1);

    try {
      const body = JSON.parse(checkoutRes.body);
      if (body.total !== undefined) {
        const total = parseFloat(body.total);

        // Trend: record the cart value with a product_category tag.
        // This lets you build a Grafana panel breaking down cart value
        // distribution by category using a tag filter — no extra metrics needed.
        cartValueTrend.add(total, { product_category: 'general' });
      }
    } catch (_) {
      console.warn(
        `VU ${__VU} iter ${__ITER}: could not parse checkout response body`
      );
    }
  } else {
    console.error(
      `VU ${__VU} iter ${__ITER}: checkout FAILED — ` +
        `status=${checkoutRes.status} body=${checkoutRes.body.substring(0, 200)}`
    );
  }

  sleep(1);
}
