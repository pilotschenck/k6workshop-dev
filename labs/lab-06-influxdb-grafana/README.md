# Lab 06: Streaming Results to InfluxDB + Grafana

**Time:** 20 min | **Module:** Module 2 — Outputs & Observability

## Overview

k6 can stream test metrics in real time to external systems. In this lab you will send results to a local InfluxDB instance and watch them appear live on a pre-built Grafana dashboard — giving you a richer, more visual view of your load test than the CLI alone provides.

## What You'll Learn

- How to use the `--out` flag to send metrics to InfluxDB
- How to open and navigate the bundled Grafana k6 dashboard
- Which panels to watch during a run (VUs, request rate, p95/p99, error rate)
- How the InfluxDB datasource is wired into Grafana

## Prerequisites

- Lab 00 (setup) complete and all services healthy
- Lab 03 solution script available at `scripts/solutions/lab-03-solution.js`
- Grafana running at http://localhost:3030
- InfluxDB running at http://localhost:8086

## Instructions

### Step 1: Verify Services Are Up

Confirm InfluxDB and Grafana are reachable before starting.

```bash
curl -s http://localhost:8086/ping && echo "InfluxDB OK"
curl -s http://localhost:3030/api/health | grep ok && echo "Grafana OK"
```

Both commands should return success responses. If either fails, re-run the smoke check (`k6 run scripts/smoke-check.js`) and check your Docker Compose stack.

### Step 2: Run k6 with InfluxDB Output

Open a terminal and run the following command. Keep this terminal visible — you will watch the Grafana dashboard simultaneously.

```bash
k6 run --out influxdb=http://localhost:8086/k6 scripts/solutions/lab-06-solution.js
```

> **InfluxDB output flag syntax**
>
> The `--out` flag accepts a string in the form `<output-type>=<connection-string>`.
>
> - `influxdb` — the built-in InfluxDB output module
> - `http://localhost:8086/k6` — the InfluxDB base URL followed by the **database name** (`k6`)
>
> k6 creates the database automatically if it does not exist. You can change `k6` to any name; just make sure the Grafana datasource points to the same database.
>
> Full reference: https://grafana.com/docs/k6/latest/results-output/real-time/influxdb/

### Step 3: Open Grafana

In your browser, navigate to:

```
http://localhost:3030
```

Log in with the default credentials (if prompted):

| Field    | Value   |
|----------|---------|
| Username | `admin` |
| Password | `admin` |

### Step 4: Navigate to the k6 Overview Dashboard

1. Click the **Dashboards** icon in the left sidebar (four squares).
2. Browse to **k6 / k6 Overview** (or search for "k6" in the search bar).
3. Click the dashboard to open it.

### Step 5: Watch Metrics Appear in Real Time

With the test still running in your terminal, observe the Grafana panels refreshing every few seconds. You should see data flowing in within 5–10 seconds of starting the run.

Key panels to watch:

| Panel | What It Shows |
|-------|---------------|
| **Virtual Users** | Active VU count across the 3-stage ramp |
| **Request Rate** | HTTP requests per second |
| **Response Time (p95 / p99)** | Latency percentiles for all requests |
| **Error Rate** | Fraction of requests returning non-2xx status |
| **Checks Passed / Failed** | Pass rate of named k6 checks |

### Step 6: Explore the InfluxDB Datasource

1. In Grafana, go to **Configuration → Data Sources** (gear icon → Data sources).
2. Click the **InfluxDB** datasource entry.
3. Note the URL (`http://influxdb:8086`) and database name (`k6`).

This is how Grafana knows where to query for k6 metrics. The datasource is pre-configured in the workshop Docker Compose stack via provisioning files.

### Step 7: Examine Individual Panels

Click the title of any panel and select **Edit** to see the underlying InfluxQL query. For example, the p95 response time panel queries:

```sql
SELECT percentile("value", 95) FROM "http_req_duration" WHERE $timeFilter GROUP BY time($__interval) fill(none)
```

This gives you a starting point for building your own custom dashboards later.

## Expected Output

CLI output during the run will look similar to:

```
          /\      |‾‾| /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / __________ \  |__| \__\ \_____/ .io

     execution: local
        output: InfluxDB http://localhost:8086/k6
        ...

scenarios: (100.00%) 1 scenario, 10 max VUs, 1m30s max duration
```

After the run completes, the Grafana dashboard retains all data — you can use the time picker to review the full test window.

## Key Takeaways

- The `--out influxdb=<url>/<database>` flag streams every metric data point to InfluxDB during the run.
- Grafana queries InfluxDB in near real time, making it possible to monitor a test as it executes.
- The k6 InfluxDB output is built in — no extension required for InfluxDB v1.x.
- Panels like p95/p99 latency and error rate are the most operationally meaningful signals to watch during a load test.
- Data persists in InfluxDB after the run, enabling post-test analysis and comparison across runs.
