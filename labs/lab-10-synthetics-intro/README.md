# Lab 10: Grafana Synthetic Monitoring — Introduction

**Time:** 20 min | **Module:** Module 2 — Grafana Cloud

## Overview

Grafana Synthetic Monitoring (SM) is a continuous, scheduled monitoring service that runs lightweight checks from Grafana's global network of probe locations. It answers the question: **"Is my service reachable and responding correctly right now?"** — from the perspective of users around the world.

Synthetic Monitoring is fundamentally different from the load testing you have done in Labs 01–09:

| | Grafana Synthetic Monitoring | k6 Load Testing |
|---|---|---|
| Question answered | Is it up and working? | How does it perform under load? |
| Trigger | Scheduled (every N minutes, automatic) | On-demand (you run the test manually or in CI) |
| Virtual users | 1 — just enough to verify functionality | Many — intentionally stress the system |
| Duration | Seconds per check | Minutes to hours |
| Goal | Detect outages and regressions before users do | Find capacity limits and performance bottlenecks |

You will use both: SM for always-on uptime visibility, k6 for periodic deep performance analysis.

> **DataDog comparison:** Grafana Synthetic Monitoring is the direct equivalent of DataDog Synthetic API Tests. Both run scheduled HTTP checks from global locations, both alert when checks fail, and both display uptime percentages and response time trends. The key difference: SM results live natively inside Grafana alongside your metrics, logs, and traces — there is no separate "Synthetics" portal to switch to.

## What You'll Learn

- How to navigate to Synthetic Monitoring in your Grafana Cloud stack
- The layout of the SM home page: checks list, summary dashboard, probes, alerts, config
- How to create an HTTP check with global probe locations
- How to read check detail pages: uptime %, response time by location, probe map
- The relationship between SM checks and the Synthetics fleet-level landing page

## Prerequisites

- Lab 09 complete (Grafana Cloud account active, logged in)
- A modern web browser with access to grafana.com

## Instructions

### Step 1: Navigate to Synthetic Monitoring

