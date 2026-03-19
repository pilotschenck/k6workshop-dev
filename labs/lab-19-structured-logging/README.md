# Lab 19: Structured Logging in k6 Tests

**Time:** 15 min | **Module:** Module 3 — Advanced

## Overview

k6 supports `console.log`, `console.info`, `console.warn`, and `console.error` out of the box, and can emit all log output as structured JSON lines. Structured logs are machine-readable, filterable by field, and can be forwarded to a log management system like Grafana Loki. This is essential for debugging complex test scripts and for building an audit trail of what happened during a load test run.

## What You'll Learn

- The four console log levels and where output appears
- How to enable JSON log format with `--log-format json`
- How to write logs to a file with `--log-output`
- How to embed VU and iteration context in log messages using `__VU` and `__ITER`
- Conditional logging patterns to reduce noise at scale
- The concept of forwarding k6 logs to Grafana Loki
- When to use logs vs metrics

## Prerequisites

- Labs 01–08 completed
- demo-app running at http://localhost:3000

## Instructions

### Step 1: Basic Console Logging

Open `scripts/starters/lab-19-starter.js`. The starter makes requests to three endpoints and has TODO markers for logging calls.

k6 maps the four console methods to log levels:

| Method | Level | When to use |
|--------|-------|-------------|
| `console.log` | info | General trace messages during development |
| `console.info` | info | Informational milestones |
| `console.warn` | warn | Unexpected-but-not-failing conditions |
| `console.error` | error | Failures, assertion errors, caught exceptions |

All output goes to **stderr** by default. In the terminal you will see it interleaved with k6's progress output. When you collect results in CI, redirect stderr to a file:

```bash
k6 run script.js 2>k6-logs.txt
```

Log messages appear prefixed with their level and a timestamp:

```
INFO[0002] product count: 5                    source=console
WARN[0005] slow response: 742ms                source=console
ERRO[0008] checkout failed: 500                source=console
```

Run the starter as-is to see the baseline output, then proceed to add logging in the steps below.

### Step 2: Enable JSON Log Format

JSON log format converts every log line into a structured JSON object, which any log shipper (Promtail, Fluent Bit, Logstash) can parse and forward without custom parsing rules.

```bash
k6 run --log-format json scripts/starters/lab-19-starter.js
```

A single log line now looks like:

```json
{"level":"info","msg":"product count: 5","source":"console","time":"2024-01-15T10:23:45.123Z"}
```

Fields:
- `level` — the log level string
- `msg` — your message
- `source` — `"console"` for your code's log calls; `"k6"` for internal k6 messages
- `time` — ISO 8601 timestamp (useful for correlating with server-side timestamps)

This format is compatible with Grafana Loki's log ingestion pipeline without any transformation.

### Step 3: Write Logs to a File

Separating log output from k6's progress display makes both more readable. Use `--log-output` to send all log lines to a file:

```bash
mkdir -p logs
k6 run --log-output file=logs/test.log --log-format json scripts/starters/lab-19-starter.js
```

After the run, inspect the log file:

```bash
cat logs/test.log | jq .
```

You can filter to only error lines:

```bash
cat logs/test.log | jq 'select(.level == "error")'
```

Or find all messages from a specific VU after you add VU context in the next step:

```bash
cat logs/test.log | jq 'select(.msg | contains("VU 1"))'
```

### Step 4: Embed VU and Iteration Context

k6 exposes two global variables in the default function scope:

| Variable | Value |
|----------|-------|
| `__VU` | Integer — which virtual user is running (1-indexed) |
| `__ITER` | Integer — how many times this VU has completed the default function (0-indexed) |

Add these to every log message so you can reconstruct the exact sequence of events for a failing VU:

```javascript
const productsRes = http.get('http://localhost:3000/api/products');
console.log(`VU ${__VU} iter ${__ITER}: /api/products → ${productsRes.status} in ${productsRes.timings.duration.toFixed(1)}ms`);
```

With 3 VUs you will see interleaved output from all three:

```
INFO[0001] VU 1 iter 0: /api/products → 200 in 4.2ms   source=console
INFO[0001] VU 2 iter 0: /api/products → 200 in 5.1ms   source=console
INFO[0001] VU 3 iter 0: /api/products → 200 in 3.8ms   source=console
INFO[0003] VU 1 iter 1: /api/products → 200 in 4.5ms   source=console
```

