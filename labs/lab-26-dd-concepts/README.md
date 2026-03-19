# Lab 26: DataDog to Grafana — Concept Mapping

**Time:** 15 min | **Module:** Module 4 — DataDog Migration

## Overview

This lab is a structured reference guide. If you're coming from DataDog, this table maps every DD concept you know to its Grafana/k6 equivalent. No hands-on steps, no scripts — just the translation layer you need to mentally re-orient. Reference it throughout the rest of the workshop and keep it handy after.

The goal is not to convince you one platform is better. It is to make sure you can look at a DD concept you already understand and immediately identify the Grafana equivalent, so you can get productive without starting from zero.

## What You'll Learn

- How DD's product surface maps to Grafana and k6 equivalents
- Where the two platforms use different terminology for the same idea
- Where there are real capability gaps in either direction
- What changes in your daily workflow and what stays the same

## Prerequisites

- Familiarity with DataDog from your previous environment
- Labs 10–25 reviewed (Grafana Synthetic Monitoring, alerting, SLOs)

## Instructions

### Step 1: Master Concept Mapping Table

Study this table. Hover over anything unfamiliar and look it up in the labs listed in the Notes column.

| DataDog Concept | Grafana / k6 Equivalent | Notes |
|---|---|---|
| Synthetic API Test | Grafana Synthetic Monitoring HTTP Check | SM HTTP checks run from 20+ global probe locations on a configurable schedule |
| Synthetic Browser Test | SM Browser Check / k6 browser test | SM browser checks use k6 browser, which is Chromium-based and scripted in JavaScript |
| Multistep API Test | SM Scripted Check | Uses k6 JavaScript — the same language as your load tests; no proprietary format |
| Synthetic Recorder | k6 Studio | k6 Studio generates k6 JS scripts; the output is plain JS you can edit and version |
| Private Location | SM Private Probe | Lightweight Docker agent; outbound-only connectivity required (see Lab 25) |
| DD Monitor | Grafana Alert Rule | Unified alerting across all data sources in one UI (see Lab 22) |
| DD Notification Channel | Grafana Contact Point | Email, Slack, PagerDuty, webhook, OpsGenie, Microsoft Teams, and more |
| DD Notification Rules | Grafana Notification Policy | Routing by labels/tags; notification policy tree decouples rules from channels |
| DD Downtime | Grafana Mute Timing | Time-window based muting; supports recurring schedules |
| DD SLO | Grafana SM SLO | Built-in SLO with error budget tracking and burn rate alerts (see Lab 23) |
| DD APM | Grafana Tempo (traces) | Open standards: OpenTelemetry and Jaeger; k6 can generate trace IDs (see Lab 18) |
| DD Log Management | Grafana Loki | LogQL query language; similar concept to DD Log Explorer |
| DD Metrics | Grafana Mimir / Prometheus | PromQL query language; same mental model as DD metrics explorer |
| DD Dashboards | Grafana Dashboards | Same visual concept; Grafana has 3000+ community dashboards at grafana.com/grafana/dashboards |
| DD Agent | Grafana Alloy (formerly Grafana Agent) | Collects metrics, logs, traces; ships to Grafana Cloud or self-hosted stack |
| DD Custom Metrics | k6 Custom Metrics + Grafana | No per-metric pricing in k6; define counters, gauges, rates, and trends freely (see Lab 20) |
| DD Load Testing | k6 (local or k6 Cloud) | Full scripting in JavaScript; open-source core; cloud execution optional |
| DD Watchdog / Anomaly Detection | Grafana ML (machine learning features) | Available in Grafana Cloud; not present in the basic open-source stack |
| DD Service Map | Grafana Service Graph | Part of Tempo trace analysis; built from span data |
| DD Forecast Monitor | Grafana ML predictive alerting | Grafana Cloud feature; requires ML plugin |
| DD Composite Monitor | Grafana multi-condition alert rule | Grafana supports AND/OR conditions in a single rule; syntax differs |

---

### Step 2: Synthetic Monitoring Deep Dive

DataDog Synthetic Monitoring and Grafana Synthetic Monitoring cover the same ground at a high level: run checks from global locations on a schedule, report pass/fail, alert on failures. The details differ.

**Check types — side by side:**

| DD Check Type | SM Equivalent | Key Difference |
|---|---|---|
| API Test (HTTP) | SM HTTP Check | SM HTTP check is configuration-driven (no code); DD API test is also config-driven |
| API Test (DNS) | SM DNS Check | Functionally identical concept |
| API Test (TCP) | SM TCP Check | Functionally identical concept |
| API Test (gRPC) | SM scripted check with k6/net/grpc | SM has no native gRPC check type; requires a scripted check |
| Multistep API Test | SM Scripted Check | DD uses a step-builder UI; SM uses a k6 JavaScript file you write or generate |
| Browser Test | SM Browser Check | Both run Chromium; DD uses a recorder + step builder; SM uses k6 browser JS |

**The key SM advantage to internalize:** every SM scripted check and browser check runs exactly the same k6 JavaScript you use for load testing. There is no second language to learn, no proprietary step format, no vendor lock-in on your test scripts.