1. Go to **[grafana.com](https://grafana.com)** and sign in
2. In the top navigation, click on **My Account** (or your profile icon) → **My Stacks**
3. Click **Launch** next to your Grafana Cloud stack — this opens your Grafana instance
4. In the left sidebar, expand **Testing & synthetics** → **Synthetics**

> **Tip:** If you do not see Testing & synthetics in the sidebar, click the search button at the top (or press `Ctrl+K` / `Cmd+K`) and type "Synthetics". The plugin appears in search results even if the section is collapsed.

Once you are on the Synthetics landing page, take a moment to orient yourself before creating anything.

### Step 2: Explore the SM Sub-Navigation

Under **Testing & synthetics → Synthetics** you will find four sub-nav items:

**Checks**
The main list of all your monitoring checks. Each row shows the check name, type (HTTP, DNS, TCP, Ping, Traceroute), status (Up / Down / Unknown), uptime percentage, and latest response time. This is your primary operational view — a quick scan tells you which services are healthy right now.

**Probes**
The list of Grafana's global probe locations (grouped by region: AMER, APAC, EMEA) and any private probes you have set up. You will learn about private probes in Lab 25. For now, note the geographic spread — each probe runs your checks independently from its physical location.

**Alerts (Legacy)**
Pre-built alerting rules for your SM checks. The "Legacy" label indicates that newer SM alerts are managed through the unified **Alerts & IRM** → **Alert rules** section of Grafana, which covers every data source in one place. You will configure alerts in Lab 22.

**Config**
Plugin settings: API endpoint, access tokens, notification policies. You rarely need to touch this after initial setup.

> **Note:** The old "Summary" tab has been replaced by the fleet-level content on the **Synthetics** landing page itself plus check-detail dashboards. There is no separate Summary item in the sub-nav today.

### Step 3: Create Your First HTTP Check

Click **+ Create new check** on the Checks page (or the Synthetics landing page). You land on a check-type picker with four cards:

| Card | What it covers |
|---|---|
| **API Endpoint** | HTTP, Ping, DNS, TCP, Traceroute — a single request per check |
| **Multi Step** | A sequence of HTTP requests with assertions between steps |
| **Scripted** | Upload a k6 JavaScript file (Labs 13, 17) |
| **Browser** | Real Chromium run from SM probes (Lab 17) |

Click the **API Endpoint** card. The form opens on a 5-step wizard: **Request → Uptime → Labels → Execution → Alerting**.

**Step 1 of the wizard — Request**

| Field | Value |
|---|---|
| Job name | `Workshop Demo` |
| Request type | `HTTP` (default radio button; the row also offers Ping, DNS, TCP, Traceroute) |
| Request target | `https://grafana.com` |
| Request method | `GET` (default) |

`https://grafana.com` is a good first target: it is always up, publicly reachable from all probe locations, and on-brand for a Grafana workshop.

Click **Uptime →** at the bottom right to move to the next step.

**Step 2 — Uptime**

This step expresses what "healthy" means. For now leave the defaults — **Valid status codes: 2xx** is enough, and you will cover the new **Regexp validation** model in Lab 11. Click **Labels →**.

**Step 3 — Labels**

Optional custom Prometheus labels. Skip and click **Execution →**.

**Step 4 — Execution**

| Field | Value |
|---|---|
| Probe locations | pick at least three — e.g. `North Virginia, US (AWS)`, `Frankfurt, DE (AWS)`, `Singapore, SG (AWS)` |
| Frequency | click the **1m** pill |
| Timeout | leave at default (3s is fine for this target) |

Probes are grouped by region (**AMER / APAC / EMEA**). Geographic spread gives you more interesting data in the response-time-by-location graph. One-minute frequency is aggressive for a first check — it generates data quickly for the workshop. In production, 2–5 minutes is more common.

Click **Alerting →**.

**Step 5 — Alerting**

Skip and click **Save** at the bottom right. You will configure alerts in Lab 22.

### Step 4: Wait for First Results

After saving, SM schedules the first check run across all selected probe locations. It takes **1–2 minutes** for the first results to appear.

While you wait:
- Notice the check appears in the Checks list immediately with status **Unknown** (grey)
- The Unknown state means no data has been collected yet — it is not a failure
- After the first successful run from all probes, the status changes to **Up** (green)

If the status remains Unknown after 3 minutes, check that the URL is reachable from your browser. A correctly configured check against a public URL like `https://grafana.com` will always succeed quickly.

### Step 5: View the Check Detail Page

Click on the **Workshop Demo** check name to open its detail page. This page is the primary diagnostic view for a single check.

**Header section**
- Large uptime percentage (should be 100% after a few successful runs)
- Current status badge (Up / Down)
- Check metadata: URL, frequency, probe count, last run time

**Response time graph**
- Time series chart showing response time over the last hour (default time range)
- Each probe location appears as a separate coloured line
- Hover over the chart to see exact values at any point in time
- Look for differences between probe locations — US East is likely faster to reach `grafana.com` than Asia Pacific, reflecting real-world geographic latency

**Probe breakdown table**
- One row per probe location
- Columns: status, uptime %, avg/p50/p95 response time, last error
- Sort by response time to identify your slowest probe — that represents your worst-case user experience

**Error log**
- Timestamped list of failed check attempts
- Shows the error reason: timeout, connection refused, assertion failed, TLS error
- Since `https://grafana.com` is highly reliable, this log should be empty

### Step 6: View the Fleet-Level Summary

Navigate back to the **Synthetics** landing page (click the Synthetics breadcrumb or the sidebar item).

The landing page gives you a fleet-level view across all your checks: overall uptime, a geographic overview, check health, and response-time trends. With only one check so far it is simple. As you add more checks throughout the module, this view becomes the primary operational overview — analogous to DataDog's Synthetic Tests summary page but rendered as a native Grafana dashboard you can customise.

> **Tip:** The SM dashboards are regular Grafana dashboards stored in your stack. From the **Dashboards** section you can find and duplicate them, add panels, and embed them in Grafana Home just like any other dashboard. This is a meaningful advantage over DataDog, where the Synthetics summary view is fixed and not customisable.

## Expected Output

After creating the check and waiting ~2 minutes:

- The Checks list shows **Workshop Demo** with status **Up** and uptime **100.00%**
- The check detail page shows a response time graph with separate lines for each probe location
- Response times for `https://grafana.com` are typically in the range of 50–400 ms depending on probe location

## Key Takeaways

- Synthetic Monitoring runs lightweight scheduled checks (1 VU, seconds per run) from Grafana's global probe network — this is fundamentally different from load testing
- The SM Checks list is your real-time operational view; the Synthetics landing page is your fleet-level health view
- Each probe location runs the check independently — the response time graph shows geographic latency variation across your real user base
- SM results are native Grafana data: they feed into dashboards, alerting, and SLOs without any export or configuration
- SM is the always-on layer; k6 is the on-demand layer — together they give complete observability of service availability and performance
