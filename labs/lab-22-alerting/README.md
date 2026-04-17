# Lab 22: Alerting on Synthetic Monitoring Results

**Time:** 20 min | **Module:** Module 3 — Advanced

## Overview

Grafana Synthetic Monitoring integrates directly with Grafana Alerting. You can create alert rules based on uptime percentage, response time, and check failure rate. When a rule fires, Grafana routes the notification to a **contact point** — email, Slack, PagerDuty, a webhook, or any of a dozen other integrations — according to a **notification policy** you define once and reuse across all your alert rules.

This architecture means a single notification policy governs alerts from synthetic monitoring, infrastructure metrics, application logs, and distributed traces. There is no separate alerting system per data domain.

> **DataDog comparison:** DataDog Monitors map to Grafana Alert Rules. Both support multi-condition alerts, notification channels, and muting. The key difference is architectural: Grafana Alerting is the same engine for every data source in your stack — synthetics, infrastructure, logs, traces — with unified notification policies. DataDog requires configuring monitors separately for Synthetics, APM, and infrastructure, with no shared routing layer. For on-call teams managing complex systems, Grafana's unified model significantly reduces operational overhead.

## What You'll Learn

- Where to find SM's auto-generated alert rules and what they cover
- How to customize an existing alert rule's threshold and evaluation window
- How to write a new alert rule from scratch using SM metrics
- How to create a contact point and send a test notification
- How to create a notification policy that routes specific alerts to specific destinations
- How mute timings prevent alert noise during planned maintenance

## Prerequisites

- Lab 10 completed — at least one HTTP check running in Synthetic Monitoring
- Lab 11 completed (recommended) — an HTTP check with custom assertions configured
- Your Grafana Cloud stack open in a browser tab

## Instructions

### Step 1: Find Alerting in Synthetic Monitoring

SM surfaces its alert configuration in two places:

**From within SM (Legacy alerts):**

1. In your Grafana Cloud stack, expand **Testing & synthetics → Synthetics** in the left sidebar
2. Click **Alerts (Legacy)** in the SM sub-navigation

This view is scoped to SM-managed legacy alerts — it shows the pre-built rules that were generated when you first set up a check.

**From the main Grafana Alerting panel (recommended for new work):**

1. Expand **Alerts & IRM** in the left sidebar (or press `Ctrl+K` / `Cmd+K` and search for "Alert rules")
2. Click **Alert rules**

This view shows alert rules across every data source. SM-generated rules appear here with the label `namespace=synthetic_monitoring` or a name prefix like `Synthetic Monitoring -`.

Both paths reach the same underlying Grafana Alerting engine. The unified **Alert rules** view is the path to use going forward — the Legacy tab is maintained for backwards compatibility.

### Step 2: Examine the Auto-Generated Alert Rules

When you create an SM check, Grafana automatically generates alert rules for it. Navigate to **Testing & synthetics → Synthetics → Alerts (Legacy)** and find the rules for your Workshop Demo check.

SM creates two default rules per check:

**Uptime alert**
- Condition: uptime drops below a threshold (default is typically 75% over the evaluation window)
- Fires when: a significant fraction of probe runs are returning failures

**Response time alert**
- Condition: p95 response time exceeds a threshold
- Fires when: the service is responding slowly across probes, even if it is technically "up"

Click on one of these rules to see its full definition. Notice:

- **Data source:** Synthetic Monitoring (or the Grafana Cloud Metrics data source)
- **Query:** a PromQL expression over `probe_success` or `probe_duration_seconds`
- **Condition:** the threshold value and comparison operator
- **Evaluation group:** how often the rule is evaluated and how long it must be true before firing

### Step 3: Customize an Alert Rule

You will raise the uptime threshold to a more production-appropriate level.

1. In **Testing & synthetics → Synthetics → Alerts (Legacy)**, click the uptime alert rule for your Workshop Demo check
2. Click **Edit** (pencil icon)
3. Find the threshold condition — it is likely set to `< 0.75` (75% uptime)
4. Change it to `< 0.99` (99% uptime)
5. Find the **Pending period** field (the evaluation window before the alert fires) — change it to `5m`

With this setting: the alert fires only if uptime drops below 99% and stays there for at least 5 minutes. This avoids false positives from a single flaky probe run.

6. Click **Save rule and exit**

> **Tip:** For critical production services, a common pattern is two alert rules per check — a "warning" rule at 99% uptime with a 5-minute window, and a "critical" rule at 95% uptime with a 1-minute window. The warning fires early and gives you time to investigate before the critical fires.

### Step 4: Create a Custom Alert Rule From Scratch

Sometimes the auto-generated rules do not cover the exact condition you care about. Here is how to create a rule manually.

