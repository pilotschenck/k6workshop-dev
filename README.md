# k6 + Grafana Synthetic Monitoring Workshop

A one-day hands-on workshop covering k6 load testing and Grafana Synthetic Monitoring. Participants will build and run performance tests from first principles, then integrate with Grafana Cloud for observability and synthetic checks.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Docker + Docker Compose | Used to run the local Grafana + InfluxDB stack |
| k6 | [k6.io/docs/get-started/installation](https://k6.io/docs/get-started/installation) |
| Grafana Cloud free tier account | Required for Lab 09 (k6 Cloud Run) and all subsequent labs |

---

## Quick Start

```bash
# Start the local observability stack
cd infra && docker compose up -d

# Run the smoke check to verify everything is working
k6 run scripts/smoke-check.js
```

Grafana dashboard: [http://localhost:3030](http://localhost:3030)

---

## Testing Lab Solutions

An automated test harness is available to validate all lab solution scripts:

```bash
# Run all tests (start infrastructure, run tests, stop infrastructure)
./test-labs.sh --start-infra --stop-infra

# List all available tests
./test-labs.sh --list

# Run specific labs only
./test-labs.sh --filter="lab-0[1-5]"

# Run with verbose output for debugging
./test-labs.sh --verbose
```

See **[TESTING.md](TESTING.md)** for complete documentation on the test harness, CI/CD integration, and troubleshooting.

---

## Module Overview

### Getting Started

| Module | Labs | Description |
|---|---|---|
| 00 — Setup and Environment | Lab 00 | Pre-lab environment preparation, Docker services, and smoke check |

### Module 1: k6 Load Testing Fundamentals

| Module | Labs | Description |
|---|---|---|
| 01 — k6 Fundamentals | Lab 01 | VUs, duration, iterations, and reading test output |
| 02 — HTTP Testing, Checks & Thresholds | Lab 02 | Response validation with checks, pass/fail thresholds, exit codes |
| 03 — Load Profiles and Stages | Lab 03 | Ramping stages, spike/soak patterns, open vs closed models |

### Module 2: Advanced k6 Scripting

| Module | Labs | Description |
|---|---|---|
| 04 — Advanced Scripting | Labs 04–05 | Groups, tags, custom metrics, parameterization, SharedArray |
| 05 — Local Observability | Labs 06–07 | InfluxDB and Prometheus output, real-time Grafana dashboards |
| 06 — Cloud Integration | Labs 08–09 | JSON output, handleSummary, k6 Cloud run |

### Module 3: Grafana Synthetic Monitoring

| Module | Labs | Description |
|---|---|---|
| 07 — Synthetic Monitoring Basics | Labs 10–13 | HTTP, DNS, TCP checks and multi-step workflow checks |
| 08 — Browser Testing | Labs 14–18 | k6 browser module, mixed HTTP+browser tests, OpenTelemetry tracing |
| 09 — Synthetic Advanced Features | Labs 19–23 | Structured logging, custom metrics, extensions, alerting, SLOs |

### Module 4: Production Integration

| Module | Labs | Description |
|---|---|---|
| 10 — Observability Integration | Labs 24–25 | k6 Studio for recording journeys, private probes |
| 11 — DataDog Migration | Labs 26–28 | Concept mapping, migrating DD synthetic tests and monitors |
| 12 — Capstone Project | Lab 29 | End-to-end observability: load testing, SM, SLOs, and alerting |

---

## Lab Listing

| # | Title | Module |
|---|---|---|
| 00 | Environment Setup and Verification | 00 — Setup |
| 01 | Your First k6 Test | 01 — k6 Fundamentals |
| 02 | HTTP Checks and Thresholds | 02 — HTTP Testing |
| 03 | VU Stages and Load Profiles | 03 — Load Profiles |
| 04 | Groups, Tags, and Custom Metrics | 04 — Advanced Scripting |
| 05 | Parameterization and Data-Driven Tests | 04 — Advanced Scripting |
| 06 | Streaming Results to InfluxDB + Grafana | 05 — Local Observability |
| 07 | Prometheus Remote Write Output | 05 — Local Observability |
| 08 | JSON Output and CLI Result Analysis | 06 — Cloud Integration |
| 09 | k6 Cloud Run | 06 — Cloud Integration |
| 10 | Grafana Synthetic Monitoring — Introduction | 07 — SM Basics |
| 11 | HTTP Availability Checks | 07 — SM Basics |
| 12 | DNS and TCP Synthetic Checks | 07 — SM Basics |
| 13 | Multi-Step Workflow Checks (Scripted Checks) | 07 — SM Basics |
| 14 | k6 Browser — Intro and Page Navigation | 08 — Browser Testing |
| 15 | Browser Interactions — Forms, Clicks, and Waits | 08 — Browser Testing |
| 16 | Browser + HTTP Mixed Testing | 08 — Browser Testing |
| 17 | Browser Synthetic Checks in Grafana SM | 08 — Browser Testing |
| 18 | OpenTelemetry Tracing with k6 | 08 — Browser Testing |
| 19 | Structured Logging in k6 Tests | 09 — SM Advanced |
| 20 | Custom Metrics — Counter, Gauge, Rate, and Trend | 09 — SM Advanced |
| 21 | k6 Extensions and the xk6 Ecosystem | 09 — SM Advanced |
| 22 | Alerting on Synthetic Monitoring Results | 09 — SM Advanced |
| 23 | SLOs and Error Budgets | 09 — SM Advanced |
| 24 | k6 Studio — Recording User Journeys | 10 — Observability Integration |
| 25 | Private Probes — Monitoring Internal Services | 10 — Observability Integration |
| 26 | DataDog to Grafana — Concept Mapping | 11 — DD Migration |
| 27 | Migrating DataDog Synthetic Tests to k6 | 11 — DD Migration |
| 28 | Migrating DataDog Monitors to Grafana Alerting | 11 — DD Migration |
| 29 | Capstone — End-to-End Observability | 12 — Capstone |

---

## Directory Structure

```
k6workshop-dev/
├── README.md                   # This file
├── pre-lab/
│   └── README.md               # Environment setup instructions
├── infra/
│   ├── docker-compose.yml      # Grafana + InfluxDB local stack
│   └── grafana/
│       └── provisioning/
│           ├── dashboards/     # Pre-built Grafana dashboard JSON files
│           └── datasources/    # InfluxDB datasource configuration
├── scripts/
│   └── smoke-check.js          # Quick verification script
├── docs/
│   ├── index.html              # Slide deck table of contents
│   ├── 00_Setup_and_Environment/
│   ├── 01_k6_Fundamentals/
│   ...
│   └── 12_Capstone_Project/
└── labs/
    ├── lab-00-setup/
    │   ├── README.md
    │   └── solution/
    ├── lab-01-first-test/
    ...
    └── lab-29-capstone/
```
