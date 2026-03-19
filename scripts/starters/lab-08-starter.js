import http from 'k6/http';
import { check, sleep } from 'k6';

// Lab 08 — JSON Output and handleSummary
//
// Run with JSON output:
//   k6 run --out json=results.json scripts/starters/lab-08-starter.js
//
// After the run, inspect the raw data:
//   wc -l results.json
//   head -3 results.json | jq .
//
// A summary.md file will also be written once you implement handleSummary below.

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 3,
  duration: '20s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  // Endpoint 1: Homepage
  const homeRes = http.get(`${BASE_URL}/`);
  check(homeRes, { 'homepage 200': (r) => r.status === 200 });
  sleep(1);

  // Endpoint 2: Products
  const productsRes = http.get(`${BASE_URL}/api/products`);
  check(productsRes, { 'products 200': (r) => r.status === 200 });
  sleep(1);

  // Endpoint 3: Health
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, { 'health 200': (r) => r.status === 200 });
  sleep(1);
}

// TODO: Implement handleSummary to generate a custom Markdown report.
//
// The function receives a `data` object containing all metric summaries.
// It should return an object mapping destinations to string content.
//
// Useful data paths:
//   data.metrics['http_req_duration'].values['p(95)']   — p95 latency (ms)
//   data.metrics['http_reqs'].values['rate']            — requests per second
//   data.metrics['http_req_failed'].values['rate']      — error rate (0–1)
//   data.metrics['checks'].values['rate']               — check pass rate (0–1)
//
// Return shape:
//   { stdout: '<markdown string>', 'summary.md': '<same markdown string>' }
//
export function handleSummary(data) {
  // TODO: Extract the metrics you care about from the data object

  // TODO: Build a Markdown string with a title and bullet points for each metric

  // TODO: Return the string to both stdout and a file named 'summary.md'
  return {};
}