When investigating a failure, grep the log file for the specific VU and iteration:

```bash
cat logs/test.log | jq 'select(.msg | contains("VU 2 iter 3"))'
```

### Step 5: Conditional Logging — Log Only on Failure

Logging every request at high VU counts creates enormous log volume and slows down the test. The better pattern is to log request details only when a check fails:

```javascript
const loginRes = http.post(
  'http://localhost:3000/login',
  JSON.stringify({ username: 'user1', password: 'pass1' }),
  { headers: { 'Content-Type': 'application/json' } }
);

const loginOk = check(loginRes, {
  'login status 200': (r) => r.status === 200,
  'login response time < 1s': (r) => r.timings.duration < 1000,
});

if (!loginOk) {
  console.error(
    `VU ${__VU} iter ${__ITER}: login FAILED — ` +
    `status=${loginRes.status} duration=${loginRes.timings.duration.toFixed(0)}ms ` +
    `body=${loginRes.body.substring(0, 200)}`
  );
}
```

This pattern gives you silence during healthy runs and precise diagnostic output exactly when something breaks — no post-hoc log archaeology required.

### Step 6: Log Forwarding to Grafana Loki

In newer k6 versions, `--log-output` accepts a Loki endpoint directly:

```bash
k6 run \
  --log-output loki=http://localhost:3100/loki/api/v1/push \
  --log-format json \
  scripts/solutions/lab-19-solution.js
```

Loki is not included in this workshop's local stack, but the pattern is worth understanding because it completes the Grafana LGTM observability stack:

| Letter | Tool | k6 integration |
|--------|------|----------------|
| L | Loki | `--log-output loki=...` |
| G | Grafana | Dashboards for all data sources |
| T | Tempo | OTel trace context from lab 18 |
| M | Mimir / Prometheus | `--out prometheus-rw` or Prometheus remote write |

In a production workflow, k6 pushes metrics to Mimir, logs to Loki, and trace IDs to Tempo — all queryable and correlated in a single Grafana dashboard. This is the architectural advantage over DataDog, where log management, APM, and synthetic tests are separate products with per-GB and per-host pricing.

### Step 7: Logs vs Metrics — Know When to Use Each

| Concern | Use logs | Use metrics |
|---------|----------|-------------|
| Why did VU 7 get a 500? | Yes — log the response body | No |
| What is the overall error rate? | No | Yes — `http_req_failed` |
| What did the checkout response body say? | Yes — `console.error` the body | No |
| Is p95 latency within SLO? | No | Yes — threshold on `http_req_duration` |
| Which user session triggered the bug? | Yes — log `__VU`, `__ITER` | No |
| How many orders completed over 30s? | No | Yes — Counter metric |

Logs are for diagnosing specific events. Metrics aggregate across all events. Use both.

## Expected Output

Running with JSON log format and 2 VUs:

```bash
k6 run --log-format json scripts/solutions/lab-19-solution.js 2>&1 | head -20
```

```
{"level":"info","msg":"VU 1 iter 0: /api/products → 200 in 4.1ms","source":"console","time":"..."}
{"level":"info","msg":"VU 2 iter 0: /api/products → 200 in 5.3ms","source":"console","time":"..."}
{"level":"info","msg":"VU 1 iter 0: login → 200 in 12.4ms","source":"console","time":"..."}
{"level":"info","msg":"VU 2 iter 0: login → 200 in 11.8ms","source":"console","time":"..."}
```

At the end of the run with no errors, the summary shows 100% check pass rate and no error-level log lines.

## Key Takeaways

- `console.log/info/warn/error` map directly to k6 log levels and appear in stderr by default
- `--log-format json` turns every log line into a structured JSON object ready for any log shipper
- `--log-output file=logs/test.log` separates logs from k6's progress display
- `__VU` and `__ITER` are essential for correlating log lines back to a specific VU iteration
- Log only on failure to keep volume manageable at high VU counts
- k6 logs integrate with Grafana Loki to complete the LGTM observability stack — a single platform vs DataDog's separate products with per-GB pricing
