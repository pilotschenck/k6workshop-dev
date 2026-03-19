import http from 'k6/http';
import { check, sleep } from 'k6';

// Lab 06 — InfluxDB + Grafana
//
// The script itself is a straightforward multi-endpoint test.
// The interesting part of this lab is the --out flag that streams results to InfluxDB:
//
//   k6 run --out influxdb=http://localhost:8086/k6 scripts/starters/lab-06-starter.js
//
// While the test runs, open Grafana at http://localhost:3030 and navigate to
// Dashboards → k6 Overview to watch metrics appear in real time.

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '30s', target: 5 },
    { duration: '10s', target: 0 },
  ],
};

export default function () {
  // Endpoint 1: Homepage
  const homeRes = http.get(`${BASE_URL}/`);
  check(homeRes, { 'homepage status 200': (r) => r.status === 200 });

  sleep(1);

  // Endpoint 2: Products API
  const productsRes = http.get(`${BASE_URL}/api/products`);
  check(productsRes, { 'products status 200': (r) => r.status === 200 });

  sleep(1);

  // Endpoint 3: Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, { 'health status 200': (r) => r.status === 200 });

  sleep(1);
}
