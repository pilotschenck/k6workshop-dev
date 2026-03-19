import http from 'k6/http';
import { check, sleep } from 'k6';

// Lab 08 — JSON Output and handleSummary
//
// Run command:
//   k6 run --out json=results.json scripts/solutions/lab-08-solution.js
//
// After the run:
//   - summary.md is written to the current directory
//   - results.json contains every raw metric data point (line-delimited JSON)
//
// Useful jq commands for exploring results.json:
//   head -5 results.json | jq .
//   cat results.json | jq 'select(.type=="Point" and .metric=="http_req_duration") | .data.value' | sort -n | tail -1
//   cat results.json | jq -s '[.[] | select(.type=="Point" and .metric=="http_req_duration") | .data.value] | add/length'

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
  // Three endpoints — results will be visible in Grafana or post-processed from results.json
  const homeRes = http.get(`${BASE_URL}/`, { tags: { name: 'GET /' } });
  check(homeRes, { 'homepage 200': (r) => r.status === 200 });
  sleep(1);

  const productsRes = http.get(`${BASE_URL}/api/products`, { tags: { name: 'GET /api/products' } });
  check(productsRes, { 'products 200': (r) => r.status === 200 });
  sleep(1);

  const healthRes = http.get(`${BASE_URL}/health`, { tags: { name: 'GET /health' } });
  check(healthRes, { 'health 200': (r) => r.status === 200 });
  sleep(1);
}

// handleSummary is called once after the test completes.
// It receives the same data that drives the CLI summary table.
// Return an object mapping destinations (stdout, stderr, filenames) to string content.
export function handleSummary(data) {
  // Extract key aggregate values from the metrics object
  const p95 = data.metrics['http_req_duration']
    ? data.metrics['http_req_duration'].values['p(95)'].toFixed(2)
    : 'N/A';

  const rps = data.metrics['http_reqs']
    ? data.metrics['http_reqs'].values['rate'].toFixed(2)
    : 'N/A';

  const errorRate = data.metrics['http_req_failed']
    ? (data.metrics['http_req_failed'].values['rate'] * 100).toFixed(2)
    : 'N/A';

  const checkPassRate = data.metrics['checks']
    ? (data.metrics['checks'].values['rate'] * 100).toFixed(2)
    : 'N/A';

  // Build a Markdown report string
  const md = [
    '# k6 Test Summary',
    '',
    `**Script:** lab-08-solution.js  `,
    `**Date:** ${new Date().toISOString()}`,
    '',
    '## Results',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| p95 Response Time | ${p95} ms |`,
    `| Requests/sec | ${rps} |`,
    `| Error Rate | ${errorRate}% |`,
    `| Check Pass Rate | ${checkPassRate}% |`,
    '',
  ].join('\n');

  // Return content for both stdout (printed to terminal) and a Markdown file
  return {
    stdout: md,
    'summary.md': md,
  };
}
