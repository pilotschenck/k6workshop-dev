# Lab 28: Migrating DataDog Monitors to Grafana Alerting

**Time:** 15 min | **Module:** Module 4 — DataDog Migration

## Overview

You don't need a DataDog account for this lab. We work from a realistic mock DD monitor JSON (the same format the DD API returns) and walk through building the equivalent Grafana Alert Rule step by step. By the end, you'll understand the complete translation from DD's monitor model to Grafana's unified alerting model — including the parts that require rethinking, not just renaming.

The biggest conceptual shift is not the UI — it's that Grafana separates alert rules from notification routing. In DD, you embed `@pagerduty-handle` directly in the monitor message. In Grafana, alert rules carry labels, and Notification Policies route by those labels. This decoupling is the key thing to internalize.

## What You'll Learn

- How to read and interpret a DD monitor JSON export
- The structural differences between DD monitors and Grafana Alert Rules
- How DD's query language maps to PromQL in Grafana
- How to handle multi-threshold monitors (warning + critical) in Grafana
- Where DD monitoring concepts have no direct equivalent and what to do about it

## Prerequisites

- Lab 22 completed — you know how to create a Grafana alert rule and contact point
- Lab 23 completed — familiar with SLOs and burn rate alerts
- Lab 26 reviewed — concept mapping table is fresh

## Instructions

### Step 1: Read the Mock DD Monitor

The file `labs/lab-28/mock-dd-monitor.json` is a realistic export from the DataDog Monitors API. Study the structure:

```json
{
  "id": 98234602,
  "name": "P95 latency high - express API (prod)",
  "type": "metric alert",
  "query": "avg(last_5m):avg:trace.express.request.duration.by.resource_name.95p{env:prod,service:api-gateway} > 2000",
  "message": "{{#is_alert}}\nP95 request latency has exceeded 2000ms.\nCurrent value: {{value}}ms\n@pagerduty-platform-critical @slack-sre-alerts\n{{/is_alert}}\n{{#is_warning}}\nLatency is elevated (above 1500ms).\n@slack-sre-alerts\n{{/is_warning}}\n{{#is_recovery}}\nP95 latency has recovered.\n{{/is_recovery}}",
  "tags": ["env:prod", "service:api-gateway", "team:platform", "severity:p2"],
  "options": {
    "thresholds": {
      "critical": 2000.0,
      "warning": 1500.0,
      "critical_recovery": 1800.0,
      "warning_recovery": 1200.0
    },
    "notify_no_data": true,
    "no_data_timeframe": 10,
    "renotify_interval": 60,
    "renotify_statuses": ["alert"],
    "escalation_message": "Latency still high — escalating. @pagerduty-platform-critical",
    "evaluation_delay": 60
  }
}
```

This monitor has two thresholds (warning and critical), notification handles embedded in the message, no-data alerting, and a recovery template. These are all common real-world features.

---

### Step 2: Field-by-Field Anatomy

Walk through each DD monitor field and its Grafana destination:

| DD Field | Value | Grafana Destination |
|---|---|---|
| `type` | `metric alert` | Alert Rule → Data source: Synthetic Monitoring or Prometheus/Mimir |
| `query` | `avg(last_5m):avg:trace.express...` | Alert Rule → PromQL expression in Query A |
| `options.thresholds.critical` | `2000.0` | Alert Rule condition: `> 2000` |
| `options.thresholds.warning` | `1500.0` | Second Alert Rule (or second condition) with `severity=warning` label |
| `message` text | "P95 latency has exceeded..." | Alert Rule annotation: `summary` or `description` field |
| `@pagerduty-platform-critical` | embedded in message | Grafana Contact Point (PagerDuty) + Notification Policy routes `severity=critical` to it |
| `@slack-sre-alerts` | embedded in message | Grafana Contact Point (Slack) + Notification Policy routes to it |
| `{{#is_alert}}` | conditional template block | Grafana message template: `{{ if not $resolved }}` |
| `{{#is_warning}}` | conditional template block | Second alert rule firing + template condition |
| `{{#is_recovery}}` | conditional template block | Grafana resolved notification: `{{ if $resolved }}` |
| `{{value}}` | current metric value | Grafana template: `{{ $values.A.Value }}` |
| `{{threshold}}` | configured threshold | Grafana template: hardcoded in annotation string or label |
| `options.notify_no_data` | `true` | Alert Rule: enable "No data" state → fires as alert |
| `options.no_data_timeframe` | `10` (minutes) | Alert Rule: "No data" evaluation period |
| `options.renotify_interval` | `60` (minutes) | Notification Policy: repeat interval |
| `options.evaluation_delay` | `60` (seconds) | Alert Rule: evaluation offset / pending period |
| `tags` | `env:prod`, `team:platform`, etc. | Alert Rule labels: `env=prod`, `team=platform`, etc. |
| `options.silenced` | `{}` (empty) | Grafana Mute Timing (if non-empty, create a mute timing) |

