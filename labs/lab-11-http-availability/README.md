# Lab 11: HTTP Availability Checks

**Time:** 20 min | **Module:** Module 2 — Grafana Cloud

## Overview

A basic HTTP check that only validates status code 200 catches complete outages but misses subtler failures: a misconfigured server returning the wrong response body, an expired TLS certificate, or a regression that pushes response time above your SLA. This lab configures a production-grade HTTP check with body validation, TLS validation, and custom headers — then deliberately breaks the body validation so you can see what a failure looks like in the SM UI.

> **DataDog comparison:** DataDog API test assertions and Grafana SM validations cover the same ground — status code, body content, headers — though Grafana SM expresses body and header checks as regular expressions rather than typed assertions. The workflow is similar. The meaningful difference is context: when an SM check fails, the alert links directly to the same Grafana instance where your application metrics and logs live, so you can correlate availability failures with infrastructure behaviour in one place rather than pivoting between DataDog and another observability tool.

## What You'll Learn

- How to create an HTTP check using the API Endpoint wizard
- How the new 5-step wizard is organised: Request → Uptime → Labels → Execution → Alerting
- How to use **regexp validation** to assert body content (replaces the older "Body Contains" / "Body Matches Regex" assertions)
- How TLS validation works by default, and how to configure it from the Request options
- How to attach custom request headers to a check
- How to use the right-hand **Test** panel for immediate on-demand execution without waiting for the schedule
- What a failing regexp validation looks like in the check detail UI
- How SM calculates uptime percentage (what counts as Up vs Down)

## Prerequisites

- Lab 10 complete — Synthetic Monitoring is set up and you have at least one working check
- Access to your Grafana Cloud stack in a browser

## Instructions

### Step 1: Create a New HTTP Check

In the left nav, go to **Testing & synthetics → Synthetics → Checks**.

Click **+ Create new check**. You land on a check type picker with four cards: **API Endpoint**, **Multi Step**, **Scripted**, and **Browser**. Click **API Endpoint** — this covers HTTP, Ping, DNS, TCP, and Traceroute as sub-protocols.

The check form opens at Step 1 (Request) with a **Request type** row of tabs. **HTTP** is selected by default.

**Fill in**

| Field | Value |
|---|---|
| Job name | `httpbin JSON endpoint` |
| Request target | `https://httpbin.org/json` (leave method as `GET`) |

`httpbin.org` is a well-known HTTP testing utility that returns predictable, structured responses — ideal for practising validation because you know exactly what the response body will contain.

Do not click **Save** yet — the wizard has four more steps.

### Step 2: Add a Custom Request Header

Headers now live inside **Request options**, which is collapsed by default. Click **Request options** to expand it, then stay on the **Options** sub-tab.

Scroll to **Request headers** and click **+ Header**. Fill in:

| Field | Value |
|---|---|
| Name | `X-Workshop` |
| Value | `true` |

Custom headers are useful for:
- **Bypassing WAF rules** — send a secret header so your WAF passes synthetic traffic without rate-limiting it
- **Feature flag activation** — if your app supports header-based feature flags, use SM checks to verify the feature works in production
- **Marking traffic in logs** — filter synthetic requests out of your analytics or error budgets

`httpbin.org/json` ignores this header, but the pattern is the important part. On your own services you might send `X-Synthetic-Monitor: grafana-sm` and then filter those requests from your error rate SLI.

### Step 3: Confirm TLS Validation

Click the **TLS** sub-tab inside Request options.

The control here is inverted compared to the old UI: there is a single checkbox labelled **Disable target certificate validation**. Leave it **unchecked** — this is the default and means SM *will* validate:

- the certificate is signed by a trusted CA
- the certificate has not expired
- the certificate's hostname matches the URL

A failed TLS validation is reported as a **probe error** (separate from regexp-validation failures) and immediately marks the check as Down. This catches certificate expiry before users see browser warnings — one of the most common and embarrassing outages.

`https://httpbin.org` has a valid certificate, so TLS validation will pass.

