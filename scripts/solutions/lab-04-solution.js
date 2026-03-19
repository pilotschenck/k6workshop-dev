import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Custom Counter metric — appears in the summary alongside built-in metrics
const successfulCheckouts = new Counter('successful_checkouts');

export const options = {
  vus: 3,
  duration: '30s',
  // Test-level tags apply to every request in the test run
  tags: {
    environment: 'local',
    testType: 'load',
  },
};

export default function () {
  // --- Browse group ---
  // Represents an anonymous user viewing the product catalog
  group('browse', function () {
    const res = http.get(`${BASE_URL}/api/products`, {
      tags: { name: 'get-products', flow: 'browse' },
    });
    check(res, {
      'products status is 200': (r) => r.status === 200,
      'products body is not empty': (r) => r.body.length > 2,
    });
  });

  sleep(1);

  // --- Auth group ---
  // Represents a user logging in to get a session token
  group('auth', function () {
    const loginPayload = JSON.stringify({ username: 'user1', password: 'pass1' });
    const loginParams = {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'post-login', flow: 'auth' },
    };
    const loginRes = http.post(`${BASE_URL}/login`, loginPayload, loginParams);
    check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login response time < 1s': (r) => r.timings.duration < 1000,
    });
  });

  sleep(1);

  // --- Checkout group ---
  // Represents a user completing a purchase
  group('checkout', function () {
    const checkoutPayload = JSON.stringify({ cartId: 'cart-1', userId: 'user-1' });
    const checkoutParams = {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'post-checkout', flow: 'checkout' },
    };
    const checkoutRes = http.post(`${BASE_URL}/checkout`, checkoutPayload, checkoutParams);

    const ok = check(checkoutRes, {
      'checkout status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    });

    // Increment the custom counter only when the checkout actually succeeded
    if (ok) {
      successfulCheckouts.add(1, { result: 'success' });
    }
  });

  sleep(1);
}
