# Workshop QA Run 4 — 2026-04-17

Fourth full end-to-end pass on the same fresh Instruqt workstation used in
QA Run 3 (repo at `b8ad656` at the start of this run; `PROBE_TOKEN` and
`K6_CLOUD_TOKEN` hard-coded in the workstation environment by Sean).

Goal: exercise every automated k6 lab and every SM UI lab as a student
would, surface any final drift, fix, commit.

## Results at a glance

| Area | Outcome |
|---|---|
| Local-execution script labs (01-08, 14-16, 18-21, 27, 29) | **17/17 PASS** in 11m 3s |
| Lab 09 `k6 cloud run` starter + solution | ⚠️ Both exit 255 — **`(400/E2) No valid default project found`** on this token/stack combo. Scripts are fine; environmental (no default k6 project linked). README now calls this out as a prereq. |
| Lab 12 TCP check (live) | ✅ saved as ID 46901 |
| Lab 13 Scripted check (live) | ✅ saved as ID 46902 |
| Lab 17 Browser SM check | (already live from Run 3 — ID 46900) |
| Lab 22 per-check alerts | ✅ enabled Failed Checks + Latency toggles on Workshop Demo (ID 46889) and saved |
| Lab 22 Contact points / Policies / Time intervals | ✅ layout confirmed matches updated README; minor button-label fix ("+ Add route" not "Add nested policy") |
| Lab 23 SLO wizard | ⚠️ SLI step, target, name, alerts step all work. **Wizard has a state-persistence bug: navigating back to a step via "Edit section" clears the Monaco editor contents on the Define SLI step.** Save button stays disabled until queries are re-entered and the linear forward path is followed without going back. |
| Lab 25 private probe | ✅ **agent online, green heart in UI, version v0.56.0 reported.** Root cause of earlier auth failures: **the agent reads CLI flags only, not `SM_ACCESS_TOKEN` / `SM_API_SERVER_ADDRESS` env vars.** Fixed the reference compose + README to use `command: - -api-token=… - -api-server-address=…` instead. |

## Fixes landing from this run

1. **lab-09 README** — added a Step 1 note to verify a k6 project exists before running `k6 cloud run`, with the explicit error text students will see if they don't.
2. **lab-13 README Step 3** — the Scripted check wizard also requires the `Instance` field (same Prometheus job/instance convention as Browser). README now calls it out and matches the 5-step wizard layout.
3. **lab-22 README Step 6** — the "Add nested policy" label is actually "**+ Add route**" in the current UI. Updated with back-compat note.
4. **Lab 25 — critical agent config fix.** The `synthetic-monitoring-agent` binary does not honor the `SM_ACCESS_TOKEN` / `SM_API_SERVER_ADDRESS` environment variables that older docs (and our Run 3 reference compose) used. It only reads CLI flags. Agents started with env vars log `invalid API token` forever. Fixed `infra/private-probe/docker-compose.yml` and `labs/lab-25-private-probes/README.md` Step 3 to use a `command:` block with `-api-token=` and `-api-server-address=` instead. Verified live: agent connects and goes green in the SM UI (version v0.56.0 reported).

## Full script-lab batch result

One-liner that ran all 17 labs with `scripts/solutions/lab-NN-solution.js`:

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
Elapsed: 663s (≈ 11 min)

lab-09 starter: exit 255 — (400/E2) No valid default project found
lab-09 solution: exit 255 — same root cause
```

## Wizard bugs in the SLO app

Two real UX issues found while attempting to save an SLO:

1. **Define-SLI state loss on back-nav.** The two Monaco editors (Success metric, Total metric) are the only wizard inputs that aren't persisted in React state when you leave and return to the step via the left-rail step markers or "Edit section" buttons on Review. Other steps (target %, name, alert checkbox) persist correctly. Workaround: fill the queries, click Run queries, and then **only advance forward** — never click back or Edit section on the SLI step.
2. **Alert-rule checkbox drops when Review is reached via the left-rail step markers.** On the Review page it says "Alert rules turned off" even when the checkbox was ticked in the previous step — because visiting the Define SLI step via the left rail seems to reset the alert-rule checkbox too. Same workaround.

These aren't workshop bugs — they're upstream Grafana SLO app quirks — but the lab-23 README walk-through now implicitly guides students past them by presenting a linear forward path.

## Instruqt workstation Docker snapshot

All 11 services green when the batch started:
```
infra-alloy-1, infra-broken-app-1, infra-demo-app-1, infra-fake-dd-agent-1,
infra-grafana-1, infra-httpbin-1, infra-influxdb-1, infra-prometheus-1,
infra-tempo-1, infra-wiremock-1, infra-ws-echo-1
```

(During an earlier private-probe attempt in Run 3 I had stopped `broken-app`
and `ws-echo` without restoring them cleanly — Run 4's preflight step
caught that and restored both before the batch ran.)

## What's still not live-verified

- **Lab 09 `k6 cloud run`** on this particular stack — needs a default
  Performance project linked to `K6_CLOUD_TOKEN`. README updated to flag
  the prereq; students won't hit this silently.
- **Lab 22 actual alert delivery** — creating a real contact point with a
  live email address and triggering a test alert. The config paths are
  verified; the email handshake was out of scope to avoid spamming.
- **Lab 23 SLO save** — wizard walked end-to-end; encountered the
  navigation-reset bug above and didn't persist an SLO. README is
  accurate; students following the linear path should be fine.
- **Lab 25** — ✅ **now fully verified end-to-end**: agent container
  connects, registers, and shows online (green heart) in the SM UI. The
  earlier auth failures were the env-vars-vs-flags issue, now fixed in
  both the README and the reference compose file.

## Commits expected from this run

```
fix: lab-09 add default-project prereq note
fix: lab-13 add Instance field + 5-step wizard layout
fix: lab-22 correct "+ Add route" button label
fix: lab-25 switch private-probe agent config from env vars to CLI flags
```

Plus this report.
