import http from 'k6/http';
import { check, sleep } from 'k6';

// Switch between demo-app (default) and broken-app by passing BASE_URL at runtime:
//   k6 run scripts/solutions/lab-02-solution.js                             # demo-app (should PASS)
//   k6 run -e BASE_URL=http://localhost:3001 scripts/solutions/lab-02-solution.js  # broken-app (should FAIL)
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 5,
  duration: '30s',

  thresholds: {
    // 95th-percentile response time must stay under 500 ms
    http_req_duration: ['p(95)<500'],
    // Fewer than 5% of requests may fail (non-2xx or network errors)
    http_req_failed: ['rate<0.05'],
    // At least 95% of all check() assertions must pass
    checks: ['rate>0.95'],
  },
};

export default function () {
  // GET homepage — check status, response time, and body
  const homeRes = http.get(`${BASE_URL}/`);
  check(homeRes, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage response time < 500ms': (r) => r.timings.duration < 500,
    'homepage body is not empty': (r) => r.body.length > 0,
  });

  sleep(1);

  // GET products API — check status and that the body looks like JSON
  const productsRes = http.get(`${BASE_URL}/api/products`);
  check(productsRes, {
    'products status is 200': (r) => r.status === 200,
    'products body contains data': (r) => r.body.length > 2,
  });

  sleep(1);
}
