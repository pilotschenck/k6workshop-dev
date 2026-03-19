// Lab 18 Solution: OpenTelemetry Tracing with k6
//
// Run with trace header injection only (always works):
//   k6 run scripts/solutions/lab-18-solution.js
//
// Run with OTel metrics export to local collector (requires newer k6 build):
//   K6_OTEL_GRPC_EXPORTER_ENDPOINT=localhost:4317 \
//   K6_OTEL_GRPC_EXPORTER_INSECURE=true \
//   k6 run --out experimental-opentelemetry scripts/solutions/lab-18-solution.js
//
// View OTel collector output:
//   docker logs $(docker ps -qf name=otel) 2>&1 | tail -50

import http from 'k6/http';
import { check, sleep } from 'k6';
import { instrumentHTTP } from 'k6/experimental/tracing';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Instrument all http calls with W3C TraceContext headers.
// Every request will carry a unique traceparent header so the
// backend can propagate the trace ID through its own call chain.
instrumentHTTP({
  propagator: 'w3c',
});

export const options = {
  vus: 2,
  duration: '30s',
};

export default function () {
  // --- GET /api/products ---
  const productsRes = http.get(`${BASE_URL}/api/products`);

  check(productsRes, {
    'products status 200': (r) => r.status === 200,
    'products response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Log the injected headers so you can confirm traceparent is present.
  // In a real test you would remove this or gate it behind a flag to
  // avoid log noise at high VU counts.
  console.log(
    `VU ${__VU} iter ${__ITER} /api/products headers: ` +
      JSON.stringify(productsRes.request.headers)
  );

  sleep(1);

  // --- GET /health ---
  const healthRes = http.get(`${BASE_URL}/health`);

  check(healthRes, {
    'health status 200': (r) => r.status === 200,
  });

  sleep(0.5);

  // --- POST /login ---
  const loginPayload = JSON.stringify({ username: 'user1', password: 'pass1' });
  const loginParams = { headers: { 'Content-Type': 'application/json' } };
  const loginRes = http.post(`${BASE_URL}/login`, loginPayload, loginParams);

  check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'login response time < 1s': (r) => r.timings.duration < 1000,
  });

  // Log the login request headers to confirm traceparent is included.
  // Note: each request gets a unique parent-span-id but the trace-id
  // remains consistent across requests in the same VU iteration when
  // the backend propagates it correctly.
  if (loginRes.status !== 200) {
    console.warn(
      `VU ${__VU} iter ${__ITER}: login returned ${loginRes.status} — ` +
        `trace-id in traceparent: ${loginRes.request.headers['traceparent']}`
    );
  }

  sleep(1);
}
