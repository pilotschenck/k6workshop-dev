# Lab 24: k6 Studio — Recording User Journeys

**Time:** 25 min | **Module:** Module 3 — Advanced

## Overview

k6 Studio is a desktop application that lets you record real browser sessions and automatically generate k6 test scripts. It solves the blank-page problem: instead of writing a script from scratch, you browse your application normally and k6 Studio converts your actions into a runnable k6 test.

This matters for teams whose testing lives mostly in the browser. The recorder captures every HTTP request — including POST bodies, headers, and cookies — and the test generator lets you clean up the recording and apply correlation rules before producing the final script. The output is standard k6 JavaScript that you own, can version-control, and can run anywhere k6 runs.

If you came from Datadog: the DD Synthetic Recorder (browser extension) converts recordings into DD's proprietary test format, which lives inside Datadog. k6 Studio generates standard k6 JavaScript — human-readable, fully editable, and the same script format you use for load testing. No vendor lock-in.

## What You'll Learn

- How to navigate k6 Studio's four main UI areas
- How to record an HTTP session against the local demo-app
- How to inspect and clean up a recording before script generation
- What correlation rules are and when you need them
- How to run a generated script from the CLI

## Prerequisites

- Lab 01 completed — you understand basic k6 script structure
- Demo-app running at http://localhost:3000
- k6 Studio installed on this workstation (it is pre-installed)

## Instructions

### Step 1: Launch k6 Studio

k6 Studio is pre-installed on your workstation as a desktop application.

**Option A — application menu:** Open the application launcher and search for "k6 Studio".

**Option B — terminal:**
```bash
k6-studio
```

A desktop window opens. If k6 Studio asks about a workspace directory on first launch, accept the default or choose a convenient location such as `~/k6studio-workspace`.

### Step 2: Explore the k6 Studio UI

Before recording anything, take a minute to orient yourself. k6 Studio has four main areas accessible from the left navigation:

| Area | Purpose |
|---|---|
| **Recorder** | Launches a browser with a proxy intercepting all traffic; captures every HTTP request you make |
| **Test generator** | Displays the captured requests and lets you remove noise, reorder steps, and add correlation rules before generating a script |
| **Test runner** | Runs the generated script directly from inside k6 Studio so you can verify it without switching to the terminal |
| **Inspect** | Shows detailed request/response data for any captured request — useful for identifying dynamic values |

You will move through these areas in sequence: Recorder → Test generator → Test runner.

### Step 3: Record a User Journey Against Demo-App

You will record a realistic user journey: browse the home page, view the product catalog, and log in.

1. In k6 Studio, click **New Recording** (or the "+" icon in the Recorder section).
2. Set the target URL to `http://localhost:3000`.
3. Click **Start Recording**. k6 Studio opens a Chromium browser window with recording active — you will see a recording indicator.
4. In the browser window, perform the following actions in order:

   a. Navigate to `http://localhost:3000/` — the demo-app home page loads.

   b. Navigate to `http://localhost:3000/api/products` — you should see a JSON list of products.

   c. Open the browser's developer console (F12 → Console tab) and run the following to simulate a login POST:
   ```javascript
   fetch('/login', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({username: 'testuser', password: 'testpass'})
   }).then(r => r.json()).then(console.log)
   ```
   This fires a POST /login request that k6 Studio will capture, including the request body and the JSON response (which contains an auth token).

5. Click **Stop Recording** in k6 Studio.

> **Why record login?** The login response returns an auth token that subsequent requests must use. Recording this step lets k6 Studio detect the token as a dynamic value in Step 6.

### Step 4: Inspect the Recording

After stopping, k6 Studio displays all captured requests in the **Recorder** or **Inspect** view. Review them carefully before generating a script.

**What to look at:**

- The method, URL, status code, and response time for each request
- The POST body for the `/login` request — k6 Studio should have captured the JSON payload
- Any noise requests you do not want in the final script

**What to remove:**

Select and delete any of the following if they appear:
- Requests to `favicon.ico`
- Requests to browser telemetry or update endpoints
- Any requests to domains other than `localhost:3000`

To delete a request: select it in the list and press Delete, or right-click and choose Remove.

After cleaning up you should have three core requests:
1. `GET http://localhost:3000/`
2. `GET http://localhost:3000/api/products`
3. `POST http://localhost:3000/login`

### Step 5: Generate a k6 Script

Click **Generate Script** (or move to the **Test generator** tab and click Generate).

k6 Studio produces a k6 JavaScript file. Review the generated script — it will look similar to this structure:

```javascript
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '30s',
};

export default function () {
  // GET home page
  http.get('http://localhost:3000/');
  sleep(1);

  // GET products
  http.get('http://localhost:3000/api/products');
  sleep(1);

  // POST login
  const loginPayload = JSON.stringify({ username: 'testuser', password: 'testpass' });
  const loginParams = { headers: { 'Content-Type': 'application/json' } };
  http.post('http://localhost:3000/login', loginPayload, loginParams);
  sleep(1);
}
```

The exact output will vary based on what k6 Studio detected. Notice:
- Each recorded request becomes an `http.get()` or `http.post()` call
- Captured headers are reproduced in a params object
- The POST body is reproduced as a JSON string
- `sleep()` calls are inserted between requests to approximate realistic pacing

Save the script to a known path, for example:
```bash
# k6 Studio's "Save" button will prompt for a location
# Save to: ~/k6studio-workspace/journey-recording.js
```

You can also save it from the terminal if k6 Studio shows you the file path in its interface.

### Step 6: Add a Correlation Rule for the Auth Token

Right now the recorded token is hardcoded. If the server issues a different token on each login (which is the realistic case), replaying the script will fail on any request that uses the old token.

**Correlation** is the process of:
1. Extracting a dynamic value from a response (the token from the login response body)
2. Storing it in a variable
3. Injecting that variable into subsequent requests that need it

**To add a correlation rule in k6 Studio:**

1. In the Test generator, select the `POST /login` request.
2. Look at the response body in the Inspect panel — find the `token` field (e.g., `{"token": "eyJ..."}`).
3. Click **Add Correlation Rule** (or look for "Extract variable" in the context menu).
4. Configure the extraction:
   - Source: Response body
   - Type: JSON path
   - Expression: `$.token`
   - Variable name: `authToken`
5. Now select a downstream request (e.g., a future `POST /checkout` request) and add an injection rule:
   - Target: Request header
   - Header name: `Authorization`
   - Value: `Bearer ${authToken}`

After adding the rule, regenerate the script. k6 Studio will insert a `json()` call to extract the token and pass it to subsequent requests automatically.

> **Note:** The demo-app's /login endpoint returns a token field. If your recording did not produce a visible token in the response, check the Inspect panel for the full response body.

### Step 7: Run the Generated Script

Run the generated script from the terminal to confirm it works end-to-end:

```bash
k6 run --vus 1 --duration 30s ~/k6studio-workspace/journey-recording.js
```

You should see successful HTTP requests with no failures. If you see 401 errors on requests after login, the correlation rule is not wired up correctly — revisit Step 6.

You can also run the script directly from within k6 Studio using the **Test runner** panel, which shows the same k6 output without leaving the application.

### Step 8: Feature Awareness Note

k6 Studio is actively developed. Understanding the current state helps you set expectations with your team:

**Generally available:**
- HTTP/HTTPS session recording via proxy
- Script generation (standard k6 JavaScript)
- Correlation rule detection and configuration
- Basic test runner (runs k6 locally from within the UI)

**In preview or on the roadmap:**
- Native browser (Playwright-style) recording for SPAs and JavaScript-heavy apps
- Automatic assertion generation from recorded responses
- Integrated test management and scheduling
- Direct export to Grafana Cloud k6

Check the [k6 Studio release notes](https://grafana.com/docs/grafana-cloud/testing/k6/author-run/k6-studio/) for the current GA status of any feature before committing to it in a production workflow.

## Expected Output

Running the generated script with 1 VU for 30 seconds:

```
  execution: local
     script: journey-recording.js
     output: -

  scenarios: (100.00%) 1 scenario, 1 max VUs, 30s max duration
           * default: 1 looping VUs for 30s (gracefulStop: 30s)

     http_req_duration..............: avg=4.2ms   min=1.8ms  med=3.9ms  max=18.1ms p(90)=7.3ms  p(95)=9.1ms
     http_req_failed................: 0.00%  ✓ 0   ✗ 30
     iterations.....................: 10     0.333/s
     vus............................: 1      min=1    max=1
```

Three requests per iteration × ~10 iterations = ~30 total requests. All should show 0% failure rate.

## Key Takeaways

- k6 Studio eliminates the blank-page problem — record first, then refine
- The output is standard k6 JavaScript: portable, version-controllable, and editable by hand
- Correlation rules are essential for any flow involving session tokens, CSRF values, or dynamic IDs — without them, a replay will fail in ways that are hard to debug
- Unlike Datadog's proprietary recorder format, k6 Studio's output is the same script format used for load testing — one workflow covers both synthetic monitoring and performance testing
- Generated scripts are starting points, not finished products — always review and trim them before committing to a repository
