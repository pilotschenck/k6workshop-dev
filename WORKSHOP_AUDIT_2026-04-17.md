# Workshop Audit — 2026-04-17

Full student walk-through of the k6 + Grafana Synthetic Monitoring workshop. I did a static
review of every slide deck, lab README, and starter/solution script, and verified the Grafana
Cloud Synthetic Monitoring UI against the lab UI instructions in a real browser against
`https://bdef91user10842.grafana.net/`.

Scope: 13 slide decks (`docs/00_…/index.html` → `docs/12_…/index.html`), 30 lab READMEs
(`labs/lab-00/…` → `labs/lab-29/…`), and all starter/solution scripts in `scripts/`.

---

## Priority 1 — Blockers students will hit

### P1-a. `scripts/starters/lab-03-starter.js:15-19` — all stages target 0 VUs
All three ramping stages have `target: 0`, so running the starter unmodified produces a run with no
active VUs. README Step 1 expects `target: 5`, slides show `target: 10`. Pick one value and set it
in the starter.

### P1-b. `scripts/starters/lab-29-starter.js:15-18` — all imports commented out
Students can't run the starter at all without first uncommenting imports
(`http is not defined`). Either ship imports uncommented or add an explicit
**"Step 1: Uncomment these imports"** bullet at the top of the TODO list.

### P1-c. `scripts/starters/users.json` referenced but missing
`labs/lab-05-parameterization/README.md:48-56` tells students to open
`scripts/starters/users.json`. The file does not exist. Either create it with the three
users used by the solution, or rewrite Step 3 to say the data is inline and point at the
solution's `USERS` array.

### P1-d. `labs/lab-14-browser-intro/README.md:35,52,103,133` and `labs/lab-15-browser-interactions/README.md:35` — hardcoded `/home/aschenck/` paths
Authoring-machine paths leaked into the lab instructions. Replace with relative paths
(`scripts/starters/lab-14-starter.js`, etc.) like the rest of the labs.

### P1-e. Lab 09 Instruqt participant ID env var has no fallback
`scripts/starters/lab-09-starter.js:15` and `scripts/solutions/lab-09-solution.js:19` build a URL
from `__ENV.INSTRUQT_PARTICIPANT_ID`. Outside Instruqt the variable is undefined and you get
`https://grafana-workstation-3000u-undefined.env.play.instruqt.com` (DNS NXDOMAIN). Add a fallback
or fail fast with a clear error message. I verified both URL formats (`3000u-` and `3000-`) return
200 from Instruqt, so the script will work inside the sandbox — just not elsewhere.

---

## Priority 2 — Grafana Cloud UI drift (verified in real UI today)

I walked the SM UI at `https://bdef91user10842.grafana.net/a/grafana-synthetic-monitoring-app/`.
Here's what the lab instructions don't match:

**Sidebar nav (actual path today):** `Main menu → Testing & synthetics → Synthetics`
with sub-items **Checks, Probes, Alerts (Legacy), Config**. There is **no "Summary" item and no
"SLOs" item** in the SM sub-nav.

**Check creation button:** `+ Create new check` (not "Add Check").

**Create-check flow:** `Checks → Create new check` opens a **type picker** with four cards:
**API Endpoint, Multi Step, Scripted, Browser**. Inside API Endpoint the wizard has 5 tabs —
**Request / Uptime / Labels / Execution / Alerting** — and `HTTP/Ping/DNS/TCP/Traceroute` are
radio buttons inside the **Request** tab (not separate check types).

**Probe names:** city/country format, e.g. `Frankfurt, DE (AWS)`, `North Virginia, US (AWS)`,
`Singapore, SG (AWS)`. Grouped under `AMER / APAC / EMEA`. (The old `US East` / `Europe West`
labels are gone.)

**Frequency:** pill selector (`10s 30s 1m 2m 3m 5m 10m 15m 30m 1h`) — not a free-text field or
minute/second dropdowns.

**Assertions:** unified **Regexp validation** under the Uptime tab — no separate "Body Contains",
"Status Code Equals", or "Response Time" assertions. Default semantics is "fail when regex
matches" — check **Invert** for "must contain" behaviour.

**Test feature:** right-hand pane titled `Test / Terraform / Docs`, with a Test button.

### Files that need UI updates