**Where DD has an edge:** DD's no-code step builder and browser recorder are faster for non-developers to get started with. SM scripted checks require writing (or generating) JavaScript.

---

### Step 3: Alerting Deep Dive

Both systems route from a data query to a condition to a notification. The vocabulary is different but the logical structure is the same.

**Alert anatomy comparison:**

| Concept | DataDog | Grafana |
|---|---|---|
| The rule that evaluates | Monitor | Alert Rule |
| The query it evaluates | DD metrics query language | PromQL / LogQL / any data source query |
| Threshold condition | `thresholds.critical`, `thresholds.warning` | Alert Rule condition (>, <, =, etc.) |
| Severity distinction | Single monitor with warning + critical thresholds | Two alert rules with `severity=warning` and `severity=critical` labels, or one rule with two conditions |
| Where you send alerts | Notification Channels (in the monitor) | Contact Points (separate from rules) + Notification Policies for routing |
| Silencing | DD Downtime | Grafana Mute Timing |
| Grouping / routing | Monitor tags | Alert Rule labels + Notification Policy matchers |
| Re-alert on continued firing | `renotify_interval` | Notification Policy repeat interval |
| Escalation | `escalation_message` | Notification Policy escalation chain |

**The key Grafana alerting advantage:** Notification Policies are separate from Alert Rules. In DD, you embed `@pagerduty-handle` directly in the monitor message. In Grafana, you add a label like `severity=critical` to the rule, and Notification Policies route by that label to the right Contact Point. This means you can change your notification routing without touching your alert rules — useful when on-call rotations change.

---

### Step 4: Data Query Language Translation

If you've written DD queries, here is the rough PromQL equivalent for common patterns:

| What you want | DataDog query | PromQL equivalent |
|---|---|---|
| Average latency over 5 min | `avg(last_5m):avg:trace.request.duration{service:api}` | `avg_over_time(http_request_duration_seconds[5m])` |
| Error rate | `sum(last_5m):sum:trace.request.errors{service:api}.as_rate()` | `rate(http_requests_total{status=~"5.."}[5m])` |
| P95 latency | `avg(last_5m):p95:trace.request.duration{service:api}` | `histogram_quantile(0.95, rate(http_request_duration_bucket[5m]))` |
| Synthetic check success | `avg(last_5m):avg:synthetics.http.response.status_code{check_id:abc}` | `avg_over_time(probe_success{job="my-check"}[5m])` |

PromQL is more verbose for histogram quantiles but more powerful for mathematical operations across label dimensions.

---

### Step 5: Pricing and Tier Differences (Factual)

This is a direct comparison, not a sales pitch. Your decision should be based on your organization's needs.

**DataDog pricing model:**
- Per synthetic test execution (DD charges per 10k test runs)
- Per custom metric (beyond included count)
- Per host for infrastructure monitoring
- Browser test executions cost more than API test executions

**Grafana Cloud pricing model:**
- Free tier includes 10,000 synthetic monitoring executions per month, 10,000 active metric series, unlimited dashboards, 50 GB logs
- k6 OSS is free forever for local execution — no execution limits
- k6 Cloud (cloud-executed load tests) has its own pricing tier
- Custom metrics in k6 count toward Prometheus/Mimir series, not separately priced per metric name

---

### Step 6: Honest Assessment — What's Different

Grafana/k6 is not better in every dimension. These are real differences you will notice:

**Where DD generally has an edge:**
- The DD UI is more polished and easier to navigate for non-technical users; Grafana's UI is more flexible but has a steeper learning curve
- DD Watchdog (automated anomaly detection) has no direct equivalent in the basic Grafana open-source stack — it requires the Grafana ML plugin, which is a Grafana Cloud paid feature
- DD's synthetic test recorder produces tests faster for non-developers than writing k6 JavaScript (though k6 Studio addresses this)
- DD has a longer track record in large-scale enterprise environments and more enterprise-focused support contracts

**Where Grafana/k6 generally has an edge:**
- k6 is fully open source (AGPL); the core will never be locked behind a paywall
- All your synthetic test scripts are plain JavaScript files you own, version, and can run anywhere
- Grafana's open-source community is larger; 3000+ dashboard templates, active plugin ecosystem
- Unified alerting across metrics, logs, traces, and synthetics in one rule engine — DD requires separate monitor types per data type
- Self-hosted option: you can run the entire Grafana stack on your own infrastructure with no licensing cost
- k6 scripting knowledge transfers directly to load testing, scripted checks, and browser tests — one skill, multiple use cases

## Expected Output

This lab has no terminal output — it is a reference and discussion lab. If you are going through this in a group setting, use this as a talking point: what from the DD workflow do you rely on most, and where does its equivalent sit in Grafana?

## Key Takeaways

- Every major DD concept has a Grafana/k6 equivalent, but the naming and configuration structure differ
- The biggest mental shift: Grafana Notification Policies decouple routing from alert rule definitions
- k6 JavaScript is the common thread across load tests, scripted checks, and browser checks — learn it once
- DD's no-code recorder and polished UI are real advantages for non-technical users; Grafana's openness and flexibility are real advantages for engineering teams
- PromQL replaces DD's metrics query language; LogQL replaces DD Log Explorer queries
- k6 OSS has no execution limits; local test runs are always free
