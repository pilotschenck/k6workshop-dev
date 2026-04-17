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

// When running inside the Instruqt workstation, INSTRUQT_PARTICIPANT_ID is set
// automatically and the script reaches demo-app via the public proxy URL.
// Outside Instruqt (e.g. your own laptop), fall back to localhost so the
// script still runs against a local demo-app. Override explicitly with:
//   BASE_URL=http://localhost:3000 k6 run scripts/solutions/lab-09-solution.js
const BASE_URL = __ENV.BASE_URL || (__ENV.INSTRUQT_PARTICIPANT_ID
  ? `https://grafana-workstation-3000u-${__ENV.INSTRUQT_PARTICIPANT_ID}.env.play.instruqt.com`
  : 'http://localhost:3000');

export const options = {
  // Staged load: ramp from 0 → 5 VUs, hold, then ramp back down.
  // The cloud UI visualises this ramp clearly on the VUs-over-time graph.
  stages: [
    { duration: '20s', target: 5 },  // ramp up
    { duration: '30s', target: 5 },  // sustain peak load
    { duration: '10s', target: 0 },  // ramp down
  ],

  // Thresholds were intentionally omitted here. In cloud runs the demo-app is
  // reached through the public Instruqt proxy, so latency-based thresholds
  // would fail for reasons that have nothing to do with the lab's goal
  // (comparing local vs. cloud execution). Lab 02 already covers thresholds
  // in depth — experiment there with localhost and see deliberate failures.
};

export default function () {
  // --- Home page ---
  const homeRes = http.get(`${BASE_URL}/`);
  check(homeRes, {
    'home: status 200': (r) => r.status === 200,
    // 1500 ms allows for cloud-to-Instruqt-proxy latency while still flagging
    // outliers. Tighten when pointing at a real, low-latency service.
    'home: response time < 1500ms': (r) => r.timings.duration < 1500,
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
    // The demo app always returns 200 on POST /login with any body.
    'login: response received': (r) => r.status !== 0,
    'login: response time < 1500ms': (r) => r.timings.duration < 1500,
  });

  sleep(1);
}
