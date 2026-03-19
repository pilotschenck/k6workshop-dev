# Lab 11: HTTP Availability Checks

**Time:** 20 min | **Module:** Module 2 — Grafana Cloud

## Overview

A basic HTTP check that only validates status code 200 catches complete outages but misses subtler failures: a misconfigured server returning the wrong response body, an expired TLS certificate, or a regression that pushes response time above your SLA. This lab configures a production-grade HTTP check with assertions, TLS validation, and custom headers — then deliberately breaks an assertion so you can see what a failure looks like in the SM UI.

> **DataDog comparison:** DataDog API test assertions and Grafana SM assertions cover identical use cases — status code, body content, headers, response time. The workflow is nearly the same. The meaningful difference is context: when an SM assertion fails, the alert links directly to the same Grafana instance where your application metrics and logs live, so you can correlate the availability failure with infrastructure behaviour in one place rather than pivoting between DataDog and another observability tool.

## What You'll Learn

- How to create an HTTP check targeting a predictable test endpoint
- The five assertion types available in SM: Status Code, Body Contains, Body Matches Regex, Header Contains, Response Time
- How to enable and understand TLS validation
- How to attach custom request headers to a check
- How to use the **Test** button for immediate on-demand execution without waiting for the schedule
- What a failing assertion looks like in the check detail UI
- How SM calculates uptime percentage (what counts as Up vs Down)

## Prerequisites

- Lab 10 complete — Synthetic Monitoring is set up and you have at least one working check
- Access to your Grafana Cloud stack in a browser

## Instructions

### Step 1: Create a New HTTP Check

In the SM left nav, click **Checks** → **Add Check** → **HTTP**.

This time you will use `https://httpbin.org/json` as the target. `httpbin.org` is a well-known HTTP testing utility that returns predictable, structured responses — ideal for practising assertions because you know exactly what the response body will contain.

**Basic settings**

| Field | Value |
|---|---|
| Job name | `httpbin JSON endpoint` |
| URL | `https://httpbin.org/json` |

**Probe locations**

Select 2–3 locations. Fewer probes means faster iteration while you are configuring — you can add more later.

**Frequency and timeout**

| Field | Value |
|---|---|
| Frequency | `1 minute` |
| Timeout | `10 seconds` |

Do not click Save yet — you will add assertions in the next step.

### Step 2: Configure Assertions

Scroll down to the **Assertions** section of the check form. By default there is one assertion: "Status Code equals 200". You will add two more.

**Assertion 1 — Status Code (already present)**

| Field | Value |
|---|---|
| Type | Status Code |
| Condition | equals |
| Value | `200` |

**Assertion 2 — Body Contains**

Click **Add assertion** and fill in:

| Field | Value |
|---|---|
| Type | Body Contains |
| Value | `slideshow` |

`https://httpbin.org/json` returns a JSON object with a `slideshow` key. This assertion confirms the response body has the expected content — not just that the server responded, but that it returned the right data. A status 200 with a garbage body (CDN error page, maintenance redirect HTML) would fail this assertion and correctly mark the check as Down.

**Assertion 3 — Response Time**

Click **Add assertion** again:

| Field | Value |
|---|---|
| Type | Response Time |
| Condition | Less Than |
| Value | `2000` (milliseconds) |

This asserts that the check completes in under 2 seconds. If the endpoint slows down — due to a deploy, a traffic spike, or a dependency outage — this assertion fires before users start noticing.

**Summary of assertion types available**

| Type | What it checks |
|---|---|
| Status Code | HTTP response status (200, 404, 503, etc.) |
| Body Contains | Response body includes a literal string (case-sensitive) |
| Body Matches Regex | Response body matches a regular expression |
| Header Contains | A specific response header exists and contains a value |
| Response Time | Total response time is below a threshold (in milliseconds) |

Do not click Save yet — continue to Step 3.

### Step 3: Configure TLS Validation

Scroll to the **TLS** section of the check form (it may be under **Advanced options** — expand it if needed).

Enable **Verify SSL certificate**. With this option on, SM will:
- Verify the certificate is signed by a trusted CA
- Verify the certificate has not expired
- Verify the certificate's hostname matches the URL

A failed TLS check is reported as a **probe error** (separate from assertion failures) and immediately sets the check status to Down. This catches certificate expiry before users see browser warnings — one of the most common and embarrassing outages.

`https://httpbin.org` has a valid certificate, so TLS validation will pass. You are configuring it correctly for the workflow you will use on real production endpoints.

> **Why this matters:** Certificate expiry is one of the most common causes of unexpected outages — teams forget to renew certs that auto-renewed previously and then a process change breaks the automation. SM with TLS validation catches this days or weeks before expiry if you also configure the **Certificate Expiry** alert (covered in a later lab).

### Step 4: Add a Custom Request Header

Scroll to the **Request headers** section. Click **Add header** and enter:

| Field | Value |
|---|---|
| Header name | `X-Workshop` |
| Header value | `true` |

Custom headers are useful for:
- **Bypassing WAF rules** — send a secret header so your WAF passes synthetic traffic without rate-limiting it
- **Feature flag activation** — if your app supports header-based feature flags, use SM checks to verify the feature works in production
- **Marking traffic in logs** — filter synthetic requests out of your analytics or error budgets