> **Why this matters:** Certificate expiry is one of the most common causes of unexpected outages — teams forget to renew certs that auto-renewed previously and then a process change breaks the automation. SM with TLS validation catches this days or weeks before expiry if you also configure the **Certificate Expiry** alert (covered in a later lab).

Collapse Request options when you are done, and click **Uptime →** at the bottom to advance to step 2.

### Step 4: Configure Status and Body Validation

The **Uptime** step is where you express what "healthy" means for this check.

**Valid status codes**

Leave the default **2xx**. A response outside this range marks the check as Down. This replaces the old "Status Code equals 200" assertion.

**Regexp validation**

The old typed "Body Contains / Body Matches Regex / Header Contains" assertions have been unified into a single **Regexp validation** section. Each row has:

| Column | What it does |
|---|---|
| Source | `Body` or `Header` |
| Match condition | A Go-syntax regular expression |
| Invert | When checked, the check fails if the regex does **not** match |
| Allow missing | (Header source only) When checked, a missing header is treated as a pass |

Note the default semantics: **the check fails when the regex matches**. To assert that the body *contains* something, you invert the rule.

Click **+ Regexp validation** and fill in:

| Column | Value |
|---|---|
| Source | `Body` |
| Match condition | `slideshow` |
| Invert | ✓ (checked) |

`https://httpbin.org/json` returns a JSON object with a `slideshow` key. With **Invert** checked, the check fails unless the response body contains `slideshow`. A status 200 with a garbage body (CDN error page, maintenance redirect HTML) would fail this validation and correctly mark the check as Down.

> **No response-time validation here.** The old "Response Time" assertion no longer exists as a pass/fail condition. Response-time thresholds are configured globally from the **Set Thresholds** button on the Checks list — they control when latency is highlighted as yellow/red in the UI and when threshold-based alerts fire, not whether an individual run counts as Up.

Leave **Timeout** at the default (3 s is fine for httpbin). Click **Labels →**.

### Step 5: Skip Labels, Configure Execution

Step 3 (Labels) is optional — labels attach custom Prometheus labels to every metric the check emits. Skip it for now and click **Execution →**.

On the **Execution** step:

**Probe locations** — choose 2–3 probes spread across regions (e.g. `North Virginia, US`, `London, UK`, `Singapore, SG`). Probes are grouped by **AMER / APAC / EMEA**. Fewer probes keeps iteration fast while you configure.

**Frequency** — on the **Basic** tab, click the **1m** pill. (You will bump this to 5m near the end of the lab.)

Leave everything else at defaults. Click **Alerting →**.

### Step 6: Skip Alerting and Save

Step 5 (Alerting) lets you attach alert rules. You will cover alerting in a later lab — skip it and click **Save** at the bottom right.

### Step 7: Use the Test Panel

Notice the right-hand panel titled **Test / Terraform / Docs** — it's visible throughout the wizard. Click the **Test** button inside that panel.

SM immediately runs the check from a single probe location and shows the result within seconds, including each regexp-validation outcome. Expected output looks like:

```
Status: Success
Response time: ~300 ms
Status code: 200
Regexp validations:
  ✓ Body matches "slideshow" (inverted pass)
```

The Test panel is invaluable during check setup — it gives you instant feedback without polluting your uptime history with runs made while you were still configuring. Use it every time you change a field before saving.

After saving, you land on the check list. Click **View dashboard** on your `httpbin JSON endpoint` row.

### Step 8: Explore the Check Detail Dashboard

The check detail page shows five stat cards across the top:

- **Uptime** — percentage of successful runs
- **Reachability** — percentage of runs where the probe reached the target at all (separates probe-level outages from validation failures)
- **Average latency**
- **SSL Expiry** — countdown to the next certificate expiry
- **Frequency**

Below the stats is an Uptime/Reachability bar chart overview. Green bars = all probes up; red bars = at least one probe reported a failure. Further down is a response-time graph with one line per probe location.

