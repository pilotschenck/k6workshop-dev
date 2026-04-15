# Lab 01: Your First k6 Test

**Time:** 10 min | **Module:** Module 1

## Overview
Write and run your first k6 load test, then read the terminal output to understand what k6 measures by default. You'll modify the test to run with more virtual users and observe how the output changes.

## What You'll Learn
- The minimal structure of a k6 test script
- What `vus` and `duration` options control
- How to read k6's built-in terminal summary (iterations, http_req_duration, etc.)
- How increasing VUs affects throughput and latency

## Prerequisites
- Lab 00 completed — demo-app running at http://localhost:3000 and k6 installed

## Instructions

### Step 0: Make sure you are in the k6workshop-dev directory!

```bash
cd k6workshop-dev
```

### Step 1: Examine the Starter Script

Open the starter script in your editor. Its full content is shown below so you can follow along without switching windows:

```javascript
// scripts/starters/lab-01-starter.js
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '10s',
};

export default function () {
  http.get('http://localhost:3000/');
  sleep(1);
}
```

Key points:
- `options` is a special exported object — k6 reads it to configure the test run
- `vus` is the number of Virtual Users running concurrently
- `duration` is how long the test runs; each VU loops the default function for that duration
- `sleep(1)` pauses each VU for 1 second between iterations, preventing a tight loop

### Step 2: Run the Starter Script

```bash
k6 run scripts/starters/lab-01-starter.js
```

Watch the output. The test runs for 10 seconds with 1 VU.

### Step 3: Read the Output

After the test finishes, k6 prints a summary. The most important sections:

```
✓ checks.........................: 100.00% ...   (no checks yet — this line may be absent)
  http_req_duration..............: avg=Xms  min=Xms  med=Xms  max=Xms  p(90)=Xms p(95)=Xms
  http_req_failed................: 0.00%   ✓ 0   ✗ 0
  iterations.....................: N       N/s
  vus............................: 1       min=1   max=1
```

| Metric | Meaning |
|---|---|
| `http_req_duration` | Full round-trip time for each HTTP request |
| `http_req_failed` | Percentage of requests that returned a non-2xx/3xx status |
| `iterations` | How many times the default function completed |
| `vus` | Virtual user count (min/max seen during the run) |

With 1 VU and `sleep(1)`, you should see roughly 1 iteration every ~1 second, so about 9–10 iterations in a 10-second run.

### Step 4: Increase VUs and Re-run

Edit the starter script (or pass the option on the CLI) to run with 5 VUs:

**Option A — edit the script:**
```javascript
export const options = {
  vus: 5,
  duration: '10s',
};
```

**Option B — override from the CLI (no script edit needed):**
```bash
k6 run --vus 5 --duration 10s scripts/starters/lab-01-starter.js
```

Run it again and compare the output. You should see:
- `iterations` roughly 5× higher
- `vus` showing `min=5  max=5`
- `http_req_duration` may be similar or slightly higher depending on server capacity

### Step 5: View the Solution

The complete solution adds requests to additional endpoints and includes checks. Compare it to your starter:

```bash
k6 run scripts/solutions/lab-01-solution.js
```

You'll learn about `check()` in the next lab. For now, notice how the solution makes three requests per iteration and how that appears in the summary output.

## Expected Output

Running the starter with 1 VU for 10 seconds:

```
  execution: local
     script: scripts/starters/lab-01-starter.js
     output: -

  scenarios: (100.00%) 1 scenario, 1 max VUs, 10s max duration
           * default: 1 looping VUs for 10s (gracefulStop: 30s)


     http_req_duration..............: avg=3.45ms min=2.1ms med=3.2ms max=9.8ms p(90)=5.1ms p(95)=6.3ms
     http_req_failed................: 0.00%  ✓ 0  ✗ 9
     iterations.....................: 9      0.896835/s
     vus............................: 1      min=1   max=1
```

With 5 VUs you should see ~45 iterations and `vus: 5  min=5  max=5`.

## Key Takeaways
- A k6 test only needs three things: an import, an `options` export, and a `default` function export
- `vus` and `duration` are the two most fundamental options — every other feature builds on these
- `sleep()` simulates realistic user think-time; omitting it makes k6 hammer the server as fast as possible
- CLI flags (`--vus`, `--duration`) override options in the script without modifying the file
