# Lab 00: Environment Setup and Verification

**Time:** 15 min | **Module:** Pre-Lab

## Overview
Get your local workshop environment running and verify that all services are healthy before starting the labs. This lab ensures everyone starts from the same working baseline.

## What You'll Learn
- How to start the workshop infrastructure with Docker Compose
- How to verify each service is healthy
- How to install k6 on your operating system
- How to run a basic k6 smoke check

## Prerequisites
- Docker Desktop (or Docker Engine + Compose plugin) installed
- Terminal access
- Internet access for k6 installation (or k6 pre-installed)

## Instructions

### Step 1: Verify Docker is Running

```bash
docker info
```

You should see system information without any error. If you see `Cannot connect to the Docker daemon`, start Docker Desktop and wait for it to be ready.

### Step 2: Start All Services

From the root of the workshop repository:

```bash
cd infra && docker compose up -d
```

This starts the following services:
- **demo-app** — the target application (port 3000)
- **broken-app** — intentionally misconfigured app used in threshold labs (port 3001)
- **httpbin** — HTTP testing utility (port 8080)
- **WireMock** — mock API server (port 8888)
- **InfluxDB** — time-series database for k6 metrics (port 8086)
- **Grafana** — dashboards for visualizing results (port 3030)
- **Prometheus** — metrics scraping backend (port 9090)
- **Alloy** — Grafana's telemetry pipeline; receives OTLP traces and forwards to Tempo (ports 4317, 4318 ingest; UI on port 12345)
- **Tempo** — distributed trace backend; query traces via Grafana Explore (port 3200)
- **ws-echo** — WebSocket echo server used in lab 21 (port 8765)

### Step 3: Wait for Healthy Status

```bash
docker compose ps
```

Wait until all services show `healthy` or `running` in the `STATUS` column. If a service shows `starting`, wait 10–15 seconds and run the command again.

### Step 4: Verify Each Service

Run these curl commands to confirm each service responds:

**demo-app** (port 3000):
```bash
curl -s http://localhost:3000/health
```
Expected: `{"status":"ok"}`

**broken-app** (port 3001):
```bash
curl -s http://localhost:3001/health
```
Expected: a slow or error response (this is intentional)

**InfluxDB** (port 8086):
```bash
curl -s http://localhost:8086/ping
```
Expected: HTTP 204 (empty body, no error)

**Grafana** (port 3030):
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3030/api/health
```
Expected: `200`

**Prometheus** (port 9090):
```bash
curl -s http://localhost:9090/-/healthy
```
Expected: `Prometheus Server is Healthy.`

**Alloy UI** (port 12345):
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:12345/
```
Expected: `200`

**WebSocket echo** (port 8765):
```bash
curl -s http://localhost:8765
```
Expected: a plain-text response (the echo server also accepts HTTP requests)

### Step 5: Install k6

Skip this step if `k6 version` already returns a version number.

**macOS (Homebrew):**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

**Windows (winget):**
```powershell
winget install k6 --source winget
```

Verify the installation:
```bash
k6 version
```

### Step 6: Run the Smoke Check

From the repository root:

```bash
k6 run scripts/smoke-check.js
```

This script makes a single request to the demo-app and verifies the response is healthy. It should complete in a few seconds with no errors.

### Step 7: Open Grafana

Open your browser and navigate to:

```
http://localhost:3030
```

Default credentials: **admin / admin** (you may be prompted to change the password — you can skip this for the workshop).

Browse to the **k6 dashboard** to confirm it loaded. You will use this throughout the workshop to visualize test results.

## Expected Output

After running the smoke check you should see output similar to:

```
          /\      |‾‾| /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / __________ \  |__| \__\ \_____/ .io

  execution: local
     script: scripts/smoke-check.js
     output: -

  scenarios: (100.00%) 1 scenario, 1 max VUs, 30s max duration
           * default: 1 looping VUs for 10s (gracefulStop: 30s)

  ✓ status is 200

  checks.........................: 100.00% ✓ 1 ✗ 0
  http_req_duration..............: avg=Xms ...
```

All services healthy, smoke check passes with 100% checks, and Grafana dashboard loads.

## Key Takeaways
- Docker Compose manages the entire workshop infrastructure as a single unit
- k6 is a single binary with no runtime dependencies — install once and run anywhere
- The demo-app (port 3000) is the primary target; broken-app (port 3001) is used to intentionally trigger failures
- Grafana at port 3030 (not 3000) is your observability dashboard throughout the workshop
