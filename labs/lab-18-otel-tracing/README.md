# Lab 18: OpenTelemetry Tracing with k6

**Time:** 20 min | **Module:** Module 3 — Advanced

## Overview

k6 includes an experimental tracing module (`k6/experimental/tracing`) that automatically injects distributed trace context into every outgoing HTTP request. When a slow request surfaces in your k6 results, you can use its trace ID to look up the exact backend trace in Grafana Tempo, Jaeger, or any OpenTelemetry-compatible APM tool — closing the loop between synthetic load testing and distributed tracing.

This lab walks through enabling trace context injection, verifying the headers are present, and (if your k6 build supports it) emitting k6 spans directly to the local OTel collector.

## What You'll Learn

- What a trace ID is and what the W3C `traceparent` header looks like
- How `instrumentHTTP` from `k6/experimental/tracing` works
- How to confirm injected headers in k6 request output
- How to check whether `--out experimental-opentelemetry` is available in your build
- How to view OTel collector logs to confirm data is flowing
- The end-to-end correlation story: k6 test run → trace context → APM backend

## Prerequisites

- Labs 01–08 completed
- Docker Compose stack running — verify with:
  ```bash
  docker compose -f infra/docker-compose.yml ps
  ```
  Confirm `alloy` and `tempo` show as `Up`

## Instructions

### Step 1: Understand Trace Context Propagation

A **trace ID** is a 128-bit identifier (displayed as a 32-character hex string) that follows a request across every service it touches. When service A calls service B, it passes the trace ID in an HTTP header. Service B stamps the same trace ID on its own span, so your APM tool can stitch the full call chain together.

The **W3C TraceContext** standard defines the `traceparent` header:

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
              ^^ version
                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ trace-id (128-bit)
                                                  ^^^^^^^^^^^^^^^^ parent-span-id (64-bit)
                                                                   ^^ flags (sampled=01)
```

When k6 injects this header into requests, the backend application can read it and propagate it to every downstream call. If those services are instrumented with OTel SDKs, all spans land in your APM tool under that single trace ID — making it trivial to find exactly which backend path was slow during the load test.

**Why this matters for load testing:** without trace context, you know *that* p95 latency was 800 ms but not *why*. With trace correlation, you can pinpoint whether the slowdown was in the database query, an external API call, or a slow middleware layer.

### Step 2: Examine the Starter Script

Open `scripts/starters/lab-18-starter.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { instrumentHTTP } from 'k6/experimental/tracing';

// instrumentHTTP patches k6's http module globally.
// Every http.get / http.post call will automatically receive
// a traceparent header using the W3C TraceContext format.
instrumentHTTP({
  propagator: 'w3c',
});

export const options = {
  vus: 2,
  duration: '30s',
};