---

### Step 3: DD → Grafana Full Translation Table

| DataDog Monitor Concept | Grafana Equivalent |
|---|---|
| `type: metric alert` | Alert Rule with Prometheus/Mimir data source |
| `type: synthetics alert` | SM auto-generated alert rule, or custom alert rule on `probe_success` metric |
| `type: service check` | Alert Rule querying custom exporter or Blackbox Exporter metric |
| `type: event alert` | Alert Rule with Loki data source (events as log entries) |
| DD query language | PromQL (for metrics), LogQL (for logs) |
| `thresholds.critical` | Alert Rule condition threshold (single condition) |
| `thresholds.warning` | Second Alert Rule with lower threshold + `severity=warning` label |
| `thresholds.critical_recovery` | Alert Rule: hysteresis is configured via PromQL `>` vs `>=` or Grafana "resolve timeout" |
| `@pagerduty-handle` in message | Grafana Contact Point (PagerDuty) — routing set in Notification Policy |
| `@slack-handle` in message | Grafana Contact Point (Slack) — routing set in Notification Policy |
| `{{#is_alert}}` template | `{{ if not $resolved }}` in Grafana message template |
| `{{#is_recovery}}` template | `{{ if $resolved }}` in Grafana message template |
| `{{value}}` | `{{ $values.A.Value }}` in Grafana message template |
| `notify_no_data: true` | Alert Rule "No data" state set to "Alerting" |
| `renotify_interval: 60` | Notification Policy: repeat interval = 1h |
| `escalation_message` | Notification Policy: escalation contact point chain |
| Monitor `tags` | Alert Rule labels (key=value) |
| DD Downtime | Grafana Mute Timing with time window |
| DD Composite Monitor | Grafana Alert Rule with multiple conditions (AND/OR) |
| DD Anomaly Monitor | Grafana ML alert (Grafana Cloud feature; not in OSS tier) |
| DD Forecast Monitor | Grafana ML predictive alerting (Grafana Cloud) |

---

### Step 4: Build the Grafana Alert Rule

Follow these steps in the Grafana UI at `http://localhost:3030`:

**A. Create the critical alert:**

1. Navigate to **Alerting > Alert Rules > New Alert Rule**
2. Name: `P95 latency high - api-gateway (critical)`
3. Data source: **Synthetic Monitoring** (or Prometheus if using a real metrics source)
4. For the SM equivalent, use this PromQL query to get response duration P95:
   ```promql
   histogram_quantile(0.95,
     sum by (le) (
       rate(probe_http_duration_seconds_bucket{job="Workshop Demo"}[5m])
     )
   ) * 1000
   ```
   The `* 1000` converts seconds to milliseconds to match the DD threshold units.
5. Condition: `IS ABOVE 2000` (matching `thresholds.critical: 2000.0`)
6. Evaluate every: `1m`, for: `1m` (the DD `evaluation_delay` was 60s)
7. Labels:
   - `env=prod`
   - `team=platform`
   - `service=api-gateway`
   - `severity=critical`
8. Annotations:
   - Summary: `P95 latency for api-gateway is above 2000ms (current: {{ $values.A.Value | printf "%.0f" }}ms)`
   - Description: `Runbook: https://wiki.example.com/runbooks/high-latency`
9. No data state: **Alerting** (matching `notify_no_data: true`)

