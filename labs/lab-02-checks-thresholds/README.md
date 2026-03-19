# Lab 02: HTTP Checks and Thresholds

**Time:** 15 min | **Module:** Module 1

## Overview
Add `check()` calls to validate response correctness, then define `thresholds` so k6 exits with a non-zero status code when performance goals are not met. You'll intentionally run against the broken-app to see what a real threshold failure looks like.

## What You'll Learn
- How to use `check()` to assert status codes, response times, and body content
- How to set pass/fail thresholds on built-in and custom metrics
- What threshold failures look like in the terminal output and exit code
- How to use the `BROKEN_URL` environment variable to switch targets without editing the script

## Prerequisites
- Lab 01 completed — comfortable running k6 scripts and reading the summary output

## Instructions

### Step 1: Add check() Calls

`check()` is imported from the `k6` module. It takes a response and an object of named assertions:

```javascript
import { check } from 'k6';
import http from 'k6/http';

export default function () {
  const res = http.get('http://localhost:3000/');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'body contains products': (r) => r.body.includes('products'),
  });
}
```

Each assertion is a named function that returns `true` (pass) or `false` (fail). k6 tracks the pass rate across all iterations and reports it in the summary.

Important: `check()` **does not stop the test** on failure. It records the result and moves on. Use thresholds (next step) to make the test fail.

### Step 2: Add Thresholds to options

Thresholds are expressions evaluated against metric values at the end of the test (or continuously during the run):

```javascript
export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    // 95th-percentile response time must stay under 500ms
    http_req_duration: ['p(95)<500'],
    // At least 95% of checks must pass
    checks: ['rate>0.95'],
  },
};
```

Threshold expressions follow the pattern `<aggregation><operator><value>`:
- `p(95)<500` — 95th percentile must be less than 500 (ms)
- `avg<200` — average must be under 200ms
- `rate>0.95` — rate (fraction) must be greater than 0.95

### Step 3: Run Against the Demo-App (Should Pass)

```bash
k6 run scripts/solutions/lab-02-solution.js
```

With the demo-app running normally, both thresholds should pass. Look for the green checkmarks in the output:

```
✓ checks.........................: 100.00% ✓ 150  ✗ 0
✓ http_req_duration.............: avg=4ms p(95)=12ms
```

### Step 4: Run Against the Broken-App (Should Fail)

The broken-app deliberately returns slow responses and errors. Run the same script against it by overriding the base URL with an environment variable:

```bash
k6 run -e BASE_URL=http://localhost:3001 scripts/solutions/lab-02-solution.js
```

Or use the starter script which has the broken-app URL hardcoded for demonstration:

```bash
k6 run scripts/starters/lab-02-starter.js
```

You will see the thresholds fail in the output and k6 will exit with code `99`.

### Step 5: Observe the Failure Output

A failed threshold looks like this in the terminal:

```
✗ checks.........................: 72.00%  ✓ 108  ✗ 42
✗ http_req_duration.............: avg=1.2s p(95)=3.8s

ERRO[0031] thresholds on metrics 'checks, http_req_duration' have been breached
```

And the shell exit code is non-zero:
```bash
echo $?
# 99
```

Exit code `99` means "thresholds were breached". This is useful in CI/CD pipelines where you want the pipeline to fail if performance degrades.

## Expected Output

**Passing run (demo-app):**
```
✓ checks.........................: 100.00% ✓ N   ✗ 0
✓ http_req_duration.............: avg=Xms  p(95)=Xms

     checks.........................: 100.00% ...
     http_req_duration..............: avg=Xms min=Xms med=Xms max=Xms p(90)=Xms p(95)=Xms

running (30s), 0/5 VUs, N complete and 0 interrupted iterations
default ✓ [==============================] 5 VUs  30s
```

**Failing run (broken-app):**
```
✗ checks.........................: 72.00% ...
✗ http_req_duration.............: avg=1.2s p(95)=3.8s

ERRO[0031] thresholds on metrics 'checks, http_req_duration' have been breached
running (30s), 0/5 VUs, N complete and 0 interrupted iterations
default ✗ [==============================] 5 VUs  30s
```

## Key Takeaways
- `check()` validates correctness but never stops the test — it only records pass/fail counts
- Thresholds turn k6 into a pass/fail gate suitable for CI/CD pipelines
- Exit code `99` specifically means threshold breach; exit code `0` means everything passed
- The `checks` built-in metric tracks the aggregate pass rate of all `check()` assertions across all iterations
- Use `BASE_URL` (or any `__ENV` variable) to run the same script against different environments without editing the file
