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

### Step 1: Where Alerting Lives Now

Grafana's alerting platform is split into two closely related areas:

- **`Alerts & IRM → Alerting`** in the sidebar — this is where **alert rules**, **notification configuration**, **silences**, and **history** all live. It's the same engine used by every data source (metrics, logs, SM, anything else).
- **Per-check alerts** inside each SM check's edit form — a new, simpler UI that generates Grafana alert rules for you without needing to write PromQL. You'll use this for the common SM cases in Step 2.

> **Deprecation note:** The old **Synthetic Monitoring → Alerts (Legacy)** page still appears in the SM sub-nav. If you open it you'll see a banner telling you legacy alerts (High/Medium/Low sensitivity) are no longer available and to use per-check alerts instead. Ignore the Legacy page for new workshop work — it exists for back-compat only.

### Step 2: Configure Per-Check Alerts on the Workshop Demo Check

The fastest path from "my check is running" to "I get paged when it breaks" is the per-check alerts UI.

1. Navigate to **Testing & synthetics → Synthetics → Checks** and click **Workshop Demo**.
2. Click **Edit check** in the top-right.
3. Advance to the **Alerting** tab (step 5 of the check wizard). You'll see three opt-in alerting scenarios:

| Scenario | What it covers | Default |
|---|---|---|
| **Failed Checks** | Probe failures in a rolling window | Alert if at least **1** of **15** probe executions fails in the last **5 min** |
| **TLS Certificate** | Target cert expiry | Alert if the cert expires in less than **30 d** |
| **Latency** | Per-request duration | Alert if the **average** http request duration exceeds **300 ms** over the last **5 min** |

4. Tick **Failed Checks** and **Latency**. For each, fill in an optional **Runbook URL** (use `https://example.com/workshop-runbook` as a placeholder if you don't have a real one).

5. Click **Save** at the bottom right.

Under the hood, Grafana creates real alert rules in **Alerts & IRM → Alerting → Alert rules** (look for rules prefixed with `Synthetic Monitoring -`). You didn't have to write any PromQL. These are what route through your notification policies in Step 6.

### Step 3: Inspect the Generated Alert Rules

1. Navigate to **Alerts & IRM → Alerting → Alert rules**.
2. Filter by the rule name prefix or by the label `alertname=synthetic_monitoring*`.
3. Click into the `Workshop Demo - Failed Checks` rule. You'll see the full PromQL query Grafana generated from your toggle — something like `sum by (...) (rate(probe_all_success_count{...} - probe_all_success_sum{...}))` depending on the SM agent version.

This is the bridge moment of the lesson: the convenience UI writes Grafana-native alert rules that live alongside every other alert rule in your stack. You can fully leave the per-check UI behind and edit the underlying rule directly if you need a condition the UI doesn't expose — which is exactly what Step 4 covers.

With this setting: the alert fires only if uptime drops below 99% and stays there for at least 5 minutes. This avoids false positives from a single flaky probe run.

6. Click **Save rule and exit**

> **Tip:** For critical production services, a common pattern is two alert rules per check — a "warning" rule at 99% uptime with a 5-minute window, and a "critical" rule at 95% uptime with a 1-minute window. The warning fires early and gives you time to investigate before the critical fires.

### Step 4: Create a Custom Alert Rule From Scratch

Sometimes the auto-generated rules do not cover the exact condition you care about. Here is how to create a rule manually.

1. Navigate to **Alerts & IRM → Alerting → Alert rules** and click **+ New alert rule** at the top right
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

1. Navigate to **Alerts & IRM → Alerting → Notification configuration**. You land on a four-tab page: **Contact points / Notification policies / Templates / Time intervals**.
2. On the **Contact points** tab (default), click **+ New contact point** at the top right.
3. Name: `Workshop Email`
3. Integration type: **Email**
4. Addresses: enter your email address
5. Expand **Optional email settings** — you can customize the subject and message body using Go template syntax, but the defaults are fine for now
6. Click **Test** — Grafana sends a test notification immediately. Check your inbox to confirm delivery.
7. Click **Save contact point**

> **Other integrations available:** Slack, PagerDuty, OpsGenie, VictorOps, Microsoft Teams, Telegram, LINE, Webex, and generic webhooks. The webhook integration lets you connect to any system that accepts HTTP POST requests, including custom automation.

### Step 6: Create a Notification Policy

Notification policies route alerts to contact points based on label matchers. Think of it as routing rules: "if an alert has these labels, send it to this contact point."

1. On the same **Notification configuration** page, switch to the **Notification policies** tab.
2. You will see the **Default policy** at the top — this is the catch-all that receives any alert not matched by a more specific rule
3. Click **Add nested policy** under the default
4. Set the matcher: `severity = warning`
5. Contact point: select **Workshop Email**
6. Click **Save policy**

Now any alert rule with the label `severity=warning` (including the rule you created in Step 4) will route to your email address.

### Step 7: Time Intervals for Maintenance Windows

A **time interval** (the feature used to be called "mute timing") suppresses notifications during a scheduled time period — for example, during a weekly maintenance window or a scheduled deployment. Alerts still fire and appear in Grafana; notifications are simply not sent.

To create one:

1. On the **Notification configuration** page, switch to the **Time intervals** tab.
2. Click **+ New time interval**.
3. Name: `Weekly maintenance`
4. Time interval:
   - Days of the week: Sunday
   - Time range: 02:00–04:00
5. Click **Submit**

Then apply it to your notification policy:

1. Switch to the **Notification policies** tab
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

- The Workshop Demo check has per-check alerts enabled for Failed Checks + Latency; corresponding rules appear in Alerts & IRM → Alerting → Alert rules
- Your inbox received a test notification from Step 5 confirming the contact point is configured correctly
- The Notification Policies page shows a `severity=warning` route pointing to Workshop Email
- The alert rule entered **Pending** state during the test-alert step and transitioned to **Firing** after 5 minutes

## Key Takeaways

- SM's **per-check alerts** UI lets you enable Failed Checks / TLS / Latency alerts with a single checkbox — Grafana writes the underlying alert rules for you, and they live alongside every other alert in Alerts & IRM → Alert rules
- Custom alert rules use PromQL over SM metrics like `probe_success` and `probe_duration_seconds` — the same query language you use for infrastructure and application metrics
- Labels on alert rules drive notification routing; the notification policy matches on labels, not on alert names, making the routing system composable and reusable
- Time intervals (formerly "mute timings") suppress notifications during planned maintenance without disabling the alert rules themselves
- Grafana Alerting is one engine for all data sources — the contact points and notification policies you configure here also handle infrastructure, log, and trace alerts