1. Navigate to **Alerting > Alert Rules > New alert rule**
2. Give it a name: `Workshop Demo — high error rate`
3. In the **Query** section, select **Synthetic Monitoring** (or your Grafana Cloud data source) as the data source
4. Enter this PromQL expression:

```promql
avg_over_time(probe_success{job="Workshop Demo"}[5m])
```

This computes the average success rate across all probes over a 5-minute window. A value of 1.0 means 100% of checks passed; 0.0 means all failed.

5. Set the **Condition** to: `IS BELOW 0.99`
6. Set the **Pending period** to `5m`
7. Under **Labels**, add:

| Key | Value |
|-----|-------|
| `severity` | `warning` |
| `team` | `platform` |

Labels are how Grafana Alerting routes notifications — the notification policy you create in Step 6 will match on `severity=warning`.

8. Click **Save rule and exit**

### Step 5: Create a Contact Point

A contact point defines where notifications go. You will set up an email contact point.

1. Navigate to **Alerting > Contact Points > Add contact point**
2. Name: `Workshop Email`
3. Integration type: **Email**
4. Addresses: enter your email address
5. Expand **Optional email settings** — you can customize the subject and message body using Go template syntax, but the defaults are fine for now
6. Click **Test** — Grafana sends a test notification immediately. Check your inbox to confirm delivery.
7. Click **Save contact point**

> **Other integrations available:** Slack, PagerDuty, OpsGenie, VictorOps, Microsoft Teams, Telegram, LINE, Webex, and generic webhooks. The webhook integration lets you connect to any system that accepts HTTP POST requests, including custom automation.

### Step 6: Create a Notification Policy

Notification policies route alerts to contact points based on label matchers. Think of it as routing rules: "if an alert has these labels, send it to this contact point."

1. Navigate to **Alerting > Notification policies**
2. You will see the **Default policy** at the top — this is the catch-all that receives any alert not matched by a more specific rule
3. Click **Add nested policy** under the default
4. Set the matcher: `severity = warning`
5. Contact point: select **Workshop Email**
6. Click **Save policy**

Now any alert rule with the label `severity=warning` (including the rule you created in Step 4) will route to your email address.

### Step 7: Mute Timings for Maintenance Windows

A **mute timing** suppresses notifications during a scheduled time period — for example, during a weekly maintenance window or a scheduled deployment. Alerts still fire and appear in Grafana; notifications are simply not sent.

To create a mute timing:

1. Navigate to **Alerting > Mute timings > Add mute timing**
2. Name: `Weekly maintenance`
3. Time interval:
   - Days of the week: Sunday
   - Time range: 02:00–04:00
4. Click **Submit**

Then apply it to your notification policy:

1. Go back to **Alerting > Notification policies**
2. Click **Edit** on your `severity=warning` policy
3. Under **Mute timings**, select **Weekly maintenance**
4. Save

During Sunday 02:00–04:00, your check can fail without sending any email. The alert state is still tracked in Grafana and visible in the alert history.

### Step 8: Trigger a Test Alert

Temporarily break your check to verify the full alert pipeline works end-to-end.

1. In **Testing & synthetics → Synthetics → Checks**, click on the **Workshop Demo** check
2. Click **Edit**
3. Change the URL from `https://grafana.com` to `https://grafana.com/thispagedoesnotexist`
4. Save the check

The modified URL returns a 404, which will fail the default HTTP status assertion. Within 1–2 minutes (one check interval), the check status changes to **Down**. After 5 minutes of sustained failures, the alert rule you created in Step 3 fires and sends an email.

To restore normal operation:

1. Edit the check again
2. Change the URL back to `https://grafana.com`
3. Save — the check resumes passing, the alert resolves, and you receive a "resolved" notification

> **Note:** You do not need to wait the full 5 minutes. Confirm the check is showing Down status, then restore the URL. The point is to verify the alert fires — you can check the Alerting > Alert Rules page to see the rule enter the **Pending** state as it accumulates failures.

## Expected Output

After completing all steps:

- The Checks list shows your Workshop Demo check with a customized uptime alert rule at the 99% threshold
- Your inbox received a test notification from Step 5 confirming the contact point is configured correctly
- The Notification Policies page shows a `severity=warning` route pointing to Workshop Email
- The alert rule entered **Pending** state during the test-alert step and transitioned to **Firing** after 5 minutes

## Key Takeaways

- SM auto-generates uptime and response-time alert rules for every check; you can customize thresholds and evaluation windows without starting from scratch
- Custom alert rules use PromQL over SM metrics like `probe_success` and `probe_duration_seconds` — the same query language you use for infrastructure and application metrics
- Labels on alert rules drive notification routing; the notification policy matches on labels, not on alert names, making the routing system composable and reusable
- Mute timings suppress notifications during planned maintenance without disabling the alert rules themselves
- Grafana Alerting is one engine for all data sources — the contact points and notification policies you configure here also handle infrastructure, log, and trace alerts
