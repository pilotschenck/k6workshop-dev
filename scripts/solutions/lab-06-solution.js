import http from 'k6/http';
import { check, group, sleep } from 'k6';

// Lab 06 — InfluxDB + Grafana
//
// Run this script with InfluxDB output:
//
//   k6 run --out influxdb=http://localhost:8086/k6 scripts/solutions/lab-06-solution.js
//
// Then open Grafana at http://localhost:3030 → Dashboards → k6 Overview.
// Data should appear within 5-10 seconds of starting the run.
//
// The solution adds groups and custom name tags so that Grafana panels can filter
// metrics by endpoint — making it easy to spot which URL is slow or erroring.

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '10s', target: 5 }, // ramp up
    { duration: '30s', target: 5 }, // sustain
    { duration: '10s', target: 0 }, // ramp down
  ],
  // Test-level tags appear on every data point sent to InfluxDB,
  // enabling dashboard filtering by environment or run type.
  tags: {
    environment: 'local',
    testType: 'load',
  },
};

export default function () {
  // --- Homepage ---
  group('homepage', function () {
    const res = http.get(`${BASE_URL}/`, {
      // The 'name' tag groups dynamic URLs in Grafana dashboards.
      // Even if the URL contained an ID, all requests would roll up under this name.
      tags: { name: 'GET /' },
    });
    check(res, {
      'homepage status 200': (r) => r.status === 200,
      'homepage response time < 500ms': (r) => r.timings.duration < 500,
    });
  });

  sleep(1);

  // --- Products API ---
  group('products', function () {
    const res = http.get(`${BASE_URL}/api/products`, {
      tags: { name: 'GET /api/products' },
    });
    check(res, {
      'products status 200': (r) => r.status === 200,
      'products body not empty': (r) => r.body.length > 2,
    });
  });

  sleep(1);

  // --- Health check ---
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
