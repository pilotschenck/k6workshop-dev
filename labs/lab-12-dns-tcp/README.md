# Lab 12: DNS and TCP Synthetic Checks

**Time:** 15 min | **Module:** Module 2 — Grafana Cloud

## Overview

Grafana Synthetic Monitoring supports check types beyond HTTP. DNS and TCP checks cover connectivity layers that sit below the application layer — they can detect problems that HTTP checks cannot, such as a hostname that no longer resolves, a misconfigured DNS record after a CDN migration, or a database port that stopped accepting connections.

In this lab you will create a DNS check and a TCP check through the Synthetic Monitoring UI, view their results dashboards, and learn which check type to reach for in different monitoring scenarios.

## What You'll Learn

- How to create a DNS check in Synthetic Monitoring and what it measures
- How to add an assertion to a DNS check to validate expected record contents
- How to create a TCP check for a non-HTTP service
- The difference in what "response time" means for DNS vs. TCP vs. HTTP checks
- When to use each check type and how this compares to DataDog's monitoring options

## Prerequisites

- Lab 10 completed — Synthetic Monitoring agent installed and connected to Grafana Cloud
- Lab 11 completed — familiar with the SM "Add Check" workflow and results dashboard
- Access to your Grafana Cloud instance with Synthetic Monitoring enabled

## Instructions

### Step 1: Create a DNS Check

DNS checks verify that a hostname resolves to the expected records. They are distinct from HTTP checks — no HTTP request is made. The check simply queries a DNS server and evaluates the response.

In your Grafana Cloud instance, navigate to **Synthetic Monitoring** in the left sidebar.

Click **Add Check**, then select **DNS** from the check type menu.

Fill in the check configuration:

| Field | Value |
|---|---|
| Job name | `DNS Resolution Check` |
| Target hostname | `grafana.com` |
| Record type | `A` |
| Frequency | `5 minutes` |
| Timeout | `10s` |

Under **Probe locations**, select at least 3 locations spread across different regions (for example: US East, EU West, Asia Pacific). Using multiple locations helps distinguish a global DNS outage from a regional propagation issue.

Leave all other settings at their defaults for now. Click **Save** to create the check.

Once saved, click **Test** (or **Run now**) to trigger an immediate execution rather than waiting for the next scheduled interval. This confirms the check is configured correctly.

**Why DNS checks matter:** After a DNS change — migrating to a new CDN, changing nameservers, or updating A records — DNS propagation can take minutes to hours and is uneven across geographic regions. A DNS check running from multiple probe locations gives you real-time visibility into whether your change has propagated globally. DNS checks also detect DNS hijacking, where a hostname resolves to an unexpected IP address.

### Step 2: View DNS Check Results

After the immediate test completes (or after the first scheduled run), click on the check name to open its results dashboard.

The results page for a DNS check shows:

- **Reachability** — percentage of check executions that succeeded (the hostname resolved)
- **Resolution time** — how long the DNS lookup took, broken down by probe location. This is pure DNS lookup latency, not HTTP connection time or response time.
- **Response by probe** — a table showing each probe location's result, resolution time, and whether assertions passed

Key things to notice:

- Resolution time is typically in the 5–50ms range for well-known hostnames with geographically distributed nameservers
- Resolution time varies by probe location — a probe in Singapore querying a US-based nameserver will be slower than one in Virginia
- If a probe shows "No data" or a failed result after running immediately, check that your SM agent is connected (Synthetic Monitoring > Probes)

The **Logs** tab shows the raw output from each probe execution, which is useful when troubleshooting a specific failure.

### Step 3: Configure a DNS Assertion

Assertions allow you to validate that the DNS response contains what you expect, not just that the lookup succeeded.

Go back to the check configuration by clicking **Edit** on the DNS Resolution Check.

Scroll to the **Assertions** section and click **Add assertion**.

Add the following assertion:

| Field | Value |
|---|---|
| Assertion type | `Response matches` |
| Subject | `Answer` |
| Condition | `contains` |
| Value | `grafana.com` |

This asserts that the DNS answer section contains a record for `grafana.com`. For production use you would typically assert that the answer contains a specific expected IP or IP range to detect DNS hijacking or accidental record deletion.

Click **Save** to update the check.

