# Lab 27: Migrating DataDog Synthetic Tests to k6

**Time:** 20 min | **Module:** Module 4 — DataDog Migration

## Overview

You don't need a DataDog account for this lab. We work from a representative mock DD synthetic test (the same JSON format DD exports from its API) and migrate it step by step to a working k6 script. By the end, you'll have a mental template for translating any DD HTTP synthetic test to k6, and a working script that hits the local demo-app.

This is the most common migration task: a team that had DD synthetic API tests running in production wants to reproduce the same coverage in Grafana Synthetic Monitoring. The process is always the same — read the DD config, translate each field, write the k6 equivalent, upload as a scripted check.

## What You'll Learn

- How to read and interpret a DD synthetic test JSON export
- The field-by-field mapping from DD config to k6 script structure
- How DD assertion types translate to k6 `check()` calls
- How to handle multistep DD tests with variable passing between requests
- What DD synthetic features don't have a direct k6 equivalent

## Prerequisites

- Lab 13 completed — you know how to upload a k6 script as an SM scripted check
- Lab 01–04 completed — comfortable writing k6 scripts with checks and groups
- Lab 26 reviewed — concept mapping table is fresh

## Instructions

### Step 1: Read the Mock DD Synthetic Test

The file `labs/lab-27/mock-dd-test.json` is a realistic export from the DataDog Synthetics API. Open it and study the structure:

```json
{
  "public_id": "abc-xyz-123",
  "name": "API Health Check - example.com",
  "type": "api",
  "subtype": "http",
  "status": "live",
  "config": {
    "request": {
      "method": "GET",
      "url": "https://api.example.com/health",
      "headers": {
        "Accept": "application/json",
        "X-Datadog-Origin": "synthetics"
      },
      "timeout": 30
    },
    "assertions": [
      { "type": "statusCode", "operator": "is", "target": 200 },
      { "type": "responseTime", "operator": "lessThan", "target": 2000 },
      { "type": "body", "operator": "contains", "target": "\"status\":\"ok\"" }
    ]
  },
  "locations": ["aws:us-east-1", "aws:eu-west-1", "aws:ap-southeast-1"],
  "options": {
    "tick_every": 60,
    "min_failure_duration": 0,
    "min_location_failed": 1,
    "retry": { "count": 2, "interval": 300 }
  },
  "tags": ["env:prod", "team:platform", "service:api-gateway", "managed-by:terraform"]
}
```

Notice: this test has no authentication, one request, three assertions, runs every 60 seconds from three AWS regions. That's as simple as DD synthetic tests get.

---

### Step 2: Field-by-Field Anatomy

Work through each DD field and identify where it goes in k6 or SM:

| DD Field | Value | Where it goes |
|---|---|---|
| `type` / `subtype` | `api` / `http` | SM check type: **Scripted Check** (HTTP) |
| `config.request.method` | `GET` | `http.get(url, params)` |
| `config.request.url` | `https://api.example.com/health` | First argument to `http.get()` |
| `config.request.headers` | `Accept: application/json` | `params.headers` object in k6 |
| `config.request.timeout` | `30` (seconds) | `params.timeout = '30s'` in k6 |
| `config.assertions` | array of assertion objects | `check(res, { ... })` call |
| `locations` | `aws:us-east-1`, etc. | SM probe location selection (UI) |
| `options.tick_every` | `60` (seconds) | SM check frequency: 1 minute |
| `options.min_location_failed` | `1` | SM: "Alert when 1+ probes fail" |
| `options.retry.count` | `2` | SM: retry count setting |
| `tags` | `env:prod`, `team:platform`, etc. | SM check labels (key=value) |

The `X-Datadog-Origin: synthetics` header is DD-internal metadata. Drop it — it serves no purpose in k6.

---

### Step 3: Assertion Translation Table

This is the most important part of the migration. Every DD assertion type has a direct k6 `check()` equivalent:

| DD Assertion | DD Operator | k6 `check()` equivalent |
|---|---|---|
| `statusCode` | `is 200` | `'status 200': (r) => r.status === 200` |
| `responseTime` | `lessThan 2000` | `'fast response': (r) => r.timings.duration < 2000` |
| `body` | `contains "token"` | `'has token': (r) => r.body.includes('token')` |
| `body` | `doesNotContain "error"` | `'no error': (r) => !r.body.includes('error')` |
| `body` | `matches ^\d{4}$` | `'numeric id': (r) => /^\d{4}$/.test(r.body)` |
| `header` | `contains "Content-Type: application/json"` | `'json content-type': (r) => r.headers['Content-Type'].includes('application/json')` |
| `body jsonPath` | `$.token is not null` | `'token exists': (r) => JSON.parse(r.body).token !== null` |
| `body jsonPath` | `$.users.length > 0` | `'has users': (r) => JSON.parse(r.body).users.length > 0` |
| `responseTime` | `greaterThan 0` | `'response received': (r) => r.timings.duration > 0` |
| `statusCode` | `isNot 500` | `'not server error': (r) => r.status !== 500` |

The pattern is consistent: every DD assertion becomes one key-value pair inside a `check()` call. The key is a human-readable description (used in the output and SM dashboards). The value is an arrow function returning a boolean.

---

### Step 4: Write the Equivalent k6 Script

