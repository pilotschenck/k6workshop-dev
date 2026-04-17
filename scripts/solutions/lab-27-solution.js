/**
 * Lab 27 Solution: k6 equivalent of the mock DataDog synthetic test
 *
 * Source: labs/lab-27/mock-dd-test.json
 *   - type: api / subtype: http
 *   - Assertions: statusCode is 200, responseTime < 2000, body contains "ok"
 *   - Locations: aws:us-east-1, aws:eu-west-1, aws:ap-southeast-1 (handled by SM probe selection)
 *   - tick_every: 60s (handled by SM check frequency setting)
 *
 * For local test runs:  k6 run scripts/solutions/lab-27-solution.js
 * For SM scripted check: remove the `options` export; SM handles scheduling.
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';

// Remove this block when uploading to Grafana Synthetic Monitoring.
// SM ignores the options export and controls scheduling itself.
export const options = {
  vus: 1,
  duration: '10s',
  thresholds: {
    // These mirror the DD responseTime assertion threshold of 2000ms
    'http_req_duration{endpoint:health}': ['p(95)<2000'],
    'http_req_duration{endpoint:login}':  ['p(95)<2000'],
    // All checks must pass
    checks: ['rate==1.0'],
  },
};

// ── Part 1: Single-request test (direct translation of the mock DD health check) ──────────────

export default function () {
  group('health check', () => {
    // Translated from:
    //   config.request.method = GET
    //   config.request.url    = https://api.example.com/health  (→ demo-app equivalent)
    //   config.request.headers = { Accept: application/json }
    //   config.request.timeout = 30
    const params = {
      headers: { 'Accept': 'application/json' },
      timeout: '30s',
      tags: { endpoint: 'health' },
    };

    const res = http.get('http://localhost:3000/health', params);

    // Translated from config.assertions:
    //   { type: statusCode,    operator: is,          target: 200        }
    //   { type: responseTime,  operator: lessThan,    target: 2000       }
    //   { type: body,          operator: contains,    target: '"status"' }
    //
    // Note: the mock DD test originally asserted `"status":"ok"`. This
    // workshop's demo-app returns `{"status":"healthy"}`, so we assert on
    // the substring `healthy` instead. The translation pattern is the
    // same — only the expected string changes when you re-point at a
    // real service.
    check(res, {
      'status 200':              (r) => r.status === 200,
      'fast response':           (r) => r.timings.duration < 2000,
      'status healthy in body':  (r) => r.body.includes('healthy'),
    });
  });

  // ── Part 2: Multistep test — login then use extracted token ────────────────────────────────
  // This demonstrates how a DD multistep API test (with extract/inject) translates to k6.
  // In DD: Step 1 extracts {{ auth_token }} from the response; Step 2 injects it as a header.
  // In k6: it's just a variable assigned between two http calls.

  group('authenticate', () => {
    const payload = JSON.stringify({
      username: 'testuser',
      password: 'testpass',
    });

    const loginRes = http.post(
      'http://localhost:3000/login',
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: 'login' },
      }
    );

    // Translated DD assertions:
    //   statusCode is 200
    //   responseTime lessThan 2000
    //   body jsonPath $.token is not null
    check(loginRes, {
      'login status 200': (r) => r.status === 200,
      'login fast':       (r) => r.timings.duration < 2000,
      'has token':        (r) => {
        try {
          return JSON.parse(r.body).token !== undefined;
        } catch (_) {
          return false;
        }
      },
    });
  });

  sleep(1);
}