**B. Create the warning alert (for DD's `thresholds.warning`):**

Duplicate the above rule and change:
- Name: `P95 latency high - api-gateway (warning)`
- Condition threshold: `IS ABOVE 1500`
- Labels: `severity=warning` (change from `severity=critical`)

**C. Set up routing via Notification Policies:**

In DD, routing is embedded in the monitor message as `@pagerduty-handle`. In Grafana, you create a policy:

1. Go to **Alerting > Notification Policies**
2. Add a nested policy:
   - Matchers: `severity = critical`
   - Contact point: your PagerDuty contact point
   - Repeat interval: `1h` (matching `renotify_interval: 60`)
3. Add another nested policy:
   - Matchers: `severity = warning`
   - Contact point: your Slack contact point
   - Repeat interval: `4h` (typically less frequent for warning)

Now the alert rules carry labels, and the notification policies route by those labels. You can change routing (add contacts, change teams) without touching the alert rules themselves.

---

### Step 5: Message Templates

DD uses Handlebars-style template blocks in the monitor message. Grafana uses Go templates. Here is the translation for common patterns:

| DD template | Grafana message template equivalent |
|---|---|
| `{{#is_alert}}...{{/is_alert}}` | `{{ if not $resolved }}...{{ end }}` |
| `{{#is_warning}}...{{/is_warning}}` | `{{ if eq $labels.severity "warning" }}...{{ end }}` |
| `{{#is_recovery}}...{{/is_recovery}}` | `{{ if $resolved }}...{{ end }}` |
| `{{value}}` | `{{ $values.A.Value \| printf "%.2f" }}` |
| `{{threshold}}` | hardcode in string, or store as label |
| `{{#each failing_locations}}{{location}}{{/each}}` | `{{ $labels.probe }}` (single probe label in SM) |

A complete Grafana message template for the migrated monitor:

```
{{ if not $resolved }}
P95 request latency for {{ $labels.service }} in {{ $labels.env }} has exceeded threshold.

Current value: {{ $values.A.Value | printf "%.0f" }}ms
Severity: {{ $labels.severity }}
{{ else }}
P95 latency for {{ $labels.service }} has recovered.
{{ end }}
```

Store this in **Alerting > Contact Points > Message Templates** and reference it by name in your contact point.

---

### Step 6: Multi-Threshold Strategy

DD allows warning and critical thresholds in one monitor. Grafana's two-rule approach provides more flexibility:

| Aspect | DD (single monitor) | Grafana (two rules) |
|---|---|---|
| Warning fires | yes, same monitor | Second rule with `severity=warning` |
| Critical fires | yes, same monitor | First rule with `severity=critical` |
| Routing | both handled by @-handles in one message | Notification Policy routes by `severity` label |
| Changing who gets warned | edit monitor message | Edit notification policy (no rule edit needed) |
| Silencing only warnings | DD downtime scoped to the monitor | Mute timing matched to `severity=warning` |

If you prefer a single Grafana rule with two conditions, that is also possible: create two queries (A for critical, B for warning), set the condition to fire when A OR B is above threshold, and use the query letter in a label expression. This is more advanced and usually less readable than two separate rules.

---

### Step 7: What to Watch Out For

These DD monitor features require special handling:

| DD Feature | Grafana Situation | Recommended Approach |
|---|---|---|
| Anomaly detection monitor | No direct OSS equivalent | Use Grafana ML plugin (Grafana Cloud) or set a wider static threshold with seasonal awareness |
| Composite monitor (AND of two monitors) | Grafana supports multi-condition rules | Create a single Grafana rule with two queries and an AND condition |
| Process/infrastructure monitor | DD agent collects process metrics natively | Deploy Grafana Alloy + process exporter; alert in Grafana on `process_resident_memory_bytes` etc. |
| Host map monitor | No direct equivalent | Grafana node dashboard + alert on node exporter metrics |
| Log-based monitor | Grafana Loki + LogQL alert rule | Requires Loki; query `count_over_time({job="myapp"} |= "ERROR" [5m]) > 10` |
| Synthetics alert (monitor auto-created by DD) | SM auto-creates alerts when you configure a check | Or create a custom alert rule on `probe_success{job="..."}` |

## Expected Output

This lab has no terminal commands to run. You are building Grafana alert rules in the UI. After completing Step 4, you should see:

- Two alert rules listed under **Alerting > Alert Rules** for the api-gateway service
- Both in `Normal` state (since the demo-app is not generating real P95 latency data above threshold)
- Notification Policies tree showing routing: `severity=critical` → PagerDuty, `severity=warning` → Slack

To test the notification path, temporarily change the threshold to `> 0` to force the rule to fire, verify the contact point receives the test notification, then restore the original threshold.

## Key Takeaways

- The biggest structural shift: DD embeds routing (`@pagerduty-handle`) in monitor messages; Grafana separates routing into Notification Policies using alert labels — this decoupling is a feature, not a limitation
- DD's single monitor with warning + critical thresholds maps to two Grafana alert rules with `severity=warning` and `severity=critical` labels — more rules, but more flexible routing
- DD Handlebars templates (`{{#is_alert}}`) map to Go templates (`{{ if not $resolved }}`) — same logical structure, different syntax
- `notify_no_data` → set "No data" state to "Alerting" in the Grafana rule condition
- Anomaly detection monitors are the one real gap: they require Grafana ML (a Grafana Cloud paid feature) and are not available in the OSS stack
- Mute timings replace DD Downtimes; they decouple silence windows from individual monitors
