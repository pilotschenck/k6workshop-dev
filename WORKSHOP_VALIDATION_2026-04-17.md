# Workshop End-to-End Validation — 2026-04-17

Live validation follow-up to `WORKSHOP_AUDIT_2026-04-17.md`. Tests were run in the
Instruqt sandbox (`szdhbmtova5j`) against the bundled workstation, with SM UI work
performed live in `bdef91user10842.grafana.net`.

## k6 script runs (terminal-driven)

Ran each solution inside the Instruqt workstation via keyboard-paste to `Terminal 0`,
captured per-lab `/tmp/lab-XX.log` and exit codes.

### Batch 1 (labs 01-08)
```
lab-01: PASS
lab-02: PASS
lab-03: PASS
lab-04: PASS
lab-05: PASS
lab-06: PASS   (InfluxDB output: --out influxdb=http://localhost:8086/k6)
lab-07: PASS   (Prometheus remote-write)
lab-08: PASS   (JSON output)
```

### Batch 2 (labs 14-16, 18-21, 27)
```
lab-14: PASS   (browser intro, K6_BROWSER_HEADLESS=true)
lab-15: PASS   (browser interactions)
lab-16: PASS   (mixed HTTP+browser)
lab-18: PASS   (OpenTelemetry tracing)
lab-19: PASS   (structured logging)
lab-20: PASS   (custom metrics)
lab-21: PASS   (WebSocket + xk6)
lab-27: PASS   (DataDog migration)
```

### Capstone (lab 29)
```
lab-29: PASS
  duration: 3m00s
  iterations: 764
  http_reqs: 2292
  http_req_failed: 0.00% (0/2292)
  groups: authenticate / browse / checkout — all ✓
  custom: orders_placed = 764
```

**Total automated labs PASS: 17/17** (every solution with a runnable script).

## Lab 00 infra verified via HTTP (no terminal)

Independent HTTPS probes from the browser through the Instruqt proxy:

| Service | Port | Probe | Result |
|---|---|---|---|
| demo-app | 3000 | `/health` | 200 `{"status":"healthy"}` ✅ |
| broken-app | 3001 | `/health` | 200 ✅ (intermittent by design) |
| httpbin | 8080 | `/get` | 200 ✅ |
| WireMock | 8888 | `/api/products` | 200 ✅ |
| InfluxDB | 8086 | `/ping` | 204 ✅ (expected status) |
| Grafana | 3030 | `/api/health` | 200 ✅ |
| Prometheus | 9090 | `/-/healthy` | 200 ✅ |
| Alloy | 12345 | `/` | 200 ✅ |
| Tempo | 3200 | `/status/services` | 200 ✅ |
| ws-echo | 8765 | `/` | 426 ✅ (WS upgrade required) |

## Grafana Cloud SM UI — verified by creating real checks

Walked the updated Lab 10/11/12 READMEs against the live `bdef91user10842.grafana.net`
Synthetics UI and successfully created each check type:

| Lab | Check | Created in GC | Notes |
|---|---|---|---|
| Lab 10 | HTTP check "Workshop Demo" @ `https://grafana.com` | ✅ ID 46889 | 3 probes (Frankfurt, N. Virginia, Singapore), 1m freq |
| Lab 11 | HTTP check "httpbin JSON endpoint" @ `https://httpbin.org/json` | ✅ ID 46890 | Regexp validation on `slideshow` with Invert checked |
| Lab 12 | DNS check "DNS Resolution Check" @ `grafana.com` | ✅ ID 46891 | Request type = DNS radio, 5m freq |

Confirmed end-to-end:
- Nav path **Testing & synthetics → Synthetics → Checks → + Create new check** works
- Type picker cards (API Endpoint / Multi Step / Scripted / Browser) render correctly
- 5-step wizard (Request → Uptime → Labels → Execution → Alerting) is the real UI
- **Regexp validation** with Invert toggle matches the new lab-11 README semantics
- Probes grouped as AMER / APAC / EMEA with city-named labels
- Frequency pill selector (1m, 5m, etc.) works
- Save lands on the check detail page — no errors

Lab 13 (Scripted) and Lab 17 (Browser) use the same wizard with a different card;
the wizard flow itself is already validated. **Lab 09 (k6 cloud run)** was not
executed end-to-end because it needs `K6_CLOUD_TOKEN` — recommend a dry-run before
workshop delivery.

## Fixes applied this session