Now translate the mock DD test into a runnable k6 script. We point it at the local demo-app's `/health` endpoint instead of `api.example.com`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

// For local test runs, use a short options block.
// When uploading to SM as a scripted check, SM handles scheduling — remove this block.
export const options = {
  vus: 1,
  duration: '10s',
};

export default function () {
  const params = {
    headers: { 'Accept': 'application/json' },
    timeout: '30s',
  };

  // Translated from: config.request method=GET url=.../health
  const res = http.get('http://localhost:3000/health', params);

  // Translated from: config.assertions
  check(res, {
    'status 200':       (r) => r.status === 200,
    'fast response':    (r) => r.timings.duration < 2000,
    'status ok in body':(r) => r.body.includes('ok'),
  });

  sleep(1);
}
```

Run it:

```bash
k6 run scripts/solutions/lab-27-solution.js
```

All three checks should pass. The solution script also includes a login assertion — see Step 6.

---

### Step 5: Uploading to SM as a Scripted Check

The script you just wrote is exactly what you upload to Grafana Synthetic Monitoring.

1. Open your Grafana Cloud stack and navigate to **Testing & synthetics → Synthetics → Checks**
2. Click **+ Create new check**, then click the **Scripted** card
3. Paste the script (or upload the file)
4. Set:
   - **Job name:** `API Health Check`
   - **Frequency:** 1 minute (matching `tick_every: 60`)
   - **Probes:** US East, EU West, AP Singapore (matching the DD `locations`)
   - **Labels:** `env=prod`, `team=platform`, `service=api-gateway`
5. Remove the `options` block from the SM version — SM ignores it and handles scheduling itself
6. Save and verify the check appears healthy

For a public production service you'd use the real URL. In this workshop we target localhost since SM private probes can reach the local demo-app (Lab 25).

---

### Step 6: Multistep Test Migration

The mock DD health check has one request. Real production DD tests are often multistep: authenticate, then call an authenticated endpoint, then validate a business result.

Here is how the variable-passing pattern works in both systems:

**DD multistep test (conceptual):**
- Step 1: POST /login — extract `token` from response body into variable `auth_token`
- Step 2: GET /api/products — inject `Authorization: Bearer {{ auth_token }}` header
- Each step has its own assertions

**k6 equivalent (single script, sequential):**
```javascript
export default function () {
  // Step 1: authenticate
  const loginRes = http.post(
    'http://localhost:3000/login',
    JSON.stringify({ username: 'testuser', password: 'testpass' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginRes, {
    'login 200':   (r) => r.status === 200,
    'has token':   (r) => JSON.parse(r.body).token !== undefined,
  });

  // Extract the token — equivalent to DD's "extract variable" step
  const token = JSON.parse(loginRes.body).token;

  // Step 2: use the extracted variable in the next request
  const productsRes = http.get('http://localhost:3000/api/products', {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  check(productsRes, {
    'products 200':     (r) => r.status === 200,
    'has products':     (r) => JSON.parse(r.body).length > 0,
  });

  sleep(1);
}
```

The k6 approach is simpler: variables are just JavaScript variables passed between function calls. No step-builder UI, no `{{ variable }}` template syntax — plain JavaScript.

---

### Step 7: What Does Not Map Directly

Be aware of these gaps before starting a migration:

| DD Feature | k6 Status | Workaround |
|---|---|---|
| GraphQL assertion type (built-in) | No native GraphQL assertion | Parse the JSON response body and check fields manually with `JSON.parse(r.body).data.xxx` |
| gRPC assertions | Requires `k6/net/grpc` module | Write a scripted check using the grpc module; not supported by SM HTTP check type |
| No-code assertion builder | k6 requires JavaScript | Use k6 Studio to generate the script, then upload the generated JS to SM |
| DD global variables (shared across tests) | No SM equivalent | Use k6 environment variables (`__ENV.MY_VAR`) or a shared JS module |
| DD test frequency < 1 minute | SM minimum is 1 minute | Not supported in SM; run a local k6 test for sub-minute checks |
| DD synthetic CI/CD integration | k6 has a native CI/CD mode | Use `k6 run` in your pipeline with `--exit-on-running` and threshold checks as pass/fail criteria |

## Expected Output

Running the solution script:

```
  ✓ status 200
  ✓ fast response
  ✓ status ok in body
  ✓ login 200
  ✓ has token

  checks.........................: 100.00% ✓ 50  ✗ 0
  http_req_duration..............: avg=4.2ms   min=1.8ms med=3.9ms max=22.1ms
  http_req_failed................: 0.00%   ✓ 0   ✗ 10
  iterations.....................: 10      0.99/s
```

All checks pass. In SM, the same checks appear as named assertions in the check result detail view — each check name maps to a pass/fail row in the SM UI.

## Key Takeaways

- A DD synthetic test JSON export maps directly to a k6 script: `config.request` → `http.get/post()`, `config.assertions` → `check()`, `locations` → SM probe selection, `options.tick_every` → SM frequency
- Every DD assertion type has a k6 `check()` equivalent — the translation is mechanical once you know the pattern
- Multistep DD tests (with extract/inject) become sequential k6 requests with plain JavaScript variables — simpler, not more complex
- After translation, the same script runs locally (for debugging) and in SM (for continuous monitoring)
- Gaps to plan for: gRPC, graphql assertion type, sub-minute frequency, and no-code builders
