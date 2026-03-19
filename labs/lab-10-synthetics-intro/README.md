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
- The relationship between SM checks and the Grafana Summary dashboard

## Prerequisites

- Lab 09 complete (Grafana Cloud account active, logged in)
- A modern web browser with access to grafana.com

## Instructions

### Step 1: Navigate to Synthetic Monitoring

1. Go to **[grafana.com](https://grafana.com)** and sign in
2. In the top navigation, click on **My Account** (or your profile icon) → **My Stacks**
3. Click **Launch** next to your Grafana Cloud stack — this opens your Grafana instance
4. In the left sidebar, look for **Synthetic Monitoring** — it may appear directly in the nav, or you can find it by clicking the grid/apps icon and searching for "Synthetic"

> **Tip:** If you do not see Synthetic Monitoring in the sidebar, click the search bar at the top of the left nav and type "Synthetic". The plugin appears in search results even if it is not pinned to the sidebar.

Once you are on the SM landing page, take a moment to orient yourself before creating anything.

### Step 2: Explore the SM Home Page

The Synthetic Monitoring home page has several sections in the left navigation:

**Checks**
The main list of all your monitoring checks. Each row shows the check name, type (HTTP, DNS, TCP, Ping, Traceroute), status (Up / Down / Unknown), uptime percentage, and latest response time. This is your primary operational view — a quick scan tells you which services are healthy right now.

**Summary**
A Grafana dashboard that aggregates all your checks into a single overview. Shows overall uptime across all checks, a map of probe locations, and trend graphs. Bookmark this — it is the page you want on a wall screen or incident response channel.

**Probes**
The list of Grafana's global probe locations (US East, Europe West, Asia Pacific, etc.) and any private probes you have set up. You will learn about private probes in a later lab. For now, note the geographic spread — each probe runs your checks independently from its physical location.

**Alerts**
Pre-built alerting rules for your SM checks. When a check fails, SM can fire an alert to PagerDuty, Slack, email, or any Grafana alerting contact point. You will configure alerts in a later lab.

**Config**
Plugin settings: API endpoint, access tokens, notification policies. You rarely need to touch this after initial setup.

### Step 3: Create Your First HTTP Check

Click **Add Check** in the top-right corner of the Checks page, then select **HTTP** from the check type list.

Fill in the form:

**Basic settings**

| Field | Value |
|---|---|
| Job name | `Workshop Demo` |
| URL | `https://grafana.com` |

`https://grafana.com` is a good first target: it is always up, publicly reachable from all probe locations, and on-brand for a Grafana workshop.

**Probe locations**

Click the **Probe locations** field and select at least three geographically distributed locations. Good choices:
- US East (Atlanta or Newark)
- Europe West (Frankfurt or Amsterdam)
- Asia Pacific (Sydney or Singapore)

More probes give you better geographic coverage and more data points in the response-time-by-location graph.

**Frequency and timeout**

| Field | Value |
|---|---|
| Frequency | `1 minute` |
| Timeout | `10 seconds` |

One minute is aggressive for a first check — it generates data quickly for the workshop. In production, 2–5 minutes is more common for public endpoints.

**Assertions (leave at defaults for now)**

The default assertion is "HTTP status code equals 200". This is sufficient for this first check — you will configure advanced assertions in Lab 11.

Click **Save** at the bottom of the form.

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

### Step 6: View the Summary Dashboard

Click **Summary** in the left nav (or navigate back to the SM home and click the Summary tab).

The Summary dashboard gives you a fleet-level view across all your checks:

- **Overall uptime** — percentage of checks that are currently Up
- **Geographic map** — world map showing probe locations with colour-coded status dots
- **Check health table** — all checks sorted by health, so degraded checks bubble to the top
- **Response time trends** — multi-line chart for all checks on one axis

With only one check so far, this dashboard is simple. As you add more checks throughout the module, this view becomes the primary operational overview — analogous to DataDog's Synthetic Tests summary page but rendered as a native Grafana dashboard you can customise.

> **Tip:** The Summary dashboard is a regular Grafana dashboard stored in your stack. You can duplicate it, add panels, change time ranges, and embed it in Grafana Home just like any other dashboard. This is a meaningful advantage over DataDog, where the Synthetics summary view is fixed and not customisable.

## Expected Output

After creating the check and waiting ~2 minutes:

- The Checks list shows **Workshop Demo** with status **Up** and uptime **100.00%**
- The check detail page shows a response time graph with separate lines for each probe location
- Response times for `https://grafana.com` are typically in the range of 50–400 ms depending on probe location

## Key Takeaways

- Synthetic Monitoring runs lightweight scheduled checks (1 VU, seconds per run) from Grafana's global probe network — this is fundamentally different from load testing
- The SM Checks list is your real-time operational view; the Summary dashboard is your fleet-level health view
- Each probe location runs the check independently — the response time graph shows geographic latency variation across your real user base
- SM results are native Grafana data: they feed into dashboards, alerting, and SLOs without any export or configuration
- SM is the always-on layer; k6 is the on-demand layer — together they give complete observability of service availability and performance
