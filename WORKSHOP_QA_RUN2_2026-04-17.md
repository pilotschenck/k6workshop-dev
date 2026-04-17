# Workshop QA Run 2 — 2026-04-17

Second QA pass on a **fresh Instruqt workstation** with the repo at commit
`cbc70f0` (post-initial audit). Goal: confirm the P1 starter fixes hold up
end-to-end (they were only static-validated in Run 1), sanity-check the
Grafana Cloud UI walk-throughs against the updated READMEs, and find anything
that still drifts.

## Results at a glance

| Phase | What ran | Outcome |
|---|---|---|
| 1 — P1 starters | `lab-03`, `lab-29`, `lab-05` starters/solution | 3/3 PASS |
| 2 — Batch solutions | labs `01, 02, 04, 06, 07, 08, 14, 15, 16, 18, 19, 20, 21, 27, 29` | 15/15 PASS (9m 43s total) |
| 3 — Cloud runs | `lab-09` starter + solution via `k6 cloud run` | 2/2 PASS |
| 4 — SM UI | Checks sidebar + create-check wizard | ✅ matches updated lab-10/11/12 READMEs |
| 4 — SLO UI | SLO plugin + full create-SLO wizard (5 steps) | ⚠️ lab-23 Step 2 was wrong — fixed |

## Phase 1 — P1 starter fixes validated on fresh env

The three P1 blockers from the first audit were only checked statically. Run 2 ran them live:

- **`scripts/starters/lab-03-starter.js`** — previously had `target: 0` on every
  stage so the starter produced zero VUs. Ran 50 s end-to-end; **vus_max=3**,
  126 iterations, 0 failures, EXIT=0. ✅
- **`scripts/starters/lab-29-starter.js`** — previously had all imports
  commented out, tripped `ReferenceError`. Ran 10 s clean, 1,269,884 empty-body
  iterations (expected for a mostly-TODO default function), EXIT=0. ✅
- **`scripts/starters/users.json`** — referenced by lab-05 README but missing
  in Run 1. Present now; lab-05 solution ran 30 s with 5 VUs and 150
  iterations, EXIT=0. ✅

## Phase 2 — 15-solution batch

All 15 solutions with automated scripts passed on the fresh workstation:

```
lab-01: PASS     lab-15: PASS
lab-02: PASS     lab-16: PASS
lab-04: PASS     lab-18: PASS
lab-06: PASS     lab-19: PASS
lab-07: PASS     lab-20: PASS
lab-08: PASS     lab-21: PASS
lab-14: PASS     lab-27: PASS
                 lab-29: PASS   (capstone, ~3 min)
Elapsed: 583s
```

No regressions from Run 1. InfluxDB (lab-06), Prometheus remote-write
(lab-07), JSON output (lab-08), browser (lab-14/15/16), OTel tracing (lab-18),
WebSocket (lab-21), DD migration (lab-27), and capstone (lab-29) all clean.

## Phase 3 — Lab 09 cloud runs on fresh env

With the threshold-less solution from commit `3736fbf`:

- **Starter cloud run**: STARTER_RC=0, run at
  `https://fcde49.grafana.net/a/k6-app/runs/7302208`
- **Solution cloud run**: SOLUTION_RC=0, run at
  `https://fcde49.grafana.net/a/k6-app/runs/7302225`

Both finished with status "Finished" and no threshold crossings. Validated
the Run 1 decision to strip the threshold block.

## Phase 4 — Grafana Cloud UI walk-throughs

### Synthetic Monitoring checks ✅

The SM sidebar structure and create-check wizard match the updated lab-10
README byte-for-byte:

- Sidebar: `Testing & synthetics → Synthetics → Checks / Probes / Alerts (Legacy) / Config`
- Button: `+ Create new check`
- Type picker: `API Endpoint / Multi Step / Scripted / Browser`
- Wizard: `Request → Uptime → Labels → Execution → Alerting`

Three existing checks from Run 1 survived the workstation reset (they're in
the Grafana Cloud stack, not the workstation): `DNS Resolution Check`,
`httpbin JSON endpoint`, `Workshop Demo`.

### SLO plugin ⚠️ lab-23 rewrite required

**Before Run 2:** lab-23 README said to click "Create SLO", fill "Basic
information", select an SLI type **"Success rate"** dropdown, pick a check
"Workshop Demo" from a dropdown, set Target 99.5% / Rolling window 30 days,
click Save. Step 4 manually configured fast (14×) and slow (3×) burn alerts.

**Actually in the UI:** a **5-step wizard** with no SM-check dropdown anywhere:

1. **Define SLI** — enter time window (default 28 days), pick data source
   (`grafanacloud-<stack>-prom`), choose Ratio or Advanced query type, enter
   **raw PromQL** for Success metric and Total metric, set Grouping. Run
   queries, preview the SLI ratio chart, advance.
2. **Set target and error budget** — single target input (99.5% default);
   error budget auto-calculated.
3. **Add name and description** — Name, Description (with a placeholder
   example), Folder, SLO labels (team_name, service_name, custom).
4. **Add SLO alert rules & assistant investigations** — single checkbox. If
   ticked, Grafana auto-generates fast-burn (14.4×/5m+1h OR 6×/30m+6h) and
   slow-burn rules following the SRE multi-window multi-burn-rate pattern.
   **No manual threshold input.**
5. **Review SLO** — summary + Save.

**Correct PromQL for an SM-backed SLO** (the current UI doesn't help you
discover this):

```
Success: probe_all_success_sum{job="Workshop Demo"}
Total:   probe_all_success_count{job="Workshop Demo"}
Group:   job
```

Verified the ratio chart renders a flat 100% line for the Workshop Demo check.

**Fix:** rewrote lab-23 Step 2 and Step 4 entirely in this run. Also updated
lab-29 capstone's SLO step to point at **Alerts & IRM → SLO** (the sidebar
path) rather than "sidebar search for SLO". Committed separately from the
Run 1 audit so the diff is reviewable.

### Alerts & IRM ✅

Lab-22 README points at `Alerts & IRM → Alerting → Alert rules`. Confirmed
this is the correct path:

- `Alerts & IRM` is the sidebar group (expanded by default on fresh stacks)
- Sub-items: `Service center / Alerting / IRM / SLO / Label management`
- `Alerting` further expands to `Alert activity (New!) / Alert rules /
  Notification configuration / Silences / History / Settings`
- **SLO is a first-class sub-item under Alerts & IRM** — easier to find than
  lab-23 originally implied.

## What still isn't tested end-to-end

- **lab-17 (Browser SM check) upload** — scripted-check and multi-step
  wizards work (verified by analogy), but I didn't paste the lab-17 browser
  solution into a real SM browser check. Same wizard, different card.
- **lab-22 alerting — creating a real alert rule and exercising the full
  contact-point + notification-policy flow.** The nav is right; the
  end-to-end happy path wasn't walked.
- **lab-24 k6 Studio** — desktop GUI; can't be exercised from Instruqt.
- **lab-25 private probe** — needs Docker on the workstation plus an SM
  private-probe token.
- **lab-28 (DD monitor migration)** — docs-only lab, nothing to run.

## Net change from Run 1

Run 2 confirmed Run 1's fixes hold up on a clean env and surfaced one more
real-world drift (SLO wizard). The SLO rewrite is the only correction this
session — everything else carried over cleanly.
