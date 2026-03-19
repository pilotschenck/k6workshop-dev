/**
 * Lab 29 Solution: End-to-End Checkout Flow Load Test
 *
 * Covers:
 *   - Multi-stage load profile (ramp up → sustain → ramp down)
 *   - Three groups: browse, authenticate, checkout
 *   - Checks on every response
 *   - Token extraction and passing between groups
 *   - Custom business metrics: orders_placed (Counter), checkout_success (Rate)
 *   - Group-scoped thresholds
 *   - Tags for InfluxDB / Grafana filtering
 *
 * Run locally:
 *   k6 run scripts/solutions/lab-29-solution.js
 *
 * Run with Grafana/InfluxDB output (Lab 06):
 *   k6 run --out influxdb=http://localhost:8086/k6 scripts/solutions/lab-29-solution.js
 *
 * Adapting for SM Scripted Check (Phase 2):
 *   - Remove the export const options block
 *   - Replace SharedArray with a single hard-coded test user
 *   - SM calls default() once per scheduled execution
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// ── Custom business metrics ──────────────────────────────────────────────────

// Track how many orders were successfully placed during the run.
// This is a business KPI, not just an infrastructure metric.
const ordersPlaced = new Counter('orders_placed');

// Track the end-to-end checkout success rate.
// A checkout is "successful" if all three groups passed their checks.
const checkoutSuccess = new Rate('checkout_success');

// ── Test users ────────────────────────────────────────────────────────────────
// SharedArray loads the data once in the main thread and shares it read-only
// across all VUs — memory-efficient for large user lists.
const users = new SharedArray('users', function () {
  return [
    { username: 'testuser',  password: 'testpass',  userId: 'user-001' },
    { username: 'testuser2', password: 'testpass2', userId: 'user-002' },
    { username: 'testuser3', password: 'testpass3', userId: 'user-003' },
  ];
});

// ── Options ───────────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '30s', target: 5  },   // ramp up
    { duration: '2m',  target: 5  },   // sustain
    { duration: '30s', target: 0  },   // ramp down
  ],
  thresholds: {
    // Group-scoped duration thresholds — each group must stay under 500ms P95
    // k6 group names are prefixed with '::' in metric tags
    'http_req_duration{group:::browse}':       ['p(95)<500'],
    'http_req_duration{group:::authenticate}': ['p(95)<500'],
    'http_req_duration{group:::checkout}':     ['p(95)<500'],

    // Overall thresholds
    'http_req_failed': ['rate<0.01'],   // < 1% error rate
    'checks':          ['rate>0.99'],   // > 99% of all checks pass

    // Business KPI threshold — checkout success rate must stay above 99%
    'checkout_success': ['rate>0.99'],
  },
};

// ── Default function ──────────────────────────────────────────────────────────
export default function () {
  // Each VU picks a user from the shared array based on its VU number.
  // __VU is 1-indexed; modulo maps it into the array bounds.
  const user = users[(__VU - 1) % users.length];

  // Track whether this full iteration succeeded end-to-end
  let browseOk       = false;
  let authenticateOk = false;
  let checkoutOk     = false;

  let token     = null;
  let productId = null;

  // ── Group: browse ─────────────────────────────────────────────────────────
  group('browse', () => {
    const res = http.get('http://localhost:3000/api/products', {
      tags: { endpoint: 'products' },
    });

    browseOk = check(res, {
      'products status 200': (r) => r.status === 200,
      'products is array':   (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body) && body.length > 0;
        } catch (_) {
          return false;
        }
      },
    });

    // Extract a product ID for use in the checkout step
    if (browseOk) {
      try {
        const products = JSON.parse(res.body);
        productId = products[0].id || products[0]._id || 'product-001';
      } catch (_) {
        productId = 'product-001';
      }
    }
  });

  // ── Group: authenticate ───────────────────────────────────────────────────
  group('authenticate', () => {
    const payload = JSON.stringify({
      username: user.username,
      password: user.password,
    });

    const res = http.post('http://localhost:3000/login', payload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'login' },
    });

    authenticateOk = check(res, {
      'login status 200': (r) => r.status === 200,
      'login has token':  (r) => {
        try {
          return JSON.parse(r.body).token !== undefined;
        } catch (_) {
          return false;
        }
      },
    });

    // Extract the token for the checkout step
    if (authenticateOk) {
      try {
        token = JSON.parse(res.body).token;
      } catch (_) {
        token = null;
      }
    }
  });

  // ── Group: checkout ───────────────────────────────────────────────────────
  group('checkout', () => {
    const payload = JSON.stringify({
      cartId: `cart-${user.userId}`,
      userId: user.userId,
      productId: productId,
    });

    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = http.post('http://localhost:3000/checkout', payload, {
      headers: headers,
      tags: { endpoint: 'checkout' },
    });

    checkoutOk = check(res, {
      'checkout status 2xx': (r) => r.status >= 200 && r.status < 300,
      'checkout confirmed':  (r) => {
        // Accept either a JSON body with a confirmation field, or any 2xx
        if (r.status < 200 || r.status >= 300) return false;
        try {
          const body = JSON.parse(r.body);
          // Look for common confirmation patterns
          return (
            body.orderId !== undefined ||
            body.order_id !== undefined ||
            body.confirmed === true ||
            body.status === 'success' ||
            body.message !== undefined
          );
        } catch (_) {
          // If not JSON, a 2xx status is sufficient confirmation
          return r.status >= 200 && r.status < 300;
        }
      },
    });

    // Record business metrics
    if (checkoutOk) {
      ordersPlaced.add(1);
    }
  });

  // The checkout flow is a success only if all three groups passed
  const flowSucceeded = browseOk && authenticateOk && checkoutOk;
  checkoutSuccess.add(flowSucceeded);

  // Simulate realistic user think-time between iterations
  sleep(1);
}
