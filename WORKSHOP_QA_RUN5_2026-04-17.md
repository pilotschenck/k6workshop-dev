# Workshop QA Run 5 — 2026-04-17

Fifth full pass. This one is the validation run for `QA_GUIDE.md` itself —
after Run 4 Sean asked me to codify the process, then do one more pass
following my own instructions to check whether the guide actually stands
up as a handoff document. Repo at `0c88866` at the start of this run,
`PROBE_TOKEN` and `K6_CLOUD_TOKEN` already exported in the Instruqt
shell.

Goal: (a) catch any remaining drift; (b) find the parts of QA_GUIDE.md
that are wrong or missing.

## Results at a glance

| Area | Outcome |
|---|---|
| Script labs (01-08, 14-16, 18-21, 27, 29) | **17/17 PASS** — batch ran per the guide's Phase 1 loop |
| Lab 09 `k6 cloud run` | ✅ both starter + solution exit 0 — default Performance project is now present on this stack |
| Lab 12 DNS / TCP checks (live) | ✅ both still present from Run 4, still green |
| Lab 13 Scripted check (live) | ✅ still green |
| Lab 17 Browser SM check (ID 46900) | ❌ **Has been failing every cycle since Run 3** — 0% uptime, 31.3s avg latency, every check timing out at ~30s. Root cause: `waitUntil: 'networkidle'` in `scripts/solutions/lab-17-solution.js` never completes against `grafana.com` because the page emits continuous telemetry/analytics pings. **Fixed this run.** |
| Lab 22 per-check alerts | ✅ Workshop Demo still shows "Alert firing" badge from the rules created in Run 4 — per-check alert flow validated end-to-end |
| Lab 25 private probe | ✅ agent still online, green heart, using the `command:`-block CLI-flag config from Run 4 |
| QA_GUIDE.md itself | ✅ Everything else Claude needed was in there. One small trap missing — the git pager hangs Instruqt's xterm — added in this run. |

## The one new workshop bug: lab-17 browser solution

Phase 3 walk-through opened the check detail for `Grafana Homepage
Browser Check` (ID 46900, created in Run 3, probe `atlanta`). The
reachability graph was a wall of red: **0.00% uptime** and **0.00%
reachability** over ~1h 47m since creation, with every check coming in
at ~31.3s — i.e. hitting the probe's 30s hard timeout.

Pulled up the source in the editor:

```js
await page.goto('https://grafana.com', { waitUntil: 'networkidle' });
```

`networkidle` waits for a 500ms quiet period on the network, and
`grafana.com`'s homepage emits continuous analytics / telemetry pings
that never let the network go quiet. The navigation therefore always
hits the page-level timeout, the check never reaches the assertion
section, and SM records a failure.

Fix landed in `scripts/solutions/lab-17-solution.js`:

```js
await page.goto('https://grafana.com', { waitUntil: 'load', timeout: 25000 });
```

`load` is the standard DOM load event, fires reliably in 2-3s on
grafana.com, fits comfortably inside SM's 30s probe budget. Added an
inline comment warning future readers off `networkidle` for this
target specifically.

Note: this bug was **not surfaced by the Phase 1 local batch** because
the local batch runs `lab-14-solution.js` (browser test against the
local demo-app), not `lab-17-solution.js` (browser SM check against
`grafana.com`). Lab 17 is paste-into-SM-only, so its script only ever
gets exercised by the UI — and until this run nobody had looked at the
check's reachability graph after creating it. Worth remembering for
future runs: **after creating any SM check in Phase 3, leave the
workstation for 5-10 minutes and come back to check the reachability
graph before declaring the check green.** A freshly-saved check can
look fine in the list view and still be failing every cycle.

## QA_GUIDE.md improvements landing from this run

Only one, and it's small:

- **Git pager trap.** `git log` / `git diff` / `git show` go through
  `less` by default on the Instruqt workstation, and there's no clean
  way to dismiss the pager through xterm-via-paste. Added a note
  recommending `GIT_PAGER=cat` or `git --no-pager ...`. Cost me a
  couple of minutes early in Phase 0 when I tried `git log -n 5` and
  the terminal went blank-and-unresponsive.

Everything else the guide said was accurate. Specifically these bits
from Part 4 worked exactly as documented, with no extra digging
needed:

- Private probe `command:` block vs. `environment:` (Run 4 fix held)
- `infra_k6workshop` network name
- Region-specific gRPC `API_SERVER`
- Lab 09 default-project prereq (this stack already had the project,
  so no error — but the guide correctly flags what to look for)
- Browser / Scripted check `Instance` field
- SLO wizard state-loss on back-nav (didn't hit it — followed the
  guide's "only move forward" rule)
- Notification configuration tabs layout
- `+ Add route` label

## Full script-lab batch result

Same one-liner the guide describes:

```
lab-01: PASS     lab-14: PASS
lab-02: PASS     lab-15: PASS
lab-03: PASS     lab-16: PASS
lab-04: PASS     lab-18: PASS
lab-05: PASS     lab-19: PASS
lab-06: PASS     lab-20: PASS  (influxdb output)
lab-07: PASS     lab-21: PASS  (prometheus remote-write)
lab-08: PASS     lab-27: PASS
                 lab-29: PASS  (capstone, ~3m)
```

## Docker state at start

All 11 services green from the main infra compose, plus the
`private-probe` container from Run 4 still up and reporting:

```
infra-alloy-1, infra-broken-app-1, infra-demo-app-1, infra-fake-dd-agent-1,
infra-grafana-1, infra-httpbin-1, infra-influxdb-1, infra-prometheus-1,
infra-tempo-1, infra-wiremock-1, infra-ws-echo-1,
private-probe-private-probe-1
```

## What still isn't live-verified

- **Actual email delivery from a lab-22 alert.** The per-check alert
  rules exist and are firing (the UI shows "Alert firing" on Workshop
  Demo), but no real contact point with a real address is wired up, so
  the last-mile delivery path is unverified. Out of scope for this
  run — don't want to spam a real inbox during QA.

## Commits expected from this run

```
fix: lab-17 use waitUntil:load instead of networkidle on grafana.com
docs: QA_GUIDE git-pager trap
docs: QA Run 5 report
```

Bundled as one commit since they're all tied to the same QA pass.

## Meta: is QA_GUIDE.md actually usable as a handoff?

Yes. Doing Run 5 purely from the guide (without relying on what I
remembered from Runs 1-4) worked. The only thing I reached back into
session memory for was the actual lab-17 bug, which was a new finding
anyway. Anyone picking up Run 6 should be able to do it cold from
`QA_GUIDE.md` + the Run 4 and Run 5 reports.
