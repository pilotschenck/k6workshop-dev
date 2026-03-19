// scripts/starters/lab-13-starter.js
// Lab 13: Multi-Step Workflow Checks (Scripted Checks)
//
// This script is designed to be used as a Grafana Synthetic Monitoring
// scripted check. It tests a 3-step workflow against httpbin.org, which
// is publicly reachable from SM probe locations.
//
// Run locally first to verify everything works:
//   k6 run scripts/starters/lab-13-starter.js
//
// NOTE: SM ignores the vus and duration options below — it always runs
// 1 VU on its own schedule. Keep them here so local runs work correctly.

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '30s',
};

export default function () {
  // Step A: GET /headers — verify the endpoint returns a headers object
  const headersRes = http.get('https://httpbin.org/headers');
  check(headersRes, {
    'headers: status is 200': (r) => r.status === 200,
    'headers: response has headers object': (r) => {
      const body = JSON.parse(r.body);
      return body.headers !== undefined;
    },
  });

  sleep(1);

  // Step B: POST /post with a JSON body — verify httpbin echoes the payload
  const payload = JSON.stringify({ workflow: 'lab-13', step: 'B' });
  const postRes = http.post('https://httpbin.org/post', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(postRes, {
    'post: status is 200': (r) => r.status === 200,
    'post: body echoes our payload': (r) => {
      const body = JSON.parse(r.body);
      return body.json && body.json.workflow === 'lab-13';
    },
  });

  sleep(1);

  // Step C: GET /status/200 — verify a known-good status endpoint
  const statusRes = http.get('https://httpbin.org/status/200');
  check(statusRes, {
    'status: returns 200 as expected': (r) => r.status === 200,
  });
}