export default function () {
  // TODO: add requests to demo-app endpoints
  // Trace context will be injected automatically — you don't
  // need to set any headers manually.
  sleep(1);
}
```

Key points:
- `instrumentHTTP` must be called in the **init context** (top-level, outside `default`), not inside the test function
- `propagator: 'w3c'` uses the W3C TraceContext standard; `'b3'` is also supported for Zipkin-style systems
- The patching is global — every subsequent `http.*` call is automatically instrumented

### Step 3: Complete the Starter Script

Add requests to the demo-app. Edit `scripts/starters/lab-18-starter.js` and replace the TODO block:

```javascript
export default function () {
  // GET product catalog
  const productsRes = http.get('http://localhost:3000/api/products');
  check(productsRes, {
    'products 200': (r) => r.status === 200,
  });

  sleep(1);

  // POST login — trace context is injected here too
  const loginRes = http.post(
    'http://localhost:3000/login',
    JSON.stringify({ username: 'user1', password: 'pass1' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(loginRes, {
    'login 200': (r) => r.status === 200,
  });

  sleep(1);
}
```

Run it:

```bash
k6 run scripts/starters/lab-18-starter.js
```

The test should complete without errors. You won't see the trace headers in the terminal output yet — that's the next step.

### Step 4: Verify the traceparent Header Is Being Injected

Add a `console.log` to confirm the header is present. In your default function, after the products request:

```javascript
console.log('Request headers: ' + JSON.stringify(productsRes.request.headers));
```

Re-run the script:

```bash
k6 run scripts/starters/lab-18-starter.js 2>&1 | grep -i traceparent
```

You should see output like:

```
INFO[0001] Request headers: {"Content-Type":"application/json","traceparent":"00-1a2b3c4d..."}
```

The `traceparent` value is unique per request — k6 generates a new span ID for each call while keeping the same trace ID for all requests within one VU iteration (or generates a fresh trace ID per request depending on the propagator configuration).

### Step 5: Check for --out experimental-opentelemetry Support

The `instrumentHTTP` module injects *headers into outgoing requests* so your backend services can propagate the trace. A separate capability — sending k6's own metrics and spans to an OTel endpoint — is available via `--out experimental-opentelemetry` in newer k6 builds.

Check whether your build supports it:

```bash
k6 version
k6 run --out experimental-opentelemetry help 2>&1 || echo "not available in this build"
```

**If available**, run the solution with OTel export to Alloy:

```bash
K6_OTEL_GRPC_EXPORTER_ENDPOINT=localhost:4317 \
K6_OTEL_GRPC_EXPORTER_INSECURE=true \
k6 run --out experimental-opentelemetry scripts/solutions/lab-18-solution.js
```

**If not available**, that is fine — `instrumentHTTP` still provides full trace context injection for your backend services. The OTel export flag is a bonus that sends k6's own performance metrics as OTel spans to Alloy → Tempo.

### Step 6: View Traces in Grafana Explore

Traces flow from Alloy into Tempo and are queryable directly in Grafana Explore. Open the **Grafana** tab (or navigate to **http://localhost:3030**), click **Explore** in the left sidebar, and select **Tempo** as the datasource. Use the **Search** tab to find traces by service name (`k6`) or click **Query type → Search** and browse recent traces.

To watch Alloy processing data in real time, open the **Alloy** tab at **http://localhost:12345**. The pipeline graph shows live component health and data flow through the OTLP receiver and Tempo exporter.

### Step 7: The Full Correlation Story

Put it all together:

```
k6 injects traceparent header
       ↓
demo-app receives request, reads traceparent, creates child span
       ↓
demo-app calls database — passes traceparent to DB client
       ↓
All spans share the same trace ID → Alloy receives via OTLP → Tempo stores them
       ↓
k6 reports p95 = 800ms for /api/products
       ↓
You look up the trace ID from the slow request in Grafana Explore → Tempo
       ↓
You see: 650ms spent in a full table scan on the products query
```

This is the workflow that transforms load testing from "something is slow" to "this specific query on this specific service is slow."

## Expected Output

```
  execution: local
     script: scripts/starters/lab-18-starter.js

INFO[0001] Request headers: {"Content-Type":"application/json","traceparent":"00-4a3f..."}
INFO[0002] Request headers: {"Content-Type":"application/json","traceparent":"00-9c1e..."}

  scenarios: (100.00%) 1 scenario, 2 max VUs, 30s max duration

     checks.........................: 100.00% ✓ 60  ✗ 0
     http_req_duration..............: avg=4.2ms  min=1.8ms  med=3.9ms  max=18ms  p(90)=7ms  p(95)=9ms
     http_req_failed................: 0.00%   ✓ 0   ✗ 60
     iterations.....................: 30      0.99/s
     vus............................: 2       min=2   max=2
```

## Key Takeaways

- `instrumentHTTP({ propagator: 'w3c' })` injects `traceparent` headers into every k6 HTTP request with zero per-request code changes
- The W3C TraceContext format is the industry standard; B3 (Zipkin) is also supported for older stacks
- Trace context injection enables APM correlation — the most actionable connection between synthetic load tests and backend observability
- `--out experimental-opentelemetry` (where available) sends k6's own spans to Alloy → Tempo
- Grafana Alloy (http://localhost:12345) is a Grafana-native telemetry pipeline — it replaces standalone OTel Collector deployments and integrates natively with the rest of the Grafana stack
- Traces are stored in Tempo and visualized in Grafana Explore — no separate UI to context-switch to
- DataDog synthetic tests can correlate with DD APM traces — k6 + OTel achieves the same correlation using open standards with no proprietary agents or per-host pricing
