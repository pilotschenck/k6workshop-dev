import http from 'k6/http';
import { check, sleep } from 'k6';

// Lab 07 — Prometheus Remote Write
//
// Run this script with Prometheus remote write output:
//
//   K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \
//     k6 run --out experimental-prometheus-rw scripts/starters/lab-07-starter.js
//
// Then open Prometheus at http://localhost:9090 and query:
//   k6_http_req_duration_p95
//   rate(k6_http_reqs_total[1m])
//   k6_vus

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '30s', target: 5 },
    { duration: '10s', target: 0 },
  ],
  // TODO: Add a tags block here with meaningful labels (e.g. environment, testType).
  // These tags will appear as Prometheus labels on every metric, enabling PromQL filtering.
};

export default function () {
  // Endpoint 1: Homepage
  // TODO: Add a tags object to this request with { name: 'GET /' }
  const homeRes = http.get(`${BASE_URL}/`);
  check(homeRes, { 'homepage status 200': (r) => r.status === 200 });

  sleep(1);

  // Endpoint 2: Products
  // TODO: Add a tags object to this request with { name: 'GET /api/products' }
  const productsRes = http.get(`${BASE_URL}/api/products`);
  check(productsRes, { 'products status 200': (r) => r.status === 200 });

  sleep(1);

  // Endpoint 3: Health
  // TODO: Add a tags object to this request with { name: 'GET /health' }
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, { 'health status 200': (r) => r.status === 200 });

  sleep(1);
}
