import http from 'k6/http';
import { check, group, sleep } from 'k6';

// Lab 07 — Prometheus Remote Write
//
// Run command:
//
//   K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \
//     k6 run --out experimental-prometheus-rw scripts/solutions/lab-07-solution.js
//
// Prometheus must be started with --web.enable-remote-write-receiver (already done in docker-compose).
//
// After starting the run, query these metrics in the Prometheus UI (http://localhost:9090):
//
//   k6_http_req_duration_p95          — 95th-percentile response time
//   rate(k6_http_reqs_total[1m])      — requests per second
//   k6_vus                            — active virtual users
//   k6_checks_total                   — cumulative check pass/fail count
//
// k6 metric names map to Prometheus names:
//   http_req_duration  →  k6_http_req_duration_p95  (for the p95 stat)
//   http_reqs          →  k6_http_reqs_total
//   vus                →  k6_vus
//
// Tip: set K6_PROMETHEUS_RW_TREND_STATS=p50,p90,p95,p99 to control which
//      percentiles are exported for Trend metrics (default is p99 only).

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '10s', target: 5 }, // ramp up
    { duration: '30s', target: 5 }, // sustain
    { duration: '10s', target: 0 }, // ramp down
  ],
  // Test-level tags become Prometheus labels on every time series k6 emits.
  // Use them to filter metrics by run, environment, or team in PromQL.
  tags: {
    environment: 'local',
    testType: 'load',
    team: 'platform',
  },
};

export default function () {
  group('homepage', function () {
    const res = http.get(`${BASE_URL}/`, {
      // The 'name' tag controls how this request appears in Prometheus label selectors.
      tags: { name: 'GET /' },
    });
    check(res, {
      'homepage status 200': (r) => r.status === 200,
      'homepage response time < 500ms': (r) => r.timings.duration < 500,
    });
  });

  sleep(1);

  group('products', function () {
    const res = http.get(`${BASE_URL}/api/products`, {
      tags: { name: 'GET /api/products' },
    });
    check(res, {
      'products status 200': (r) => r.status === 200,
    });
  });

  sleep(1);

  group('health', function () {
    const res = http.get(`${BASE_URL}/health`, {
      tags: { name: 'GET /health' },
    });
    check(res, {
      'health status 200': (r) => r.status === 200,
    });
  });

  sleep(1);
}