Click through to see:
- Each probe plotted as a separate coloured line
- Geographic latency differences: `httpbin.org` is hosted in the US, so US East probes typically show 50–150 ms while Asia Pacific probes may show 200–400 ms
- Occasional spikes on individual probes — these are normal (network jitter, probe load)

This view directly mirrors what users in those regions experience. If Asia Pacific users complain your service is slow, this graph is the first place to look.

### Step 9: Trigger a Deliberate Failure

You will now break the body validation to see what the failure state looks like.

Click **Edit check** in the top-right of the dashboard. Click the **Uptime** step in the wizard. In your regexp-validation row, change the **Match condition** from `slideshow` to `this-string-does-not-exist`, keeping **Invert** checked.

Click **Test** in the right panel. Expected output:

```
Status: Failure
Response time: ~300 ms
Status code: 200
Regexp validations:
  ✗ Body matches "this-string-does-not-exist" (inverted fail — pattern not found)
```

Note that SM still made the request and received a 200 OK — but the check is **Down** because the regexp validation failed. This is the critical behaviour: a check is only **Up** when every check passes. A technically successful HTTP response that returns wrong content is still a failure from a user-experience perspective.

Click **Save**. Wait a minute or two, then return to the dashboard. You will see:
- Uptime dipped slightly below 100%
- Red bars appearing in the Uptime overview timeline
- Reachability still at 100% (the probe reached the server; the content just didn't match)

The split between Uptime and Reachability is a useful diagnostic: high Reachability + low Uptime points you at validation problems, not network problems.

After observing the failure, edit the check again, restore `slideshow`, save, and hit **Test** to confirm it is passing.

### Step 10: Reduce Frequency to 5 Minutes

1-minute frequency is useful for workshops because data accumulates quickly. For a production endpoint, 5 minutes is more common — it reduces probe load and keeps your SM usage within free-tier limits as you add more checks.

Edit the check, click the **Execution** step, click the **5m** frequency pill, and **Save**.

The change takes effect immediately for future runs. The historical data already collected at 1-minute frequency is preserved.

**How uptime percentage is calculated**

SM uptime is calculated as:

```
uptime % = (successful_check_runs / total_check_runs) × 100
```

A check run is **successful** when:
- The HTTP connection is established within the timeout
- TLS validation passes (if enabled, which it is by default)
- The HTTP response status is in the Valid status codes range
- Every regexp validation passes

A check run is **unsuccessful** (counts as Down) when any of the following occur:
- Connection timeout or refused
- TLS certificate invalid or expired
- Status code outside Valid status codes range
- Any regexp validation fails (wrong content, missing header, inverted match didn't find its target)

Uptime is reported separately per probe location and also as an aggregate across all probes.

## Expected Output

After completing all steps, your `httpbin JSON endpoint` check dashboard should show:

```
Uptime:       ~100% (slightly below if you triggered the deliberate failure in Step 9)
Reachability: 100%
Avg latency:  ~300 ms
SSL Expiry:   (a date in the future)
Frequency:    5 min
```

The response time graph shows multiple lines with geographic latency differences. US-based probes show lower latency to `httpbin.org` than probes in other regions.

## Key Takeaways

- A status code 200 alone is not enough — body validation via regexp catches failures that a raw HTTP check misses
- The Regexp validation model unifies body/header assertions; remember that the default semantics is **fail when the regex matches**, so "contains" assertions need the **Invert** checkbox
- TLS validation is on by default — you disable it per-check by checking "Disable target certificate validation", which makes SM an early-warning system for certificate expiry out of the box
- Custom request headers let you send synthetic traffic through WAFs, feature flags, and custom routing without disrupting real users
- The right-hand **Test** panel lets you verify check configuration instantly without waiting for the schedule or affecting uptime history
- A check is **Up** only when every step passes — status code, TLS, and all regexp validations
- **Uptime** vs **Reachability** are reported separately: reachability tells you whether the probe reached the server, uptime tells you whether every validation passed
- Response-time pass/fail assertions are gone — latency is now a threshold (set globally via **Set Thresholds**) rather than a per-check pass/fail condition
