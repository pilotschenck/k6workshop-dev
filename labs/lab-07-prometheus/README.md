# Lab 07: Prometheus Remote Write Output

**Time:** 10 min | **Module:** Module 2 — Outputs & Observability

## Overview

k6 can push metrics directly into Prometheus using the **remote write** protocol. This lab walks through enabling the experimental Prometheus remote write output and querying k6 metrics in the Prometheus UI.

## What You'll Learn

- How to configure the k6 Prometheus remote write output via environment variable
- How to run k6 with `--out experimental-prometheus-rw`
- How to query k6 metrics in the Prometheus expression browser
- Why Prometheus must have remote write receiver enabled

## Prerequisites

- Lab 00 (setup) complete and all services healthy
- Lab 03 solution script available at `scripts/solutions/lab-03-solution.js`
- Prometheus running at http://localhost:9090

## Instructions

### Step 1: Verify Prometheus Is Running

```bash
curl -s http://localhost:9090/-/healthy && echo "Prometheus OK"
```

### Step 2: Understand the Remote Write Receiver Flag

> **Workshop Docker Compose already handles this.**
>
> Prometheus does not accept remote write data by default. The receiver must be enabled at startup with the `--web.enable-remote-write-receiver` flag.
>
> In this workshop environment the flag is already set in `docker-compose.yml`:
>
> ```yaml
> prometheus:
>   command:
>     - --config.file=/etc/prometheus/prometheus.yml
>     - --web.enable-remote-write-receiver
> ```
>
> If you ever deploy Prometheus yourself and k6 remote write is not working, this flag is the first thing to check.

### Step 3: Set the Environment Variable

The Prometheus remote write output is configured through the `K6_PROMETHEUS_RW_SERVER_URL` environment variable. Export it in your shell:

```bash
export K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write
```

Verify it is set:

```bash
echo $K6_PROMETHEUS_RW_SERVER_URL
```

### Step 4: Run k6 with Prometheus Remote Write Output

```bash
K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \
  k6 run --out experimental-prometheus-rw scripts/solutions/lab-03-solution.js
```

The prefix `K6_PROMETHEUS_RW_SERVER_URL=...` on the same line overrides the environment variable inline, which is useful for one-off runs. You can also rely on the exported value from Step 3 and omit the prefix:

```bash
k6 run --out experimental-prometheus-rw scripts/solutions/lab-03-solution.js
```

Watch the CLI output for the line confirming the output is active:

```
output: Prometheus remote write (http://localhost:9090/api/v1/write)
```

### Step 5: Open Prometheus and Query k6 Metrics

1. Navigate to http://localhost:9090 in your browser.
2. Click the **Graph** tab (or go directly to http://localhost:9090/graph).
3. In the expression bar, type the following and press **Execute**:

```promql
k6_http_req_duration_p95
```

You should see a time series for the p95 request duration. Try additional queries:

```promql
# Request rate (requests per second)
rate(k6_http_reqs_total[1m])

# Active virtual users
k6_vus

# Check pass rate
k6_checks_total
```

4. Switch to the **Graph** view (toggle above the results table) to see the values plotted over time.

### Step 6: Explore the Metric Names

k6 translates its internal metric names to Prometheus-compatible names by replacing dots with underscores and prepending `k6_`. Examples:

| k6 metric | Prometheus metric |
|-----------|-------------------|
| `http_req_duration` (p95) | `k6_http_req_duration_p95` |
| `http_reqs` | `k6_http_reqs_total` |
| `vus` | `k6_vus` |
| `checks` | `k6_checks_total` |

You can browse all available k6 metrics by clicking **Metrics Explorer** (the globe icon next to the expression bar) and filtering by the `k6_` prefix.

## Expected Output

CLI output at startup:

```
output: Prometheus remote write (http://localhost:9090/api/v1/write)
```

Prometheus UI after a successful query on `k6_http_req_duration_p95` will display a numeric result during the test and a graph showing the latency trend over the run duration.

## Key Takeaways

- The `--out experimental-prometheus-rw` flag enables push-based metrics delivery to Prometheus during a k6 run.
- The server URL is configured via `K6_PROMETHEUS_RW_SERVER_URL` — no code changes needed.
- Prometheus must be started with `--web.enable-remote-write-receiver`; the workshop environment includes this automatically.
- k6 metric names map to Prometheus names with the `k6_` prefix and underscores instead of dots.
- The "experimental" prefix means the API surface may change in future k6 releases, but the feature is production-ready for most use cases.
