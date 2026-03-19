import http from 'k6/http';
import { check, sleep } from 'k6';

// TODO: Import Counter, Gauge, Rate, and Trend from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// TODO: Create four custom metrics:
//   ordersPlaced    — Counter   — tracks total successful checkouts
//   activeUsers     — Gauge     — tracks the current VU number (last value wins)
//   loginSuccessRate — Rate     — tracks proportion of logins that return 200
//   cartValueTrend  — Trend     — tracks the distribution of cart totals in USD
//                                 (isTime = false, since this is a dollar value)

export const options = {
  vus: 3,
  duration: '30s',
  thresholds: {
    // TODO: Add thresholds for your custom metrics:
    //   login_success_rate: at least 95% must succeed
    //   orders_placed:      at least 10 orders must complete
    //   cart_value_usd:     p(95) must be under $200
    'http_req_duration': ['p(95)<500'],
  },
};

export default function () {
  // Record the active VU number as a Gauge snapshot
  // TODO: activeUsers.add(__VU);

  // --- POST /login ---
  const loginPayload = JSON.stringify({ username: 'user1', password: 'pass1' });
  const loginParams = { headers: { 'Content-Type': 'application/json' } };
  const loginRes = http.post(`${BASE_URL}/login`, loginPayload, loginParams);

  check(loginRes, {
    'login status 200': (r) => r.status === 200,
  });

  // TODO: Record login success/failure in loginSuccessRate.
  // Hint: loginRes.status === 200 gives you a boolean.

  sleep(1);

  // --- GET /api/products ---
  const productsRes = http.get(`${BASE_URL}/api/products`);

  check(productsRes, {
    'products status 200': (r) => r.status === 200,
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

  // TODO: If checkout returned 201:
  //   1. Increment ordersPlaced by 1
  //   2. Parse the response body as JSON
  //   3. If body.total exists, add parseFloat(body.total) to cartValueTrend
  //      with a tag { product_category: 'general' }

  sleep(1);
}
