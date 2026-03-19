# Lab 05: Parameterization and Data-Driven Tests

**Time:** 15 min | **Module:** Module 1

## Overview
Make your tests data-driven by loading user credentials from a shared JSON file, selecting unique data per VU, and externalizing configuration with environment variables. These techniques are essential for realistic multi-user simulations.

## What You'll Learn
- How to use `SharedArray` to load test data once and share it across all VUs
- How to use `__VU` and `__ITER` to select unique data per virtual user and iteration
- How to use `__ENV` to make scripts configurable without editing source files
- How to reference an external JSON data file
- A brief look at the papaparse library for CSV data

## Prerequisites
- Lab 04 completed — familiar with groups, tags, and script structure

## Instructions

### Step 1: The Problem with Hardcoded Data

A naive approach puts credentials directly in the default function:

```javascript
// Bad: every VU uses the same username
export default function () {
  const payload = JSON.stringify({ username: 'user1', password: 'pass1' });
  http.post(`${BASE_URL}/login`, payload, params);
}
```

With 10 VUs all logging in as `user1`, the server may return cached sessions, skewing results. You need each VU to use a different account.

### Step 2: Load Data with SharedArray

`SharedArray` loads data **once** in the init context (before any VU starts), then shares the same in-memory object across all VUs. This is far more efficient than each VU reading the file independently.

```javascript
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
  return JSON.parse(open('./users.json'));
});
```

`open()` reads a file relative to the script's location. `SharedArray` takes a name (for deduplication) and a function that returns the data array.

The `users.json` file lives at `scripts/starters/users.json` and contains:

```json
[
  { "username": "user1", "password": "pass1" },
  { "username": "user2", "password": "pass2" },
  ...
  { "username": "user10", "password": "pass10" }
]
```

### Step 3: Select Unique Data per VU with __VU and __ITER

k6 exposes two built-in globals for data selection:

| Variable | Type | Value |
|---|---|---|
| `__VU` | number | VU index, starting at 1 |
| `__ITER` | number | Iteration count for this VU, starting at 0 |

Use modulo to cycle through the array without going out of bounds:

```javascript
export default function () {
  // Each VU gets a different user; cycles if VUs > users.length
  const user = users[(__VU - 1) % users.length];

  const payload = JSON.stringify({
    username: user.username,
    password: user.password,
  });

  http.post(`${BASE_URL}/login`, payload, { headers: { 'Content-Type': 'application/json' } });
}
```

For a more unique combination across both VU and iteration:

```javascript
const user = users[(__VU + __ITER) % users.length];
```

### Step 4: Externalize Configuration with __ENV

`__ENV` is an object containing all environment variables passed to the k6 process. Use it with a fallback for local development:

```javascript
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
```

Run with a custom base URL:

```bash
k6 run -e BASE_URL=http://localhost:3001 scripts/solutions/lab-05-solution.js
```

Pass multiple variables:

```bash
k6 run \
  -e BASE_URL=http://localhost:3000 \
  -e THINK_TIME=2 \
  scripts/solutions/lab-05-solution.js
```

### Step 5: CSV Data with papaparse (Overview)

For CSV data files, use the [papaparse](https://jslib.k6.io/papaparse/) library from the k6 JSLib:

```javascript
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';
import { SharedArray } from 'k6/data';

const csvUsers = new SharedArray('csv-users', function () {
  const raw = open('./users.csv');
  return papaparse.parse(raw, { header: true }).data;
});
```

This approach works the same way as JSON — data loads once, all VUs share the array. The `header: true` option uses the first row as property names, so `row.username` and `row.password` work just like the JSON version.

For this workshop we use JSON to avoid an external dependency, but CSV is the common format when data comes from a QA team's spreadsheet.

## Expected Output

```
  scenarios: (100.00%) 1 scenario, 5 max VUs, 40s max duration
           * default: 5 looping VUs for 30s (gracefulStop: 30s)

  ✓ login status 200 or 201
  ✓ response has token

     checks.........................: 100.00% ✓ N  ✗ 0
     http_req_duration..............: avg=Xms  min=Xms  med=Xms  max=Xms  p(90)=Xms p(95)=Xms
     iterations.....................: N    N/s
     vus............................: 5    min=5   max=5
```

Each VU uses a different username from the `users.json` array. With 5 VUs and 10 users, user1–user5 will be used in the first round, user6–user10 in the next iteration cycle.

## Key Takeaways
- `SharedArray` is the correct way to load external data in k6 — it initializes once and shares memory across all VUs
- `__VU` and `__ITER` give you unique per-VU and per-iteration indices; use modulo to cycle through arrays safely
- `__ENV` externalizes any configuration value — keep secrets out of scripts and pass them as environment variables at runtime
- Never call `open()` outside of the init context (outside of `SharedArray` or a top-level `const`) — it is not available inside the default function
- Use `papaparse` for CSV inputs when your data team works in spreadsheets; the `SharedArray` wrapper is identical
