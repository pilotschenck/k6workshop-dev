# Lab 25: Private Probes — Monitoring Internal Services

**Time:** 25 min | **Module:** Module 3 — Advanced

## Overview

Grafana Synthetic Monitoring's public probes run from Grafana's global cloud network. They are great for monitoring anything on the public internet, but they cannot reach services that are not exposed externally — staging environments, internal APIs, and services that sit behind a firewall or VPN.

Private probes solve this. A private probe is a lightweight agent (`grafana/synthetic-monitoring-agent`) that you deploy inside your own network. It polls Synthetic Monitoring for check definitions, executes the checks locally, and sends results back to Grafana Cloud over outbound HTTPS. Your internal services are never exposed to the internet, and you do not need to open any inbound firewall ports.

In this lab you will deploy a private probe using Docker, register it with your Grafana Cloud account, and use it to monitor the local demo-app — a service that the public cloud probes cannot reach.

If you came from Datadog: DD Private Locations and SM Private Probes serve the same purpose. Key differences: SM private probes require only outbound HTTPS (no inbound ports, no extra agent configuration for proxies); the `grafana/synthetic-monitoring-agent` image is approximately 50 MB; and probe results appear in the same Grafana dashboards as your public probe checks. DD private location agents tend to be heavier and often require additional enterprise configuration.

## What You'll Learn

- How private probe architecture works (poll model, outbound-only)
- How to register a private probe in Grafana Cloud and obtain an access token
- How to configure and start the probe agent in Docker
- How to join the probe to the existing Docker network so it can reach the demo-app
- How to create a Synthetic Monitoring check that uses only your private probe
- How to observe failure detection when the monitored service goes down

## Prerequisites

- Lab 10 completed — Synthetic Monitoring plugin enabled in your Grafana Cloud account
- Grafana Cloud account with Synthetic Monitoring enabled
- Docker running on this workstation (`docker ps` should succeed without errors)
- Demo-app running at http://localhost:3000

## Instructions

### Step 1: Understand the Private Probe Architecture

Before touching any configuration, understand how the pieces fit together:

```
Your network                           Grafana Cloud
┌──────────────────────────────┐      ┌──────────────────────────────┐
│                              │      │                              │
│  demo-app (localhost:3000)   │      │  Synthetic Monitoring        │
│          ▲                   │      │  (check definitions,         │
│          │ HTTP check        │      │   result storage)            │
│          │                   │      │          │                   │
│  private-probe container ────┼──────┼──► HTTPS (outbound only)     │
│  (synthetic-monitoring-agent)│      │                              │
└──────────────────────────────┘      └──────────────────────────────┘
```

Key properties of this model:
- The probe **polls** SM for new or updated check definitions — SM does not push to the probe
- All traffic from probe to Grafana Cloud is **outbound HTTPS on port 443** — no inbound firewall rules needed
- The probe executes checks **locally**, so it can reach services that have no public IP
- Results (pass/fail, latency, error messages) are reported back to Grafana Cloud and appear in the standard SM dashboards

### Step 2: Register a Private Probe in Grafana Cloud

You need to tell Grafana Cloud that a new probe exists before starting the container. This step generates the access token the probe uses to authenticate.

1. Log in to your Grafana Cloud account at https://grafana.com.
2. Navigate to your stack, then go to **Synthetic Monitoring** in the left nav (or via the main menu > Observability > Synthetics).
3. Click **Probes** in the SM navigation.
4. Click **Add Private Probe**.
5. Fill in the probe details:
   - **Name:** `workshop-local`
   - **Latitude / Longitude:** these are optional metadata fields; leave them at defaults or set to your approximate location
   - **Labels:** optionally add `env=workshop` for filtering
6. Click **Save**.

After saving, Grafana Cloud displays the **SM_ACCESS_TOKEN** for this probe. This is the only time the token will be shown in full.

**Copy the token now and keep it in your clipboard or a temporary text file.** You will paste it into the docker-compose file in the next step.

> If you miss the token, you will need to delete the probe and create a new one — the token cannot be retrieved after this screen is dismissed.

### Step 3: Configure the Private Probe docker-compose

The probe configuration file is already in place at `infra/private-probe/docker-compose.yml`. You need to:
1. Insert your access token
2. Add network configuration so the probe container can reach the demo-app container

Open the file in your editor:

```bash
nano infra/private-probe/docker-compose.yml
```

Replace the entire contents with the following, substituting your actual token for `your-token-here`:

```yaml
version: "3.8"

services:
  private-probe:
    image: grafana/synthetic-monitoring-agent:latest
    environment:
      SM_ACCESS_TOKEN: "your-token-here"
      SM_API_SERVER_ADDRESS: "https://synthetic-monitoring-api.grafana.net"
    networks:
      - k6workshop
    restart: unless-stopped

networks:
  k6workshop:
    external: true
```

**Why the network configuration?**

The demo-app runs in a Docker network called `k6workshop` (created by the main infra docker-compose). The private probe container starts in its own isolated network by default, so it cannot resolve the hostname `demo-app` or reach `localhost:3000` as a container hostname.

