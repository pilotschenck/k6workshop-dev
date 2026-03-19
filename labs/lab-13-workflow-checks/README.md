# Lab 13: Multi-Step Workflow Checks (Scripted Checks)

**Time:** 25 min | **Module:** Module 2 — Grafana Cloud

## Overview

Scripted checks in Grafana Synthetic Monitoring let you upload a k6 script that runs as a continuous synthetic monitor. This unlocks multi-step workflow testing — a sequence of HTTP requests with assertions between each step — running on a schedule from probe locations around the world.

The key insight: the scripting language is exactly the same k6 JavaScript you have been writing in Labs 01–08. There is no separate DSL, no UI-driven test builder, no proprietary format to learn. A script you develop locally with `k6 run` can be uploaded to SM with minimal or no changes.

**Important constraint:** SM scripted checks run with a single Virtual User on a schedule. They are not load tests. The goal is "is this workflow working?" — not "how many requests per second can this handle?" Keep SM scripts short, focused, and reliable.

**Note on target URLs:** SM probes run from Grafana's cloud network and cannot reach `http://localhost:3000`. In this lab we use `https://httpbin.org` as the target — it is publicly accessible, has predictable responses, and is ideal for demonstrating multi-step scripted checks. Lab 25 covers Private Probes, which allow SM to reach services inside your private network or VPN.

## What You'll Learn

- How to write a k6 script structured for use as an SM scripted check
- How to run and validate a scripted check locally before uploading it
- How to upload a script to SM and configure a scripted check
- How SM displays per-step (per-check) pass/fail results
- How the solution script improves on the starter with groups, error handling, and custom metrics
- How SM scripted checks compare to DataDog Multistep API tests

## Prerequisites

- Lab 10 completed — SM agent connected to Grafana Cloud
- Lab 11 completed — familiar with the SM check creation workflow
- Labs 01–05 completed — comfortable writing k6 scripts with `check()`, `sleep()`, and `import` statements
- k6 installed on your workstation

## Instructions

### Step 1: Examine the Starter Script

Open the starter script in your editor:

```javascript
// scripts/starters/lab-13-starter.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '30s',
};

export default function () {
  // Step A: Verify headers endpoint returns expected structure
  const headersRes = http.get('https://httpbin.org/headers');
  check(headersRes, {
    'headers: status is 200': (r) => r.status === 200,
    'headers: response has headers object': (r) => {
      const body = JSON.parse(r.body);
      return body.headers !== undefined;
    },
  });

  sleep(1);

  // Step B: POST with a JSON body and verify the echo response
  const payload = JSON.stringify({ workflow: 'lab-13', step: 'B' });
  const postRes = http.post('https://httpbin.org/post', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(postRes, {
    'post: status is 200': (r) => r.status === 200,
    'post: body echoes our payload': (r) => {
      const body = JSON.parse(r.body);
      return body.json && body.json.workflow === 'lab-13';
    },
  });

  sleep(1);

  // Step C: Verify a known-good status endpoint
  const statusRes = http.get('https://httpbin.org/status/200');
  check(statusRes, {
    'status: returns 200 as expected': (r) => r.status === 200,
  });
}
```

Key points about this script:

- `vus: 1` and `duration: '30s'` are present for local testing. SM ignores these — it uses its own 1-VU scheduling model.
- Each step has descriptive `check()` names. In SM, these names appear as individual pass/fail rows in the results dashboard, so choose names that make failures self-explanatory.
- `sleep(1)` between steps simulates user think time. It also prevents httpbin.org from rate-limiting repeated requests.
- The three steps cover the common pattern: read something, write something, verify a known state.

### Step 2: Run the Starter Script Locally

Always validate a scripted check locally before uploading it to SM. Running it locally gives you fast feedback without waiting for SM's scheduling or burning probe quota.

```bash
k6 run scripts/starters/lab-13-starter.js
```

Watch the output for check pass/fail counts. You should see all checks passing:

```
✓ checks.........................: 100.00% ✓ 15  ✗ 0
  http_req_duration..............: avg=210ms min=180ms med=205ms max=290ms p(90)=260ms p(95)=275ms
  http_req_failed................: 0.00%   ✓ 0   ✗ 0
  iterations.....................: 10      0.30/s
```

If any check fails locally, fix it before uploading. A script that fails locally will fail in SM too — but diagnosing it through SM's UI is slower and less informative than reading the local terminal output.

If `https://httpbin.org` is unreachable from your workstation, try running `curl https://httpbin.org/get` to verify connectivity.

### Step 3: Upload the Script to Synthetic Monitoring

In your Grafana Cloud instance, navigate to **Synthetic Monitoring** in the left sidebar.

Click **Add Check** and select **Scripted** from the check type menu.

Fill in the configuration:

| Field | Value |
|---|---|
| Job name | `Multi-Step API Workflow` |
| Frequency | `5 minutes` |
| Timeout | `60s` |

The 60-second timeout is important for multi-step scripts. With three steps each sleeping 1 second plus network time, a single execution easily takes 5–10 seconds. The default timeout of 10s is too short for a meaningful workflow check.

Under **Script**, paste the full contents of `scripts/starters/lab-13-starter.js`. Some SM UI versions offer a file upload button — use whichever method is available.

Under **Probe locations**, select 2–3 locations. For a workflow check, 2 locations is sufficient — you are testing workflow correctness, not geographic latency distribution.

Review the configuration, then click **Save**.

### Step 4: Run an Immediate Test

After saving, click **Test** (or **Run now**) to trigger an immediate execution from one probe location. This verifies the script runs successfully in SM's environment before the first scheduled interval.

The immediate test result appears in a panel below the configuration. You should see:

```
Test result: Success
Duration: 3.2s
Checks passed: 5/5
```

