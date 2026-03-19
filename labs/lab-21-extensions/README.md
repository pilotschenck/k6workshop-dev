# Lab 21: k6 Extensions and the xk6 Ecosystem

**Time:** 20 min | **Module:** Module 3 — Advanced

## Overview

k6 is extensible via the **xk6** (extend k6) build system. Extensions add capabilities beyond HTTP: WebSockets, gRPC, Redis, SQL, Kafka, browser automation, and more. Some extensions ship directly with the official k6 binary as "experimental" built-ins — no custom build needed. Others require compiling a custom k6 binary with xk6 before you can use them.

This lab explores both paths. You will run a WebSocket test using an experimental built-in module, then learn how the xk6 build system works for community extensions.

> **DataDog comparison:** DataDog Synthetic Monitoring supports HTTP, Browser, TCP, DNS, gRPC, and Multistep API tests — a fixed, vendor-controlled list of protocols. k6's extension model lets you test any protocol (Kafka, Redis, SQL, custom binary protocols) by adding an extension. DataDog's load testing product (Synthetic Load Testing) is even more limited in protocol support. With k6 you own the capability roadmap.

## What You'll Learn

- Which experimental modules ship built into the official k6 binary
- How to write a WebSocket test using `k6/experimental/websockets`
- How the xk6 build system compiles custom k6 binaries with community extensions
- Where to find and evaluate community extensions
- When to reach for a built-in experimental module vs. a community xk6 extension

## Prerequisites

- Lab 01 completed — k6 installed and demo-app running at http://localhost:3000
- Familiarity with k6 checks and metrics (Labs 02–04)

## Instructions

### Step 1: Experimental Built-ins — Extensions With No Build Required

The official k6 binary ships with several experimental modules. They are called "experimental" because their APIs may stabilise and move to a non-experimental import path in a future release — not because they are unstable in practice. They are safe to use today.

| Module | Purpose |
|--------|---------|
| `k6/experimental/browser` | Real browser automation (Chromium) |
| `k6/experimental/tracing` | Distributed trace context injection |
| `k6/experimental/redis` | Redis client |
| `k6/experimental/websockets` | WebSocket client (W3C-compatible API) |
| `k6/experimental/grpc` | gRPC client (now stable as `k6/net/grpc`) |
| `k6/experimental/streams` | Server-Sent Events (SSE) streams |

Import any of these at the top of your script and k6 resolves them without any extra setup:

```javascript
import { WebSocket } from 'k6/experimental/websockets';
```

If you import a module that does not exist — either a typo or a community extension you have not built in — k6 exits immediately with:

```
ERRO[0000] The moduleSpecifier "k6/experimental/nonexistent" could not be resolved
```

### Step 2: WebSocket Test With a Built-in Experimental Module

Open the starter script:

```javascript
// scripts/starters/lab-21-starter.js
import { WebSocket } from 'k6/experimental/websockets';
import { sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '15s',
};

export default function () {
  const ws = new WebSocket('ws://localhost:8765');

  ws.onopen = () => {
    ws.send('hello from k6');
  };

  ws.onmessage = (event) => {
    console.log('received:', event.data);
    ws.close();
  };

  ws.onerror = (error) => {
    console.error('ws error:', error.error());
  };

  sleep(2);
}
```

The `ws-echo` service (powered by `jmalloc/echo-server`) runs at `ws://localhost:8765`. It echoes every WebSocket message frame back unchanged — useful for protocol-level testing without needing a real backend.

Run the starter:

```bash
k6 run scripts/starters/lab-21-starter.js
```

Watch the console output. Each iteration sends one message and logs the echoed reply before closing the connection.

> **Verify the service is running:** `curl -s http://localhost:8765` should return a brief response. If the ws-echo container isn't up, run `docker compose -f infra/docker-compose.yml up -d ws-echo`.

### Step 3: The xk6 Build System