**Practical example:** After migrating a service to a new IP range (say, moving to a cloud provider's load balancer), you can add an assertion that the A record resolves to an IP in the new range. If someone accidentally reverts the DNS change, the assertion fails and you get an alert before users notice.

### Step 4: Create a TCP Check

TCP checks verify that a port is open and accepting connections. No application-layer communication happens — the check measures only whether a TCP handshake completes successfully.

Click **Add Check** and select **TCP**.

Fill in the configuration:

| Field | Value |
|---|---|
| Job name | `TCP Port Check` |
| Target | `grafana.com:443` |
| Frequency | `5 minutes` |
| Timeout | `10s` |
| TLS | Enabled |

Enable **TLS** because port 443 uses TLS. When TLS is enabled, the check performs the TCP handshake and then the TLS handshake, and reports both durations separately.

Under **Probe locations**, select 2–3 locations.

Click **Save**, then click **Test** to run immediately.

**Why TCP checks matter:** Many critical infrastructure components are not HTTP services. Databases (PostgreSQL on 5432, MySQL on 3306), message brokers (Kafka on 9092, RabbitMQ on 5672), caches (Redis on 6379), and mail servers (SMTP on 25/587) all expose TCP ports. HTTP monitors cannot test these. A TCP check answers the question "is this port open and accepting connections?" without needing to know the application protocol.

For monitoring databases in particular, a TCP check provides an early warning that a database server is unreachable before your application logs start filling with connection errors.

### Step 5: View TCP Check Results

Open the TCP Port Check results dashboard.

The TCP results page shows:

- **Reachability** — percentage of executions where the TCP connection succeeded
- **Connection time** — time to complete the TCP three-way handshake (SYN, SYN-ACK, ACK)
- **TLS handshake time** — (when TLS is enabled) time to negotiate the TLS session after the TCP connection
- **Total probe duration** — TCP + TLS handshake combined

For `grafana.com:443` from a well-connected probe location you should see:
- TCP connection time in the 20–150ms range (depending on geographic distance)
- TLS handshake time in the 30–200ms range
- Total duration under 500ms

Unusually high connection times from a specific probe location can indicate network-level problems (routing issues, packet loss) rather than application-level problems.

## When to Use Each Check Type

| Scenario | Best Check Type |
|---|---|
| Web pages and REST APIs | HTTP |
| Verifying a multi-step user flow (login, browse, checkout) | HTTP Scripted (Lab 13) |
| Hostname resolution after a DNS change | DNS |
| Detecting DNS hijacking or unexpected record changes | DNS with assertions |
| Non-HTTP services: databases, Redis, Kafka, SMTP | TCP |
| Verifying a port is open on a specific host | TCP |
| TLS certificate validity on a non-HTTP port | TCP with TLS enabled |

A complete monitoring strategy for a production service typically uses all three check types together: an HTTP check on the public endpoint, a DNS check on the hostname, and TCP checks on any non-HTTP backend services the application depends on.

## Comparison with DataDog

If you are coming from DataDog, here is how these check types map:

| DataDog | Grafana SM Equivalent |
|---|---|
| API Test (HTTP) | SM HTTP check |
| Multistep API Test | SM Scripted check (Lab 13) |
| TCP Test | SM TCP check |
| No direct equivalent at standard tiers | SM DNS check |

DataDog's Network Performance Monitoring covers service-to-service communication but is focused on internal network flow analysis rather than external synthetic monitoring. DataDog does not offer a dedicated DNS check type at most pricing tiers — you would have to use a scripted API test that runs a `dig` command or similar, which is more complex to set up and maintain.

SM's DNS check is a genuine differentiator: it is a first-class check type with purpose-built results dashboards, multi-location support, and assertions — all included in the standard Synthetic Monitoring feature set.

## Expected Output

After both checks are saved and have run at least once, your Synthetic Monitoring checks list should show:

```
DNS Resolution Check    DNS     grafana.com         100%    3 probes    5m
TCP Port Check          TCP     grafana.com:443     100%    3 probes    5m
```

Both checks should show green (100% reachability) since `grafana.com` is a well-maintained production service.

If you see a failed probe result, common causes are:
- SM agent is not running or not connected (check Synthetic Monitoring > Probes)
- The probe location you selected is temporarily having network issues (try switching to a different location)
- A typo in the target hostname or port number

## Key Takeaways

- DNS and TCP checks cover infrastructure layers below HTTP and are essential for a complete monitoring strategy
- DNS check "response time" is DNS resolution latency — not HTTP latency; comparing the two directly is meaningless
- TCP checks work for any TCP-based service, making them the only synthetic option for databases, message brokers, and other non-HTTP infrastructure
- Running checks from multiple probe locations is critical for detecting regional issues vs. global outages
- SM's DNS check type has no direct DataDog equivalent at standard pricing tiers — it is a differentiating feature of Grafana Synthetic Monitoring
