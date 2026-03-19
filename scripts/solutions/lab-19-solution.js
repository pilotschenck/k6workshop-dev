// Lab 19 Solution: Structured Logging in k6 Tests
//
// Run with default text log output:
//   k6 run scripts/solutions/lab-19-solution.js
//
// Run with JSON log format (machine-readable, Loki-compatible):
//   k6 run --log-format json scripts/solutions/lab-19-solution.js
//
// Write logs to a file:
//   mkdir -p logs
//   k6 run --log-output file=logs/test.log --log-format json scripts/solutions/lab-19-solution.js
//   cat logs/test.log | jq .
//
// Filter to errors only:
//   cat logs/test.log | jq 'select(.level == "error")'
//
// Forward to Loki (Loki not in local stack, shown for reference):
//   k6 run --log-output loki=http://localhost:3100/loki/api/v1/push \
//           --log-format json scripts/solutions/lab-19-solution.js

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
    'products response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Log every request with VU/iteration context during normal operation.
  // In a production test at high VU counts, remove this and rely only on
  // the conditional error log below to keep volume manageable.
  console.info(
    `VU ${__VU} iter ${__ITER}: GET /api/products → ${productsRes.status} ` +
      `in ${productsRes.timings.duration.toFixed(1)}ms`
  );

  if (!productsOk) {
    // Log detailed failure information — status, duration, and body excerpt
    // — so you can diagnose the failure without rerunning the test.
    console.error(
      `VU ${__VU} iter ${__ITER}: /api/products FAILED — ` +
        `status=${productsRes.status} ` +
        `duration=${productsRes.timings.duration.toFixed(0)}ms ` +
        `body=${productsRes.body.substring(0, 200)}`
    );
  }

  sleep(1);

  // --- POST /login ---
  const loginPayload = JSON.stringify({ username: 'user1', password: 'pass1' });
  const loginParams = { headers: { 'Content-Type': 'application/json' } };
  const loginRes = http.post(`${BASE_URL}/login`, loginPayload, loginParams);

  const loginOk = check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'login response time < 1s': (r) => r.timings.duration < 1000,
  });

  // Log only on failure to avoid high-volume noise at scale.
  if (!loginOk) {
    console.error(
      `VU ${__VU} iter ${__ITER}: POST /login FAILED — ` +
        `status=${loginRes.status} ` +
        `duration=${loginRes.timings.duration.toFixed(0)}ms ` +
        `body=${loginRes.body.substring(0, 200)}`
    );
  } else {
    console.log(
      `VU ${__VU} iter ${__ITER}: POST /login → ${loginRes.status} ` +
        `in ${loginRes.timings.duration.toFixed(1)}ms`
    );
  }

  sleep(1);

  // --- GET /health ---
  const healthRes = http.get(`${BASE_URL}/health`);

  check(healthRes, {
    'health status 200': (r) => r.status === 200,
  });

  // Warn if health check is unexpectedly slow — this is a canary signal
  // that the app may be under memory pressure or a GC pause is occurring.
  if (healthRes.timings.duration > 100) {
    console.warn(
      `VU ${__VU} iter ${__ITER}: /health slow — ${healthRes.timings.duration.toFixed(0)}ms ` +
        `(expected < 100ms)`
    );
  }

  sleep(0.5);
}