For extensions not shipped with the official binary, you need the **xk6** tool. xk6 downloads the k6 source code plus any requested extensions and compiles them into a single custom binary.

The workflow in three commands:

```bash
# 1. Install xk6 (requires Go 1.21+)
go install go.k6.io/xk6/cmd/xk6@latest

# 2. Build a custom k6 binary with one or more extensions baked in
xk6 build --with github.com/grafana/xk6-sql@latest

# 3. Run tests with the custom binary (note the ./k6 prefix, not the system k6)
./k6 run my-sql-test.js
```

Key points:

- The resulting `./k6` binary in your working directory replaces (for that test) the system-installed k6
- You can add multiple `--with` flags to bundle several extensions at once
- Pin to a specific version (e.g., `@v0.3.0`) for reproducible builds in CI
- Grafana maintains a small set of "official" extensions; community extensions vary in quality and maintenance cadence

> **Note:** The workshop workstation does not have Go installed, so you cannot run xk6 here. The commands above are for reference — you will use them in your own environment after the workshop.

### Step 4: Finding Extensions

The extension catalog lives at **https://k6.io/docs/extensions/explore/**. It is searchable and filterable by category:

| Category | Example extensions |
|----------|--------------------|
| Data formats | xk6-faker (synthetic test data), xk6-csv |
| Messaging | xk6-kafka, xk6-amqp |
| Databases | xk6-sql (MySQL, PostgreSQL, SQLite), xk6-redis (alternative client) |
| Protocols | xk6-grpc-web, xk6-stomp, xk6-ssh |
| Utilities | xk6-dashboard (live HTML report), xk6-timers |

Before reaching for a community extension, check:

1. When was the last commit? (stale = risk)
2. Does it have tests and a maintained README?
3. Is there a Grafana-maintained equivalent? (prefer official)

### Step 5: When to Use Built-ins vs. Community Extensions

| Situation | Recommendation |
|-----------|---------------|
| Testing WebSockets, gRPC, browser flows | Use experimental built-ins — no custom build, no maintenance overhead |
| Testing Kafka producers/consumers | Use `xk6-kafka` — no built-in alternative exists |
| Testing SQL query performance | Use `xk6-sql` — no built-in alternative exists |
| Using a niche community extension in CI | Pin to a specific version; add the `xk6 build` step to your pipeline |
| Evaluating an unknown extension | Check GitHub stars, last commit date, and whether Grafana Labs contributed |

### Step 6: Run the Solution Script

The solution extends the starter with a message counter, multiple send/receive cycles, and a check verifying the echo matches the sent content:

```bash
k6 run scripts/solutions/lab-21-solution.js
```

Review the output. Notice:

- A custom `Counter` metric (`ws_messages_received`) appears in the end-of-test summary alongside the standard `http_req_*` metrics — the same extensibility that applies to protocol modules applies to metrics
- The check `echo matches sent message` verifies protocol correctness, not just connectivity
- The test completes multiple WebSocket connections per VU across the 15-second run

## Expected Output

Running the starter with 1 VU:

```
  execution: local
     script: scripts/starters/lab-21-starter.js
     output: -

INFO[0001] received: hello from k6  source=console
INFO[0003] received: hello from k6  source=console
INFO[0005] received: hello from k6  source=console

     iterations.....................: 7      0.46/s
     vus............................: 1      min=1  max=1
```

You should see "received: hello from k6" logged for every iteration — one echo per WebSocket connection opened.

## Key Takeaways

- Experimental built-in modules (browser, WebSockets, tracing, Redis, streams) require no custom build and are ready to use in any k6 test today
- xk6 compiles a custom k6 binary by combining the k6 core with one or more community extensions — the workflow is straightforward but requires Go
- The extension catalog at k6.io/docs/extensions/explore lists community extensions by category; prefer Grafana-maintained extensions where available
- k6's open extension model means any protocol or data store can be load tested — this is a fundamental architectural advantage over tools with fixed protocol support
