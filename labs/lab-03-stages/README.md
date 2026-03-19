# Lab 03: VU Stages and Load Profiles

**Time:** 15 min | **Module:** Module 1

## Overview
Move beyond fixed VU counts by defining multi-stage load profiles that ramp up, sustain, and ramp down traffic. You'll use the simple `stages` shorthand first, then explore the equivalent `scenarios` API for more control.

## What You'll Learn
- How to define ramp-up / sustain / ramp-down load shapes with `options.stages`
- How to watch VU count change in real-time during a run
- How to express the same profile using the `ramping-vus` executor inside `scenarios`
- The difference between the `constant-vus` and `ramping-vus` executors
- A brief introduction to the open vs. closed model distinction

## Prerequisites
- Lab 02 completed — familiar with `options`, checks, and reading k6 output

## Instructions

### Step 1: Basic Stages Configuration

Replace the `vus` / `duration` pair in `options` with a `stages` array. Each stage specifies a target VU count and the duration to reach it:

```javascript
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // ramp up to 10 VUs over 30 seconds
    { duration: '1m',  target: 10 },  // hold 10 VUs for 1 minute
    { duration: '30s', target: 0  },  // ramp down to 0 VUs over 30 seconds
  ],
};
```

Total test duration: 30s + 60s + 30s = **2 minutes**.

k6 starts with 0 VUs, linearly increases to 10 by the end of the first stage, holds for 60 seconds, then decreases back to 0.

### Step 2: Run It and Watch the VU Count

```bash
k6 run scripts/starters/lab-03-starter.js
```

While it runs, watch the progress line in the terminal:

```
default   [  45% ] 5/10 VUs  45s/2m0s
```

The `5/10 VUs` shows current VUs vs. the stage target. You'll see this number climb during ramp-up, stay flat during sustain, and fall during ramp-down.

### Step 3: The ramping-vus Executor via Scenarios

`stages` is syntactic sugar for a single-scenario `ramping-vus` executor. The full equivalent using `scenarios`:

```javascript
export const options = {
  scenarios: {
    load_profile: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m',  target: 10 },
        { duration: '30s', target: 0  },
      ],
      gracefulRampDown: '10s',
    },
  },
};
```

`gracefulRampDown` gives in-flight iterations time to finish before VUs are removed — useful when iterations are long-running.

### Step 4: The constant-vus Executor

For comparison, here is the `constant-vus` executor — equivalent to the simple `vus` + `duration` options from Lab 01:

```javascript
export const options = {
  scenarios: {
    constant_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '1m',
    },
  },
};
```

Use `constant-vus` when you want a flat, stable load. Use `ramping-vus` when you need to model realistic traffic patterns with warm-up and cool-down periods.

### Step 5: Open vs. Closed Model (Concept)

k6's `ramping-vus` and `constant-vus` executors are **closed-model** — the number of concurrent users is fixed. A new iteration starts only when an existing VU finishes its current iteration.

k6 also offers **open-model** executors (`constant-arrival-rate`, `ramping-arrival-rate`) where k6 tries to start a fixed number of iterations per second regardless of how long they take. You'll see these in later labs. The key difference:

| Model | Controls | Good for |
|---|---|---|
| Closed (ramping-vus) | Concurrent VUs | Simulating a fixed user pool |
| Open (constant-arrival-rate) | Requests per second | Simulating external traffic rate |

## Expected Output

During the ramp-up phase:
```
default   [  25% ] 2/10 VUs  15s/2m0s
```

During the sustain phase:
```
default   [  58% ] 10/10 VUs  1m10s/2m0s
```

After completion:
```
     http_req_duration..............: avg=Xms  min=Xms  med=Xms  max=Xms  p(90)=Xms p(95)=Xms
     iterations.....................: N    N/s
     vus............................: 0    min=0   max=10
     vus_max........................: 10   min=10  max=10
```

The `vus` line shows `min=0  max=10`, confirming the ramping behavior.

## Key Takeaways
- `stages` is the fastest way to define a ramp-up/sustain/ramp-down pattern — no `vus` or `duration` needed at the top level
- `scenarios` offers the same capability with more explicit control and the ability to run multiple independent load shapes simultaneously
- `ramping-vus` is a closed-model executor — VU count is the control variable, not request rate
- `gracefulRampDown` prevents abrupt termination of long-running iterations during scale-down
- Watch the live progress line during a run to confirm your load profile is behaving as expected