If the immediate test fails, the most common causes are:
- A JavaScript syntax error in the script (missed bracket, typo in import)
- A timeout that is too short for the script to complete
- A network issue from that specific probe location to httpbin.org (try a different probe location)

The error message in the test result panel will indicate which category the failure falls into.

### Step 5: View Scripted Check Results

After the first scheduled run completes (or after running the immediate test), click on **Multi-Step API Workflow** in the checks list to open the results dashboard.

The scripted check results page shows:

- **Reachability** — percentage of executions where all checks passed
- **Duration** — total script execution time per run, graphed over time
- **Check results** — a breakdown of each `check()` call by name, showing pass rate over time

The check name breakdown is the core value of scripted checks in SM. If `'post: body echoes our payload'` starts failing while `'headers: status is 200'` stays green, you know exactly which step broke and can focus your debugging there without looking at logs first.

The **Logs** tab shows the full stdout/stderr output from each probe execution, including any `console.log()` calls in your script. Adding `console.log(r.status, r.body.substring(0, 200))` to a failing step is an effective debugging technique.

### Step 6: Examine and Run the Solution Script

The solution script demonstrates production-quality patterns for SM scripted checks:

```bash
k6 run scripts/solutions/lab-13-solution.js
```

Compare the solution output to the starter output. Notice:

- **Groups** — each step is wrapped in a `group()` call, which organizes the summary output and maps cleanly to SM's results view
- **Custom Trend metrics** — each step records its own duration using `new Trend()`, so you can see per-step latency trends independently in SM dashboards
- **try/catch/finally** — if a step throws an unexpected error, the script catches it, logs a useful message, and continues to the next step rather than crashing the entire execution. In SM, a crashed script counts as a complete failure; graceful error handling lets the check report partial results.
- **Descriptive check names** — every check name follows the pattern `'step-name: what we expected'` to make failures immediately understandable in SM's dashboard without opening logs

The solution script is what you would use as a starting template for real SM scripted checks in a production environment.

## Key Differences: SM Scripted Checks vs. Local k6 Runs

| Aspect | SM Scripted Check | Local k6 Run |
|---|---|---|
| VUs | Always 1 | Configurable |
| Execution trigger | Scheduled (every N minutes) | On-demand (`k6 run`) |
| Results storage | Grafana Cloud (queryable) | Terminal only (or --out) |
| Alerting | Native SM alerting | Requires external setup |
| `vus` / `duration` options | Ignored by SM | Used by k6 |
| Target URL requirement | Must be publicly reachable | Can be localhost |
| Best used for | "Is it working?" | "How fast / how much load?" |

SM ignores the `vus` and `duration` fields in your `options` export — it uses its own 1-VU, per-schedule-interval execution model. Keep those fields in the script so it still runs correctly with `k6 run` locally, but understand that SM will not use them.

**Best practice for script length:** SM scripted checks should complete in under 30 seconds for a 60-second timeout. If your workflow has more than 5–6 steps, consider splitting it into multiple scripted checks — one for authentication, one for the core workflow, one for edge cases. Shorter scripts are easier to debug when they fail.

## Comparison with DataDog

DataDog Multistep API tests are the closest equivalent to SM Scripted Checks:

| DataDog | Grafana SM |
|---|---|
| Multistep API Test | Scripted Check |
| JSON test definition or UI builder | k6 JavaScript script |
| Proprietary assertion syntax | Standard k6 `check()` calls |
| Separate from load test tooling | Same language as k6 load tests |
| Available on Business plan and above | Included in SM on all plans |

The significant advantage of SM scripted checks is the shared language: the same k6 skills, the same `check()` function, the same import syntax, and the same debugging workflow you use for load testing in Labs 01–08 apply directly to synthetic monitoring. There is no context switch, no separate tool to learn, no proprietary DSL.

In DataDog, your load testing tool (Gatling, JMeter, Locust) and your synthetic monitoring tool (DataDog Synthetics) are entirely separate products with different scripting languages and different results UIs. In Grafana's ecosystem, k6 is the scripting language for both — whether you are running a 1,000-VU load test or a 1-VU synthetic check, you write the same kind of script.

## Expected Output

Running the starter script locally with 1 VU for 30 seconds (about 10 iterations):

```
  execution: local
     script: scripts/starters/lab-13-starter.js
     output: -

  scenarios: (100.00%) 1 scenario, 1 max VUs, 30s max duration
           * default: 1 looping VUs for 30s (gracefulStop: 30s)


✓ checks.........................: 100.00% ✓ 50  ✗ 0
  http_req_duration..............: avg=215ms min=175ms med=210ms max=350ms p(90)=270ms p(95)=295ms
  http_req_failed................: 0.00%   ✓ 0   ✗ 0
  iterations.....................: 10      0.30/s
  vus............................: 1       min=1   max=1
```

In Grafana Cloud SM, after the check has run a few times, the checks list shows:

```
Multi-Step API Workflow    Scripted    —    100%    2 probes    5m
```

Clicking into the check shows each `check()` call as its own row with individual pass rates.

## Key Takeaways

- SM scripted checks use the exact same k6 JavaScript syntax as local load tests — no separate DSL to learn
- Always run and validate the script locally with `k6 run` before uploading to SM
- SM ignores `vus` and `duration` options; it runs 1 VU on its own schedule
- SM scripted checks require a publicly reachable target URL — use Private Probes (Lab 25) for internal services
- Descriptive `check()` names are not optional in SM — they are the primary signal in the results dashboard
- Wrapping steps in `group()` and adding per-step `Trend` metrics gives you granular visibility when a workflow degrades
- The shared k6 scripting language between load tests and synthetic checks is a meaningful advantage over DataDog's separate tooling ecosystems
