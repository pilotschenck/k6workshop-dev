// scripts/solutions/lab-09-solution.js
// Lab 09: k6 Cloud Run — Solution Script
//
// Enhanced version for cloud runs: adds stages (ramp up / sustain / ramp down),
// checks on every response, and a p95 latency threshold. The ramped load profile
// makes the cloud results timeline more interesting to explore in the k6 Cloud UI.
//
// Cloud runs execute from Grafana Cloud and cannot reach `localhost` on your
// Instruqt workstation. Use the public proxy URL which is exposed on the
// internet. INSTRUQT_PARTICIPANT_ID is set automatically in the workstation
// environment.
//
// Run locally:  k6 run scripts/solutions/lab-09-solution.js
// Run in cloud: k6 cloud run scripts/solutions/lab-09-solution.js

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = `https://grafana-workstation-3000u-${__ENV.INSTRUQT_PARTICIPANT_ID}.env.play.instruqt.com`;

export const options = {
  // Staged load: ramp from 0 → 5 VUs, hold, then ramp back down.
  // The cloud UI visualises this ramp clearly on the VUs-over-time graph.
  stages: [
    { duration: '20s', target: 5 },  // ramp up
    { duration: '30s', target: 5 },  // sustain peak load
    { duration: '10s', target: 0 },  // ramp down
  ],

  thresholds: {
    // Test fails if the 95th-percentile response time exceeds 500 ms
    http_req_duration: ['p(95)<500'],
    // Test fails if more than 1% of requests fail
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // --- Home page ---
  const homeRes = http.get(`${BASE_URL}/`);
  check(homeRes, {
    'home: status 200': (r) => r.status === 200,
    'home: response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);

  // --- Product catalog ---
  const productsRes = http.get(`${BASE_URL}/api/products`);
  check(productsRes, {
    'products: status 200': (r) => r.status === 200,
    'products: body is JSON array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch (_) {
        return false;
      }
    },
  });

  sleep(1);

  // --- Login ---
  const payload = JSON.stringify({
    username: 'testuser',
    password: 'password123',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const loginRes = http.post(`${BASE_URL}/login`, payload, params);
  check(loginRes, {
    // The demo app returns 200 for valid credentials and 401 for invalid ones.
    // A 401 here is expected for the test credentials — adjust if the app returns 200.
    'login: response received': (r) => r.status !== 0,
    'login: response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
