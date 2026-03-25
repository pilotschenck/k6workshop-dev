# k6 + Grafana Synthetic Monitoring Workshop

A one-day hands-on workshop covering k6 load testing and Grafana Synthetic Monitoring. Participants will build and run performance tests from first principles, then integrate with Grafana Cloud for observability and synthetic checks.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Docker + Docker Compose | Used to run the local Grafana + InfluxDB stack |
| k6 | [k6.io/docs/get-started/installation](https://k6.io/docs/get-started/installation) |
| Grafana Cloud free tier account | Required for labs 09 and later |

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

| # | Module | Description |
|---|---|---|
| 1 | k6 Fundamentals | Core concepts, script structure, and running your first test |
| 2 | HTTP Testing | Making HTTP requests, handling responses, and assertions |
| 3 | Load Profiles | Virtual users, ramping stages, and execution models |
| 4 | Checks & Thresholds | Pass/fail criteria, SLO enforcement, and test gates |
| 5 | Advanced Scripting | Parameterization, data-driven tests, and script reuse |
| 6 | Observability | Exporting metrics to InfluxDB and visualizing in Grafana |
| 7 | Synthetic Monitoring | Grafana Cloud Synthetic Monitoring, browser checks, and alerting |

---

## Lab Listing

| # | Title | Time |
|---|---|---|
| 01 | Your First k6 Script | 10 min |
| 02 | Making HTTP Requests | 10 min |
| 03 | Checks and Assertions | 10 min |
| 04 | Thresholds and Pass/Fail | 10 min |
| 05 | Virtual Users and Duration | 10 min |
| 06 | Ramping Stages | 15 min |
| 07 | Open vs Closed Models | 15 min |
| 08 | Executors Deep Dive | 15 min |
| 09 | Parameterizing Requests | 10 min |
| 10 | Data-Driven Tests with CSV | 15 min |
| 11 | Script Organization and Modules | 15 min |
| 12 | Environment Variables | 10 min |
| 13 | Test Lifecycle Hooks | 10 min |
| 14 | Groups and Tags | 10 min |
| 15 | Custom Metrics | 15 min |
| 16 | InfluxDB Output | 15 min |
| 17 | Grafana Dashboards | 15 min |
| 18 | Correlating k6 and App Metrics | 20 min |
| 19 | Introduction to Grafana Cloud | 10 min |
| 20 | k6 Cloud Integration | 15 min |
| 21 | Synthetic Monitoring Basics | 15 min |
| 22 | HTTP Synthetic Checks | 15 min |
| 23 | Multi-step Synthetic Checks | 20 min |
| 24 | Browser-based Checks | 20 min |
| 25 | Alerting on Synthetic Results | 15 min |
| 26 | Private Probes | 20 min |
| 27 | SLOs and Error Budgets | 20 min |
| 28 | Combining Load and Synthetic Tests | 20 min |
| 29 | CI/CD Integration | 20 min |
| 30 | Capstone: End-to-End Observability | 30 min |

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
└── labs/
    ├── lab-01/
    │   ├── README.md
    │   └── solution/
    ├── lab-02/
    ...
    └── lab-30/
```
