# Lab 08: JSON Output and CLI Result Analysis

**Time:** 15 min | **Module:** Module 2 — Outputs & Observability

## Overview

Sometimes you need to capture test results as structured data for post-processing, archiving, or feeding into a CI pipeline. k6 supports a line-delimited JSON output format that records every metric data point. This lab also covers the built-in end-of-test summary and the `handleSummary` hook for generating custom reports.

## What You'll Learn

- How to write k6 metric data to a JSON file with `--out json`
- The structure of k6 JSON output records (metric, type, value, tags)
- How to extract specific metrics using `jq`
- What the end-of-test CLI summary contains and how to read it
- How to use `handleSummary` to produce a custom report (Markdown, HTML, or any format)
- The k6-reporter community tool for HTML report generation

## Prerequisites

- Lab 00 (setup) complete and all services healthy
- Lab 02 solution script available at `scripts/solutions/lab-02-solution.js`
- `jq` installed (verify with `jq --version`)

## Instructions

### Step 1: Run k6 with JSON Output

```bash
k6 run --out json=results.json scripts/solutions/lab-02-solution.js
```

This writes every metric data point to `results.json` while the test runs. The file is created immediately and grows as the test progresses.

After the run, check the file size:

```bash
wc -l results.json
```

A short test can produce thousands of lines — one JSON object per data point.

### Step 2: Understand the JSON Record Structure

Each line in `results.json` is a self-contained JSON object. Open a few lines to see the structure:

```bash
head -5 results.json | jq .
```

A typical HTTP request duration data point looks like this:

```json
{
  "type": "Point",
  "metric": "http_req_duration",
  "data": {
    "time": "2024-01-15T10:23:45.123456789Z",
    "value": 142.35,
    "tags": {
      "expected_response": "true",
      "group": "",
      "method": "GET",
      "name": "http://localhost:3000/",
      "proto": "HTTP/1.1",
      "scenario": "default",
      "status": "200",
      "url": "http://localhost:3000/"
    }
  }
}
```

Key fields:

| Field | Description |
|-------|-------------|
| `type` | Always `"Point"` for metric data |
| `metric` | The k6 metric name (e.g., `http_req_duration`) |
| `data.time` | ISO 8601 timestamp of the sample |
| `data.value` | Numeric value (milliseconds for durations) |
| `data.tags` | Labels attached to this sample (URL, method, status, etc.) |

### Step 3: Extract Specific Metrics with jq

Filter for only `http_req_duration` data points:

```bash
cat results.json | jq 'select(.type=="Point" and .metric=="http_req_duration")'
```

Extract just the values and timestamps as a compact array:

```bash
cat results.json | jq -c 'select(.type=="Point" and .metric=="http_req_duration") | {t: .data.time, ms: .data.value}'
```

Count how many requests were made:

```bash
cat results.json | jq 'select(.type=="Point" and .metric=="http_reqs")' | wc -l
```

Find the slowest request:

```bash
cat results.json | jq 'select(.type=="Point" and .metric=="http_req_duration") | .data.value' | sort -n | tail -1
```

Calculate the average response time across all requests:

```bash
cat results.json | jq -s '[.[] | select(.type=="Point" and .metric=="http_req_duration") | .data.value] | add/length'
```

### Step 4: Read the End-of-Test CLI Summary

After any k6 run (with or without `--out json`), k6 prints a summary table. It looks like:

