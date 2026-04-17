# Lab 09: k6 Cloud Run

**Time:** 20 min | **Module:** Module 2 — Grafana Cloud

## Overview

So far every test you have run has been executed locally: k6 runs on your workstation, results are printed to the terminal (and optionally written to InfluxDB or a JSON file), and the data stays on your machine. `k6 cloud run` changes that — the script is sent to Grafana Cloud, executed there, and results are streamed back in real time and stored persistently in your Grafana Cloud k6 account.

This lab walks you through running the same script both ways so you can see exactly what changes, then explores the cloud results UI.

> **DataDog comparison:** In DataDog you configure a Synthetic test in the UI to run on-demand from a fixed set of locations. `k6 cloud run` gives you the same persistent, shareable results but you write the test as code — so any script complexity (scenarios, parameterization, custom logic) comes along for free. Load testing in DataDog is a separate product; with Grafana you move from uptime checks to full load tests without switching tools.

## What You'll Learn

- The difference between `k6 run` (local execution) and `k6 cloud run` (Grafana Cloud execution)
- How to verify your cloud token is configured correctly
- What the `k6 cloud run` terminal output looks like while a run is in progress
- How to navigate the k6 Cloud results UI: run overview, performance insights, checks, HTTP tab
- What cloud results give you that local runs cannot

## Prerequisites

- Labs 01–08 complete
- A Grafana Cloud account created in the pre-lab
- `K6_CLOUD_TOKEN` environment variable set (done in pre-lab)

## Instructions

### Step 1: Verify Your Cloud Token

The `K6_CLOUD_TOKEN` environment variable authenticates your CLI against your Grafana Cloud account. Confirm it is set:

```bash
echo $K6_CLOUD_TOKEN
```

You should see a long alphanumeric string. If the variable is empty, return to the pre-lab instructions to retrieve your token from **grafana.com → Your Stack → k6 → Settings → API Token**.

Set it for the current session if needed:

```bash
export K6_CLOUD_TOKEN=<paste-your-token-here>
```

To make it permanent across terminal sessions on this workstation:

```bash
echo 'export K6_CLOUD_TOKEN=<paste-your-token-here>' >> ~/.bashrc
source ~/.bashrc
```

### Step 2: Examine the Starter Script

Open the starter script to understand what it tests:

```javascript
// scripts/starters/lab-09-starter.js
import http from 'k6/http';
import { sleep } from 'k6';

const BASE_URL = `https://grafana-workstation-3000u-${__ENV.INSTRUQT_PARTICIPANT_ID}.env.play.instruqt.com`;

export const options = {
  vus: 2,
  duration: '30s',
};

export default function () {
  // Home page
  http.get(`${BASE_URL}/`);
  sleep(1);

  // Product catalog
  http.get(`${BASE_URL}/api/products`);
  sleep(1);

  // Login endpoint
  const payload = JSON.stringify({
    username: 'testuser',
    password: 'password123',
  });
  const params = { headers: { 'Content-Type': 'application/json' } };
  http.post(`${BASE_URL}/login`, payload, params);
  sleep(1);
}
```

The script hits three endpoints on the demo-app with 2 VUs for 30 seconds. Simple and intentional — you want to be able to compare the local vs cloud experience on the same workload.

> **Why the proxy URL?** When k6 Cloud executes your script, it runs on Grafana's infrastructure — not on your workstation. That means `http://localhost:3000` resolves to a machine in the cloud, not to your demo-app. Every Instruqt workstation exposes its ports through a public proxy URL of the form `https://grafana-workstation-<port>u-<participant-id>.env.play.instruqt.com`. The `INSTRUQT_PARTICIPANT_ID` environment variable is set automatically in your workstation, so the script builds the correct URL at runtime. Use `3000u` for the working demo-app and `3001u` for the broken-app. See the [Instruqt networking docs](https://docs.instruqt.com/reference/platform/networking#overview#inbound-traffic) for details.

### Step 3: Run Locally First

```bash
k6 run scripts/starters/lab-09-starter.js
```

Note the key characteristics of local execution:

- Results appear only in this terminal
- The summary disappears when you close the window
- No URL is given — there is nothing to share with a colleague
- Data can be forwarded to InfluxDB (Lab 06) or a JSON file (Lab 08) but requires your own infrastructure

The output ends with a summary table and nothing else:

```
     http_req_duration..............: avg=4.2ms  min=1.8ms  med=3.9ms  max=22ms   p(90)=7.1ms  p(95)=9.4ms
     http_req_failed................: 0.00%  ✓ 0   ✗ 18
     iterations.....................: 6      0.19/s
     vus............................: 2      min=2   max=2
```

Results are gone the moment this terminal session ends.

### Step 4: Run in the Cloud

Now run the exact same script against Grafana Cloud k6:

```bash
k6 cloud run scripts/starters/lab-09-starter.js
```