By joining the `k6workshop` network (`external: true` tells Compose the network already exists and should not be created), the probe container shares the same network as demo-app and can reach it by container name.

Save the file after making your edits.

### Step 4: Start the Private Probe

Start the probe container in the background:

```bash
docker compose -f infra/private-probe/docker-compose.yml up -d
```

Verify the container is running:

```bash
docker compose -f infra/private-probe/docker-compose.yml ps
```

You should see `private-probe` with status `Up`.

Check the container logs to confirm it successfully connected to the Synthetic Monitoring API:

```bash
docker logs $(docker ps -qf name=private-probe) 2>&1 | tail -20
```

Look for log lines similar to:
```
level=info msg="connected to synthetic monitoring API"
level=info msg="registered probe" probe=workshop-local
```

If you see connection errors or authentication failures, double-check that:
- The `SM_ACCESS_TOKEN` value is correct and has no extra spaces or quotes
- Your workstation has outbound HTTPS access on port 443
- The Grafana Cloud region in `SM_API_SERVER_ADDRESS` matches your stack's region (the default `synthetic-monitoring-api.grafana.net` works for most stacks)

### Step 5: Verify the Probe Appears as Online in SM

Return to your Grafana Cloud account:

1. Navigate to Synthetic Monitoring > Probes.
2. You should see `workshop-local` in the probe list with a status of **Online**.

If the probe shows as **Offline** after 30 seconds, re-check the logs from Step 4. A common cause is a typo in the token.

The probe is now registered and ready to execute checks. It will poll SM every few seconds for new check assignments.

### Step 6: Create a Check Using the Private Probe

Now create an HTTP check that runs exclusively on your private probe:

1. In Synthetic Monitoring, click **Add Check**.
2. Select check type: **HTTP**.
3. Fill in the check settings:
   - **Job name:** `demo-app-internal`
   - **URL:** `http://demo-app:3000/`

     > Use the Docker container hostname `demo-app`, not `localhost`. The probe runs inside Docker on the `k6workshop` network, so `demo-app` resolves to the correct container. `localhost` would resolve to the probe container itself.

   - **Probe locations:** click the locations list and **uncheck all public probes**, then select **workshop-local** only.
   - **Frequency:** 1 minute (the minimum for free-tier accounts)
   - **Timeout:** 5 seconds

4. Expand **Assertions** and add:
   - Assertion type: **Status code**
   - Condition: **equals**
   - Value: `200`

5. Click **Save**.

The check is now active. The private probe will pick up the check definition within seconds and begin executing it.

### Step 7: View Check Results

Navigate to Synthetic Monitoring > Checks. Click on `demo-app-internal` to open the check detail view.

Within 1-2 minutes you should see:
- **Uptime:** 100%
- **Reachability:** the probe is successfully reaching the demo-app
- **Latency graph:** request duration from the probe's perspective (will be very low — sub-millisecond — since both containers are on the same host)
- **Probe:** `workshop-local` listed as the source of results

This confirms the full path: private probe → demo-app → results reported to Grafana Cloud → visible in SM dashboards.

### Step 8: Test Failure Detection

One of the core values of synthetic monitoring is alerting when services go down. Test that the private probe correctly detects a failure.

Stop the demo-app container:

```bash
docker compose -f infra/docker-compose.yml stop demo-app
```

Wait 1-2 minutes (the probe runs checks on the configured 1-minute frequency). Then return to Synthetic Monitoring > Checks and observe:

- The `demo-app-internal` check status changes to **Down** (shown in red)
- The uptime percentage drops
- If you configured alerting (Lab 22), an alert fires

Now bring the demo-app back up:

```bash
docker compose -f infra/docker-compose.yml start demo-app
```

Wait another 1-2 minutes and watch the check recover to **Up**. The latency graph will show the gap where the service was unreachable.

> **Private probe advantage:** public cloud probes would never have detected this failure because demo-app is not exposed to the internet. The private probe monitored an internal service that is invisible to every external observer.

## Expected Output

After the probe connects and the check has been running for a few minutes, the SM check detail page should show:

```
Job:        demo-app-internal
URL:        http://demo-app:3000/
Probes:     workshop-local
Uptime:     100%
P50 latency: ~1ms
P95 latency: ~3ms
```

During the failure simulation (Step 8), the uptime graph will show a red band corresponding to the time demo-app was stopped, and the probe log will show connection refused errors.

## Key Takeaways

- Private probes let SM monitor services that are not exposed to the public internet — staging environments, internal APIs, and local services are all fair game
- The probe uses an outbound-only poll model: no inbound firewall ports are required, making it easy to deploy in locked-down environments
- When probe and target are in different Docker networks, join them explicitly — using the container hostname (`demo-app`) instead of `localhost` is required from inside Docker
- The `SM_ACCESS_TOKEN` is shown only once at probe registration — copy it immediately
- Probe results appear in the same SM dashboards as public probe checks, so you get a unified view of internal and external service health
- Compared to Datadog Private Locations, SM private probes are lighter (~50 MB image), require no inbound connectivity, and report into the same Grafana observability platform as your metrics and logs
