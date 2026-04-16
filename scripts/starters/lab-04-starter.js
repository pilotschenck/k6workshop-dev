import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Custom metric — counts successful checkouts across all VUs
const successfulCheckouts = new Counter('successful_checkouts');

export const options = {
  vus: 3,
  duration: '30s',
  tags: {
    // Test-level tags appear on every request; useful for filtering in dashboards
    environment: 'local',
    testType: 'load',
  },
};

export default function () {
  // TODO: Wrap this block in group('browse', function () { ... })
  // Make a GET request to /api/products with a tag: { name: 'get-products' }
  // Add a check that status is 200 and the response body is not empty
  {
    http.get(`${BASE_URL}/api/products`);
  }

  sleep(1);

  // TODO: Wrap this block in group('auth', function () { ... })
  // POST to /login with { username: 'user1', password: 'pass1' } and Content-Type: application/json
  // Add a tag: { name: 'post-login' }
  // Add a check that status is 200 and the response time is less than 1 second
  {
    const loginPayload = JSON.stringify({ username: 'user1', password: 'pass1' });
    const loginParams = { headers: { 'Content-Type': 'application/json' } };
    http.post(`${BASE_URL}/login`, loginPayload, loginParams);
  }

  sleep(1);

  // TODO: Wrap this block in group('checkout', function () { ... })
  // POST to /checkout with { cartId: 'cart-1', userId: 'user-1' } and Content-Type: application/json
  // Add a tag: { name: 'post-checkout' }
  // Add a check that status is 200 or 201
  // If the check passes, increment successfulCheckouts by 1
  {
    const checkoutPayload = JSON.stringify({ cartId: 'cart-1', userId: 'user-1' });
    const checkoutParams = { headers: { 'Content-Type': 'application/json' } };
    http.post(`${BASE_URL}/checkout`, checkoutPayload, checkoutParams);
  }

  sleep(1);
}