The output looks different from a local run:

```
          /\      Grafana   /‾‾/
     /\  /  \     |\  __   /  /
    /  \/    \    | |/ /  /   ‾‾\
   /          \   |   (  |  (‾)  |
  / __________ \  |_|\_\  \_____/

  execution: cloud
     script: scripts/starters/lab-09-starter.js
     output: https://<your-stack>.grafana.net/a/k6-app/runs/<run-id>

  scenarios: (100.00%) 1 scenario, 2 max VUs, 1m0s max duration (incl. graceful stop)
           * default: 2 looping VUs for 30s (gracefulStop: 30s)

     ✓ default ✓

     default ✓ [==============================] 2 VUs  30s

     data_received..................: 8.2 kB  273 B/s
     http_req_duration..............: avg=4.1ms  ...
     ...

  Run your test results here: https://<your-stack>.grafana.net/a/k6-app/runs/<run-id>
```

Key differences from local:
- `execution: cloud` instead of `execution: local`
- A **results URL** is printed immediately and again at the end — open it while the test is still running to watch results stream in live

> **Note:** For this workshop the cloud token is personal — results go to your own Grafana Cloud account. Your test runs and results are not shared with other workshop participants.

### Step 5: Explore the Cloud Results UI

Open the URL from the previous step in your browser. The k6 Cloud results page has several sections:

**Run Overview (top of page)**
- Test status badge (Finished / Running / Failed)
- Duration, VUs, total requests, error rate at a glance
- Threshold results with pass/fail status

**Performance Insights tab**
- Grafana's automated analysis of your run
- Flags potential issues: high error rate, latency spikes, throughput drops
- Think of this as a "first reading" before you dig into raw metrics

**HTTP tab**
- Breakdown by URL: each endpoint you called appears as a row
- Columns: request count, avg/p95/max duration, failure rate
- Click any row to see a full time-series chart for that specific endpoint
- Useful for identifying which endpoint is slow when you have many

**Checks tab**
- Shows pass/fail counts for every `check()` call in your script
- The starter script has no checks yet — this tab will be empty until Step 6

**Script tab**
- The exact script that was run, stored alongside the results
- Invaluable six months later when you can't remember what you were testing

Spend a few minutes clicking through these tabs. Notice how the HTTP tab shows three separate rows — one per endpoint — even though your script makes them in the same `default` function.

### Step 6: Run the Solution for a More Interesting Cloud Run

The solution script adds load stages, checks, and a threshold to produce a richer result set worth exploring:

```bash
k6 cloud run scripts/solutions/lab-09-solution.js
```

The staged options in the solution:

```javascript
export const options = {
  stages: [
    { duration: '20s', target: 5 },  // ramp up
    { duration: '30s', target: 5 },  // sustain peak load
    { duration: '10s', target: 0 },  // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};
```

Open the results URL while the run is in progress. Watch the VU graph rise during the ramp-up phase, hold flat during the sustain phase, and drop during ramp-down. This is the kind of load profile that reveals server behaviour under realistic traffic patterns — cold start latency, connection pool saturation, garbage collection pauses.

After the run completes:
- Check the **Checks** tab — you should see pass counts for each `check()` call
- Look at the **threshold** results at the top — green if p95 < 500 ms, red if exceeded
- Compare the HTTP tab's p95 column against the overall p95 in the overview

## Expected Output

When you run `k6 cloud run`, the terminal output includes a results URL:

```
  execution: cloud
     script: scripts/starters/lab-09-starter.js
     output: https://app.grafana.com/a/k6-app/runs/XXXXXXXX

  Run your test results here: https://app.grafana.com/a/k6-app/runs/XXXXXXXX
```

The exact run ID in the URL is unique to your account and test run.

## What Cloud Gives You Over Local

| Capability | `k6 run` (local) | `k6 cloud run` |
|---|---|---|
| Results storage | Terminal only (lost on close) | Persistent, stored in Grafana Cloud |
| Shareable URL | No | Yes — send the link to any team member |
| Performance insights | No | Yes — automated analysis flags issues |
| Multi-location execution | No | Yes (requires cloud plan) |
| Results dashboard | DIY (InfluxDB + Grafana) | Built-in, pre-configured |
| Script storage | Local filesystem only | Stored with the run in the cloud |
| Historical comparison | Manual | Built-in trend view across runs |

## Key Takeaways

- `k6 cloud run` is a drop-in replacement for `k6 run` — the script is identical; only the execution destination changes
- Cloud results are persistent and shareable via URL with no extra infrastructure needed
- The k6 Cloud UI breaks results down by endpoint, check, and time — far richer than the terminal summary alone
- Performance Insights is a free automated analysis layer that flags common load testing problems
- Your local InfluxDB + Grafana setup (Labs 06–07) is still useful for real-time streaming; cloud is better for post-run analysis and sharing