| File | Issue |
|---|---|
| `docs/07_Synthetic_Monitoring_Basics/index.html:89-124` (Lab 10 slide) | Lists "Summary" as a sub-nav item. Shows old check form with "Assertion: HTTP status code equals 200". Rewrite to match lab-11 README. |
| `docs/07_Synthetic_Monitoring_Basics/index.html:147-166` (Lab 11 slide) | Lists "Body Contains", "Response Time < 2000 ms" as separate assertions. Replace with Regexp validation model. |
| `labs/lab-10-synthetics-intro/README.md:42-66` | Nav path + sidebar items ("Summary", "Alerts") outdated. |
| `labs/lab-10-synthetics-intro/README.md:70-105` | "Click Add Check" — should be "+ Create new check → API Endpoint". Form field layout ("Probe locations", "Frequency and timeout" under basics) is wrong — those fields are on the Execution tab. |
| `labs/lab-13-workflow-checks/README.md:115` | "Click Add Check and select Scripted" — use the new "+ Create new check → Scripted" flow. |
| `labs/lab-17-browser-synthetics/README.md:127-139` | Same "Add Check > Browser" pattern. Update to "+ Create new check → Browser". |
| `labs/lab-22-alerting/README.md:36-38` | "Synthetic Monitoring" → "Testing & synthetics → Synthetics". "Alerts" → "Alerts (Legacy)". |
| `labs/lab-23-slos/README.md:44-50` | "Click SLOs in the SM sub-navigation" — there is no SLOs item in the SM sub-nav. SLO config lives under the standalone SLO plugin (`/a/grafana-slo-app/`). Rewrite the entry path. |
| `docs/10_Observability_Integration/index.html:262-278, 337` | "Synthetic Monitoring → Probes" nav + "SM → Add Check → HTTP" outdated. |
| `docs/12_Capstone_Project/index.html:218-227, 262` | "SM → Add Check → Scripted" + SLO entry path outdated. |

Lab 11 and Lab 12 READMEs are already on the current UI. **Use them as the template** for
updating the rest.

---

## Priority 3 — Script correctness

### `scripts/solutions/lab-01-solution.js:47`
Check `'login status is 200 or 401'` tolerates a 401 that the demo-app never actually returns
(demo-app always 200 on POST `/login` with any body — see `infra/apps/demo-app/server.js:157-165`).
The `|| r.status === 401` branch is dead. Either make it strict (`=== 200`) or add a broken-app
variant that returns 401.

### `scripts/solutions/lab-27-solution.js:49-56`
Comment translates DD assertion `body contains '"status":"ok"'` but the live check is
`r.body.includes('healthy')`. The comment misrepresents what the code actually asserts. Align
the comment with demo-app's real `{"status":"healthy"}` response, or update the mock DD JSON so
the expectation matches.

### `labs/lab-00-setup/README.md:66`
Expected response says `{"status":"ok"}`. Demo-app actually returns `{"status":"healthy"}`.
Confirmed via live HTTP GET to the Instruqt demo-app. Update README.

### Lab 02 README terminology
`labs/lab-02-checks-thresholds/README.md:13` refers to `BROKEN_URL` env var. The rest of the lab
and starter/solution use `BASE_URL`. Pick one.

### Lab 03 VU-count consistency
`docs/03_Load_Profiles_and_Stages/index.html:128-137` shows expected output with `target: 10`,
but the README uses `target: 5`. Align.

---

## Priority 4 — Cross-cutting / polish

1. **Module numbering is inconsistent across lab READMEs.** Labs 14/15 say "Module 4 — Browser Testing", labs 16/17 say "Module 3 — Browser Testing". Labs 19-25 say "Module 3 — Advanced"; labs 26-28 say "Module 4 — DataDog Migration"; lab 29 says "Module 4 — Capstone". The slide decks are numbered 00-12. Pick a scheme that maps to the decks (e.g., "Module 08" throughout the browser labs).

2. **Reveal.js init inconsistency.** Decks 00-06 use `../common-scripts.js`; decks 07-12 inline the `Reveal.initialize()` call. Not a bug but normalize.

3. **Lab 24 launch path** says `k6-studio` CLI or "application launcher". Instruqt gives a terminal + code-server + iframed apps — no desktop GUI. Either document how to launch k6 Studio in Instruqt (if there is a way), or mark Lab 24 as "optional / local workstation only".

4. **Lab 09 slide** at `docs/06_Cloud_Integration/index.html:275` references
   `scripts/solutions/lab-03-solution.js` in a Prometheus example — that's a module-05
   artifact. Either drop the example or fix the path.

---

## Environment verified

- Grafana Cloud stack `bdef91user10842.grafana.net` loads fine and is signed in.
- Instruqt invite `szdhbmtova5j` spins up the "k6 Lab Environment" track (~2 min cold start). Sidebar shows Terminal 0/1, Code Server, Basic Editor, plus iframed Grafana / Demo App / Broken App / Alloy / Prometheus.
- Demo-app `/health` returns `{"status":"healthy"}` ✅
- Demo-app `/api/products` returns JSON product array ✅
- Demo-app `/login` returns 200 ✅
- Broken-app `/health` returns 200 (intermittent failures per smoke-check expectations) ✅
- Both Instruqt proxy URL formats work: `grafana-workstation-3000-<id>` and `grafana-workstation-3000u-<id>`.

Solutions I did **not** execute live (would require terminal access inside Instruqt): labs 06, 07, 14-21, 27, 29. Static review only — no syntax issues found, but runtime behaviour against live demo-app is untested here. The `test-labs.sh` harness exists and is intended to validate these; I'd recommend running it inside Instruqt's Terminal 0 before workshop delivery.