```
     checks.........................: 100.00% ✓ 120  ✗ 0
     data_received..................: 1.2 MB  20 kB/s
     data_sent......................: 98 kB   1.6 kB/s
     http_req_blocked...............: avg=1.23ms   min=1µs     med=3µs     max=234ms   p(90)=7µs     p(95)=12µs
     http_req_connecting............: avg=512µs    min=0s      med=0s      max=123ms   p(90)=0s      p(95)=0s
     http_req_duration..............: avg=145ms    min=12ms    med=130ms   max=890ms   p(90)=280ms   p(95)=340ms
       { expected_response:true }...: avg=145ms    min=12ms    med=130ms   max=890ms   p(90)=280ms   p(95)=340ms
     http_req_failed................: 0.00%   ✓ 0    ✗ 120
     http_req_receiving.............: avg=2.1ms    min=150µs   med=1.8ms   max=18ms    p(90)=4.2ms   p(95)=5.6ms
     http_req_sending...............: avg=123µs    min=54µs    med=110µs   max=890µs   p(90)=190µs   p(95)=220µs
     http_req_tls_handshaking.......: avg=0s       min=0s      med=0s      max=0s      p(90)=0s      p(95)=0s
     http_req_waiting...............: avg=143ms    min=11ms    med=128ms   max=887ms   p(90)=276ms   p(95)=336ms
     http_reqs......................: 120     2/s
     iteration_duration.............: avg=1.15s    min=1.01s   med=1.13s   max=1.89s   p(90)=1.31s   p(95)=1.42s
     iterations.....................: 120     2/s
     vus............................: 2       min=2        max=2
     vus_max........................: 2       min=2        max=2
```

The columns show aggregate statistics (avg, min, median, max, p90, p95) for the entire run. Threshold results appear above this table with a green check or red cross.

### Step 5: Generate a Custom Report with handleSummary

k6 lets you intercept the summary data and return custom output using the `handleSummary` exported function. Run the lab solution script which includes this feature:

```bash
k6 run --out json=results.json scripts/solutions/lab-08-solution.js
```

After the run, a `summary.md` file is created in the current directory:

```bash
cat summary.md
```

The `handleSummary` hook receives the full summary object — the same data that powers the CLI table — and can return content for any combination of `stdout`, `stderr`, or named files.

Here is the core pattern used in the solution script:

```javascript
export function handleSummary(data) {
  const p95 = data.metrics['http_req_duration'].values['p(95)'];
  const rps = data.metrics['http_reqs'].values['rate'];
  const errorRate = data.metrics['http_req_failed'].values['rate'];

  const md = `# Test Summary\n\n- **p95 latency:** ${p95.toFixed(2)} ms\n- **Requests/s:** ${rps.toFixed(2)}\n- **Error rate:** ${(errorRate * 100).toFixed(2)}%\n`;

  return {
    stdout: md,
    'summary.md': md,
  };
}
```

The returned object maps destination names to string content. Use `stdout` and `stderr` for terminal output and any other key for a file path.

### Step 6: HTML Reports with k6-reporter (Concept)

The community tool **k6-reporter** converts the `handleSummary` data object into a rich HTML report with charts and tables.

Install it from npm or import it directly in your script:

```javascript
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

export function handleSummary(data) {
  return {
    'summary.html': htmlReport(data),
  };
}
```

Open `summary.html` in a browser after the run to see a formatted report. Note that this requires an internet connection to fetch the module unless you have it cached locally.

> **Note:** k6-reporter is a community project, not an official Grafana product. It is not pre-installed in the workshop environment. The pattern shown here is for awareness — `handleSummary` with custom Markdown (as in the solution script) is sufficient for this lab.

## Expected Output

After running with `--out json=results.json`:

```
output: json (results.json)
```

After the run, `summary.md` will be written and its contents printed to stdout — a short Markdown table with the key metric values.

`results.json` will contain one JSON object per line, with thousands of data points for a multi-VU run.

## Key Takeaways

- `--out json=<filename>` captures every raw metric sample as line-delimited JSON for post-processing.
- Each JSON record has a `type`, `metric`, and `data` object with `time`, `value`, and `tags`.
- `jq` is a powerful tool for slicing and aggregating JSON output files.
- The end-of-test CLI summary provides aggregate statistics (avg, min, med, max, p90, p95) for every metric.
- `handleSummary` lets you produce any output format (Markdown, JSON, HTML) from the same data that drives the CLI table.
- Custom summary output integrates naturally with CI pipelines — write a file and post it as a build artifact or send it to a Slack webhook.