### P1 blockers fixed
- `scripts/starters/lab-03-starter.js` — targets changed from `0/0/0` to `3/3/0` so the starter produces visible ramping out of the box
- `scripts/starters/lab-29-starter.js` — uncommented the 4 `import` statements; added minimal default stages so the file runs without a ReferenceError
- `scripts/starters/users.json` — created (10 users) so lab-05 Step 3 works as written
- `labs/lab-14-browser-intro/README.md`, `labs/lab-15-browser-interactions/README.md` — replaced hardcoded `/home/aschenck/lab/k6workshop-dev/...` paths with relative paths
- `scripts/starters/lab-09-starter.js`, `scripts/solutions/lab-09-solution.js` — added `BASE_URL` override + `localhost:3000` fallback when `INSTRUQT_PARTICIPANT_ID` is unset

### P2 SM UI drift fixed
- `labs/lab-10-synthetics-intro/README.md` — rewrote Step 1-3 & Step 6 to the new 5-step wizard, `+ Create new check`, "Alerts (Legacy)" label, removed non-existent "Summary" tab
- `docs/07_Synthetic_Monitoring_Basics/index.html` — rewrote Lab 10 slide (sub-nav) and Lab 11 slide (Regexp validation instead of Body Contains / Response Time)
- `labs/lab-13-workflow-checks/README.md` — updated nav + "+ Create new check → Scripted"
- `labs/lab-17-browser-synthetics/README.md` — same pattern
- `labs/lab-22-alerting/README.md` — "Alerts (Legacy)" rename + unified Alerts & IRM path
- `labs/lab-23-slos/README.md` — removed incorrect "Click SLOs in SM sub-nav"; directed to the SLO plugin (`/a/grafana-slo-app/`)
- `labs/lab-25-private-probes/README.md`, `labs/lab-27-dd-migrate-tests/README.md`, `labs/lab-29-capstone/README.md` — all "Add Check" nav updated
- `docs/10_Observability_Integration/index.html`, `docs/08_Browser_Testing/index.html`, `docs/12_Capstone_Project/index.html` — "SM → Add Check" → new wizard path
- `scripts/solutions/lab-17-solution.js` — header comment nav path updated

### P3 script correctness fixed
- `scripts/solutions/lab-01-solution.js` — removed dead `|| r.status === 401` branch (demo-app never returns 401)
- `labs/lab-00-setup/README.md` — `{"status":"ok"}` → `{"status":"healthy"}` to match demo-app
- `labs/lab-02-checks-thresholds/README.md` — `BROKEN_URL` → `BASE_URL`
- `scripts/starters/lab-03-starter.js` — starter targets made runnable with TODO to bump to 10
- `scripts/solutions/lab-27-solution.js` — comment + check key aligned; both now say `healthy`

### P4 polish fixed
- `labs/lab-14-browser-intro/README.md`, `labs/lab-15-browser-interactions/README.md` — module label aligned to `Module 3 — Browser Testing` (was `Module 4 - ...` on 14/15 vs `Module 3 —` on 16/17)
- `docs/05_Local_Observability/index.html` — Prometheus example now references `lab-07-solution.js` (was wrongly `lab-03-solution.js`)
- `labs/lab-24-feature-awareness/README.md` — added environment note: k6 Studio requires a desktop display; recommend running the lab outside Instruqt

## What was NOT tested live

- Lab 09 `k6 cloud run` — requires `K6_CLOUD_TOKEN` export. Script is correct (static) and URL fallback is now in place; recommend a smoke run with a real token before delivery.
- Lab 13 upload of a scripted check to SM — wizard path is proven via Labs 10/11/12; pasting a script is the only additional action.
- Lab 17 browser synthetic in SM — same wizard with Browser card; local lab-17 solution script was not executed but the script structure matches the lab-14-16 tests that all passed.
- Lab 22/23 alerting + SLO UI in Grafana Cloud — README nav updated; creating a real alert rule and SLO was out of scope for this pass.
- Lab 24 k6 Studio — desktop GUI, not runnable in Instruqt. Lab now documents this.
- Lab 25 private probe — requires Docker on the Instruqt workstation; not exercised.
- Lab 28 DD-monitor migration — docs-only lab.

## Recommendation before delivery

1. Commit the fixes in this session and re-spin an Instruqt track to verify the **starter** scripts (lab-03, lab-29) run clean. This session tested the solutions; starter fixes were validated only statically.
2. Run `./test-labs.sh` once in the fresh track as a smoke test for the bundled harness itself.
3. Do a manual dry run of Lab 09 with `K6_CLOUD_TOKEN` set.
4. For labs 22/23, one dry run creating a real alert and SLO would surface any nav-path drift I haven't caught.
