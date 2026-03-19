import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 2,
  duration: '30s',
};

export default function () {
  // --- GET /api/products ---
  const productsRes = http.get(`${BASE_URL}/api/products`);
  const productsOk = check(productsRes, {
    'products status 200': (r) => r.status === 200,
  });

  // TODO: Log a message that includes __VU, __ITER, the response status,
  // and the response time (productsRes.timings.duration).
  // Example: console.log(`VU ${__VU} iter ${__ITER}: ...`);

  // TODO: If productsOk is false, log an error with console.error that
  // includes the status code and the first 200 characters of the body.

  sleep(1);

  // --- POST /login ---
  const loginPayload = JSON.stringify({ username: 'user1', password: 'pass1' });
  const loginParams = { headers: { 'Content-Type': 'application/json' } };
  const loginRes = http.post(`${BASE_URL}/login`, loginPayload, loginParams);
  const loginOk = check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'login response time < 1s': (r) => r.timings.duration < 1000,
  });

  // TODO: If loginOk is false, use console.error to log:
  //   - which VU and iteration failed
  //   - the HTTP status code
  //   - the response duration
  //   - the first 200 chars of the response body

  sleep(1);

  // --- GET /health ---
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status 200': (r) => r.status === 200,
  });

  // TODO: Use console.warn if the health check response time exceeds 100ms.
  // Hint: healthRes.timings.duration gives you the duration in milliseconds.

  sleep(0.5);
}