`httpbin.org/json` ignores this header, but the pattern is the important part. On your own services you might send `X-Synthetic-Monitor: grafana-sm` and then filter those requests from your error rate SLI.

Now click **Save** to create the check.

### Step 5: Use the Test Button for Immediate Execution

After saving, you land on the check detail page. You do not have to wait for the scheduler to fire. Find the **Test** button — it is usually in the top-right area of the check detail page or on the check edit page.

Click **Test**.

SM immediately runs the check from a single probe location (typically the nearest one to Grafana's infrastructure) and shows you the result within seconds:

```
Status: Success
Response time: 312 ms
Status code: 200
Assertions:
  ✓ Status Code equals 200
  ✓ Body Contains "slideshow"
  ✓ Response Time < 2000 ms
```

The Test button is invaluable during check setup — it gives you instant feedback without polluting your uptime history with runs made while you were still configuring. Use it every time you change an assertion or URL before saving.

### Step 6: View Assertion Results in the Check Detail

Wait 1–2 minutes for the first scheduled run to complete, then look at the check detail page.

With all assertions passing, you will see:

- Status badge: **Up**
- Uptime: **100.00%**
- Response time graph: lines for each selected probe location

Now deliberately introduce a failing assertion to see what the failure state looks like. Click **Edit** on the check.

Find the **Body Contains** assertion and change the value from `slideshow` to `this-string-does-not-exist`. Click **Save**.

Use the **Test** button again:

```
Status: Failure
Response time: 298 ms
Status code: 200
Assertions:
  ✓ Status Code equals 200
  ✗ Body Contains "this-string-does-not-exist"
  ✓ Response Time < 2000 ms
```

Note that SM still made the request and received a 200 OK — but the check is **Down** because an assertion failed. This is the critical behaviour: a check is only **Up** when every assertion passes. A technically successful HTTP response that returns wrong content is still a failure from a user-experience perspective.

The check detail page now shows:
- Status badge: **Down** (red)
- Error log: a new entry with timestamp and "assertion failed: body does not contain..."
- Uptime percentage: slightly below 100% (depending on how many runs completed before the failure)

After observing the failure, click **Edit** again and restore the Body Contains value to `slideshow`. Save and use **Test** to confirm it is passing again.

### Step 7: Review Response Time by Probe Location

Return to the check detail page and look at the response time graph. With multiple probe locations selected, you will see:

- Each probe plotted as a separate coloured line
- Geographic latency differences: `httpbin.org` is hosted in the US, so US East probes will typically show 50–150 ms while Asia Pacific probes may show 200–400 ms
- Occasional spikes on individual probes — these are normal (network jitter, probe load) and only trigger alerts if they exceed your Response Time assertion threshold

Click a probe location in the legend to isolate its line. Hover over any point to see the exact response time and which probe measured it.

This view directly mirrors what users in those regions experience. If Asia Pacific users complain your service is slow, this graph is the first place to look.

### Step 8: Update Frequency to 5 Minutes

1 minute frequency is useful for workshops because data accumulates quickly. For a production endpoint, 5 minutes is more common — it reduces probe load and keeps your SM usage within free tier limits as you add more checks.

Click **Edit** on the check. Change **Frequency** to `5 minutes`. Click **Save**.

The change takes effect immediately for future runs. The historical data already collected at 1-minute frequency is preserved.

**How uptime percentage is calculated**

SM uptime is calculated as:

```
uptime % = (successful_check_runs / total_check_runs) × 100
```

A check run is **successful** when:
- The HTTP connection is established within the timeout
- TLS validation passes (if enabled)
- The HTTP response is received
- All assertions pass

A check run is **unsuccessful** (counts as Down) when any of the following occur:
- Connection timeout or refused
- TLS certificate invalid or expired
- Any assertion fails (wrong status, body mismatch, slow response)

Uptime is reported separately per probe location, and also as an aggregate across all probes.

## Expected Output

After completing all steps, your `httpbin JSON endpoint` check should show:

```
Status: Up
Uptime: 100.00% (or slightly below if you triggered the deliberate failure in Step 6)
Assertions:
  ✓ Status Code equals 200
  ✓ Body Contains "slideshow"
  ✓ Response Time < 2000 ms
TLS: Valid
Probe locations: [your selected probes] — all Up
```

The response time graph shows multiple lines with geographic latency differences. US-based probes show lower latency to `httpbin.org` than probes in other regions.

## Key Takeaways

- A status code 200 alone is not enough — body and response time assertions catch failures that a raw HTTP check misses
- TLS validation turns SM into an early-warning system for certificate expiry, one of the most common causes of unexpected outages
- Custom request headers let you send synthetic traffic through WAFs, feature flags, and custom routing without disrupting real users
- The **Test** button lets you verify check configuration instantly without waiting for the schedule or affecting uptime history
- A check is **Up** only when all assertions pass — any single assertion failure marks the entire check as Down
- Uptime % = successful runs / total runs; this calculation is per-probe and aggregate, giving you both a global and regional view of availability
