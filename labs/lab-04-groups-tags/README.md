# Lab 04: Groups, Tags, and Custom Metrics

**Time:** 20 min | **Module:** Module 1

## Overview
Organize your test into logical user flows using `group()`, attach metadata to requests with tags, and get a first look at custom metrics. These techniques make large test output navigable and enable targeted filtering in Grafana dashboards.

## What You'll Learn
- How to wrap related requests in named `group()` blocks
- How groups appear in k6's terminal summary output
- How to attach custom tags to individual requests and at the test level
- How tags enable metric filtering in dashboards
- How to create a custom `Counter` metric (preview of Lab 20)

## Prerequisites
- Lab 03 completed — comfortable with options, stages, and running multi-step tests

## Instructions

### Step 1: Wrap Requests in group()

`group()` is imported from `k6`. It takes a name and a function containing the requests for that logical step:

```javascript
import { group } from 'k6';
import http from 'k6/http';

export default function () {
  group('homepage', function () {
    http.get('http://localhost:3000/');
  });

  group('product browsing', function () {
    http.get('http://localhost:3000/api/products');
    http.get('http://localhost:3000/api/products/1');
  });
}
```

Groups can be nested for sub-flows, but one level of nesting is usually enough for clarity.

### Step 2: Observe Groups in the Summary Output

Run the starter to see ungrouped output, then run the solution to see how groups change the summary:

```bash
k6 run scripts/starters/lab-04-starter.js
k6 run scripts/solutions/lab-04-solution.js
```

With groups, k6 reports metrics broken down by group name in addition to the aggregate totals:

```
     group_duration...................: avg=Xms  ...
     ✓ :: homepage
       ✓ status is 200
     ✓ :: product browsing
       ✓ status is 200
       ✓ product has id field
```

The `::` prefix denotes a group in the output tree.

### Step 3: Add Tags to Individual Requests

Tags are key-value metadata attached to a specific request. They appear in output backends (InfluxDB, Prometheus, Cloud) and allow you to slice metrics by endpoint:

```javascript
http.get('http://localhost:3000/', {
  tags: { name: 'homepage', flow: 'anonymous' },
});

http.post('http://localhost:3000/login', payload, {
  tags: { name: 'login', flow: 'authenticated' },
});
```

The `name` tag is special — k6 uses it to group URL patterns in dashboards, which prevents metric explosion when URLs contain dynamic IDs (e.g., `/products/123`, `/products/456` collapse to a single `name` tag value).

### Step 4: Add Test-Level Tags

You can also set tags that apply to all requests in the test by using `options.tags`:

```javascript
export const options = {
  tags: {
    environment: 'local',
    team: 'platform',
    testType: 'load',
  },
};
```

Or set them programmatically inside the default function using `exec.vu.tags`:

```javascript
import exec from 'k6/execution';

export default function () {
  exec.vu.tags['scenario'] = 'lab04-demo';
  // all subsequent requests in this VU iteration carry this tag
}
```

### Step 5: Create a Custom Counter Metric

k6 has four built-in metric types: `Counter`, `Gauge`, `Rate`, and `Trend`. Here is a preview of `Counter` (covered fully in Lab 20):

```javascript
import { Counter } from 'k6/metrics';

const loginAttempts = new Counter('login_attempts');

export default function () {
  // ... make login request ...
  loginAttempts.add(1);
}
```

The counter appears in the terminal summary alongside built-in metrics:

```
     login_attempts.................: 47     1.566667/s
```

You can also add tags to individual metric observations:

```javascript
loginAttempts.add(1, { result: 'success' });
```

### Step 6: Filter by Group in Output

When sending results to InfluxDB or Grafana Cloud, you can filter dashboards by the `group` tag (automatically added by k6) or by any custom tag you defined. In the Grafana k6 dashboard, use the `Name` variable dropdown — this corresponds to the `name` tag on each request.

For now, observe in the local summary that each group's check results are reported separately, making it easy to pinpoint which user flow is failing.

## Expected Output

```
  ✓ :: homepage
    ✓ status is 200

  ✓ :: login flow
    ✓ status is 200 or 401
    ✓ response time < 1s

  ✓ :: product browsing
    ✓ status is 200
    ✓ products array is not empty

     group_duration...................: avg=Xms  min=Xms  med=Xms  max=Xms  p(90)=Xms p(95)=Xms
     http_req_duration..............: avg=Xms  ...
     login_attempts.................: N    N/s
```

## Key Takeaways
- `group()` organizes requests into logical user flows and adds a group breakdown to the summary
- The `name` tag on HTTP requests prevents metric cardinality explosion from dynamic URLs
- `options.tags` applies metadata to every request in the test — useful for environment or team labeling
- Custom `Counter`, `Gauge`, `Rate`, and `Trend` metrics let you track domain-specific signals beyond HTTP timings
- Tags are the bridge between k6 and your observability backend — invest in a consistent tagging strategy early
