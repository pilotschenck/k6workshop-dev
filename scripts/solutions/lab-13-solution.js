// scripts/solutions/lab-13-solution.js
// Lab 13: Multi-Step Workflow Checks (Scripted Checks) — Solution
//
// Improvements over the starter:
//   - Steps wrapped in group() for organized summary output and SM results view
//   - Per-step Trend metrics for granular latency tracking in SM dashboards
//   - try/catch/finally error handling so one failed step doesn't crash the whole script
//   - More descriptive check names following the pattern "step-name: what we expected"
//   - console.log() calls for SM Logs tab debugging
//
// Run locally:
//   k6 run scripts/solutions/lab-13-solution.js

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';

// Custom per-step duration metrics. These appear in SM dashboards and in the
// local summary output, letting you track per-step latency independently.
const headersStepDuration = new Trend('step_headers_duration', true);
const postStepDuration    = new Trend('step_post_duration',    true);
const statusStepDuration  = new Trend('step_status_duration',  true);

export const options = {
  vus: 1,
  duration: '30s',
  // SM ignores vus/duration and uses its own 1-VU scheduling.
  // These values are only used when running locally with k6 run.
};

export default function () {

  // -------------------------------------------------------------------------
  // Step A: GET /headers
  // -------------------------------------------------------------------------
  group('step-A: get headers', () => {
    let res;
    try {
      res = http.get('https://httpbin.org/headers', {
        tags: { step: 'A', name: 'get-headers' },
      });

      headersStepDuration.add(res.timings.duration);

      const passed = check(res, {
        'step-A: status is 200': (r) => r.status === 200,
        'step-A: response body is valid JSON': (r) => {
          try { JSON.parse(r.body); return true; } catch { return false; }
        },
        'step-A: response contains headers object': (r) => {
          const body = JSON.parse(r.body);
          return typeof body.headers === 'object' && body.headers !== null;
        },
        'step-A: Host header is present': (r) => {
          const body = JSON.parse(r.body);
          return body.headers && body.headers.Host !== undefined;
        },
      });

      if (!passed) {
        console.log(`[step-A] One or more checks failed. Status: ${res.status}, Body: ${res.body.substring(0, 200)}`);
      }
    } catch (e) {
      console.error(`[step-A] Unexpected error: ${e.message}`);
    } finally {
      sleep(1);
    }
  });

  // -------------------------------------------------------------------------
  // Step B: POST /post with a JSON body
  // -------------------------------------------------------------------------
  group('step-B: post with json body', () => {
    let res;
    try {
      const payload = JSON.stringify({ workflow: 'lab-13', step: 'B', timestamp: Date.now() });

      res = http.post('https://httpbin.org/post', payload, {
        headers: { 'Content-Type': 'application/json' },
        tags: { step: 'B', name: 'post-json' },
      });

      postStepDuration.add(res.timings.duration);

      let parsedBody;
      try {
        parsedBody = JSON.parse(res.body);
      } catch {
        parsedBody = null;
      }

      const passed = check(res, {
        'step-B: status is 200': (r) => r.status === 200,
        'step-B: content-type is application/json': (r) => {
          const ct = r.headers['Content-Type'] || '';
          return ct.includes('application/json');
        },
        'step-B: response echoes our JSON payload': () => {
          return parsedBody !== null &&
            parsedBody.json !== null &&
            parsedBody.json.workflow === 'lab-13';
        },
        'step-B: response includes the step field': () => {
          return parsedBody !== null &&
            parsedBody.json !== null &&
            parsedBody.json.step === 'B';
        },
      });

      if (!passed) {
        console.log(`[step-B] One or more checks failed. Status: ${res.status}, Body: ${res.body.substring(0, 300)}`);
      }
    } catch (e) {
      console.error(`[step-B] Unexpected error: ${e.message}`);
    } finally {
      sleep(1);
    }
  });

  // -------------------------------------------------------------------------
  // Step C: GET /status/200 — verify a known-status endpoint
  // -------------------------------------------------------------------------
  group('step-C: verify status endpoint', () => {
    let res;
    try {
      res = http.get('https://httpbin.org/status/200', {
        tags: { step: 'C', name: 'status-check' },
      });

      statusStepDuration.add(res.timings.duration);

      const passed = check(res, {
        'step-C: status endpoint returns 200': (r) => r.status === 200,
        'step-C: response time under 2000ms': (r) => r.timings.duration < 2000,
      });

      if (!passed) {
        console.log(`[step-C] One or more checks failed. Status: ${res.status}, Duration: ${res.timings.duration}ms`);
      }
    } catch (e) {
      console.error(`[step-C] Unexpected error: ${e.message}`);
    }
    // No sleep after the last step — SM doesn't need it and it would add
    // unnecessary duration to each execution.
  });
}
