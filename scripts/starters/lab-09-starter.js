// scripts/starters/lab-09-starter.js
// Lab 09: k6 Cloud Run — Starter Script
//
// This script hits three demo-app endpoints with 2 VUs for 30 seconds.
// Run it locally first, then send it to Grafana Cloud k6 with `k6 cloud run`.
//
// Cloud runs execute from Grafana Cloud and cannot reach `localhost` on your
// Instruqt workstation. Use the public proxy URL which is exposed on the
// internet. INSTRUQT_PARTICIPANT_ID is set automatically in the workstation
// environment.

import http from 'k6/http';
import { sleep } from 'k6';

// When running inside the Instruqt workstation, INSTRUQT_PARTICIPANT_ID is set
// automatically and the script reaches demo-app via the public proxy URL.
// Outside Instruqt (e.g. your own laptop), fall back to localhost so the
// script still runs against a local demo-app. Override explicitly with:
//   BASE_URL=http://localhost:3000 k6 run scripts/starters/lab-09-starter.js
const BASE_URL = __ENV.BASE_URL || (__ENV.INSTRUQT_PARTICIPANT_ID
  ? `https://grafana-workstation-3000u-${__ENV.INSTRUQT_PARTICIPANT_ID}.env.play.instruqt.com`
  : 'http://localhost:3000');

export const options = {
  vus: 2,
  duration: '30s',
};

export default function () {
  // Home page
  http.get(`${BASE_URL}/`);

  sleep(1);

  // Product catalog
  http.get(`${BASE_URL}/api/products`);

  sleep(1);

  // Login endpoint
  const payload = JSON.stringify({
    username: 'testuser',
    password: 'password123',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  http.post(`${BASE_URL}/login`, payload, params);

  sleep(1);
}
