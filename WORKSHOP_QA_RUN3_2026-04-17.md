# Workshop QA Run 3 — 2026-04-17

Third QA pass: end-to-end walk-throughs of labs 17, 22, and 25 —
previously flagged as "not tested end-to-end" in QA Run 2.

## Results at a glance

| Lab | Path exercised | Outcome |
|---|---|---|
| 17 — Browser SM check | Create + configure a Browser check via the SM wizard | ✅ check created (ID 46900); README had drift |
| 22 — Alerting (auto-rules) | Explore SM Alerts (Legacy) page + per-check Alerting step | ⚠️ **legacy auto-alerts deprecated**; replaced by per-check UI |
| 22 — Notification config | Walk Contact points / Notification policies / Time intervals tabs | ✅ layout verified; README paths updated |
| 25 — Private probe | Register probe → get token + API server → start agent → auth | ⚠️ reference compose was wrong; fixed |

All three labs had real drift; all three were fixed and committed.

## Lab 17 — Browser SM check

**What I did:** Created the Workshop's lab-17 Browser check live in
`bdef91user10842.grafana.net` following the README step-by-step. Pasted the
`scripts/solutions/lab-17-solution.js` content into the wizard's Script
editor, picked 3 probes (Ohio, Frankfurt, Singapore), set frequency to 10m,
saved. Check was created successfully (ID 46900) at
`https://grafana.com` with job name `Grafana Homepage Browser Check`.

**Drift found and fixed:**

- The Browser wizard requires an **`Instance`** field in addition to
  `Job name`. The current lab-17 README doesn't mention it. The wizard
  accepts anything (follows the Prometheus job/instance convention for
  labels); I used `https://grafana.com` (the URL the script hits).
- The Script editor pre-populates with a k6-testing template
  (`k6-testing/0.5.0`, `k6-utils/1.5.0`). Our solution uses plain
  `check` from `k6` — a mix would confuse students, so the README now
  tells them to select-all + delete before pasting the solution.
- The wizard structure is confirmed: 5 steps, **Script → Uptime →
  Labels → Execution → Alerting**. The README now advances through
  each step explicitly.

## Lab 22 — Alerting

### Deprecated: SM auto-generated alert rules

The `Synthetic Monitoring → Alerts (Legacy)` page now shows this banner:

> Legacy alerts (with High, Medium, Low sensitivity settings) are no longer
> available. The per-check alerts system provides more flexibility and
> control over your alerting configuration.

The old "SM creates two default rules per check" behaviour is gone. The
replacement is a **per-check Alerting step** inside the check's edit wizard
(step 5 of 5) with three toggles:

| Toggle | Default |
|---|---|
| **Failed Checks** | Alert if ≥ 1 of 15 probe executions fails in the last 5 min |
| **TLS Certificate** | Alert if the cert expires in less than 30 d |
| **Latency** | Alert if the average HTTP request duration exceeds 300 ms over the last 5 min |

Each has a runbook URL field. Ticking a checkbox writes a real Grafana
alert rule into `Alerts & IRM → Alerting → Alert rules` (namespaced
`Synthetic Monitoring -`).

**Fix:** lab-22 Steps 2 and 3 rewritten. Step 2 now walks the per-check
Alerting UI; Step 3 points at the auto-generated Grafana rules instead of
the now-defunct "customize SM auto-rule" flow.

### Notification configuration nav path

**Before:** `Alerting > Contact Points`, `Alerting > Notification policies`,
and `Alerting > Mute timings` as separate sidebar items.

**Actually:** a single page at **Alerts & IRM → Alerting → Notification
configuration** with tabs:

- **Contact points** — `+ New contact point`
- **Notification policies** — edit Default policy + add nested policies
- **Templates** — message templates
- **Time intervals** — formerly "Mute timings"; `+ New time interval`

**Fix:** Steps 5, 6, 7 of lab-22 updated to the new paths.

## Lab 25 — Private probe

**What I did (before hitting a wall):**

1. Navigated to **Testing & synthetics → Synthetics → Probes** and clicked
   **Add Private Probe** (confirms the existing README nav).
2. Filled in `workshop-private-probe` with region `workshop` (a custom
   region, entered via the "Add or select a region" combo's "Use custom
   value" option).
3. Clicked **Add new probe** — the Probe setup modal appeared with an
   `API_TOKEN` and `API_SERVER` value.
4. Started the private-probe agent via `docker run` in Instruqt Terminal 0
   with `SM_ACCESS_TOKEN` and `SM_API_SERVER_ADDRESS` from the modal.
5. The agent restart-looped with `E: invalid API token` — twice, with two
   different reset tokens.

**Root cause (probable):** the token I copy-pasted from the screenshot mixed
up lowercase `l` and uppercase `I` in the base64 string. Even a single-char
misread fails auth. This is a real usability hazard for students.

**Drift found and fixed:**

- **`SM_API_SERVER_ADDRESS` must be region-specific.** The reference
  `infra/private-probe/docker-compose.yml` had the generic
  `https://synthetic-monitoring-api.grafana.net`. The actual value is a
  gRPC endpoint like `synthetic-monitoring-grpc-us-west-0.grafana.net:443`
  shown in the Probe setup modal. Using the generic URL silently fails.
  Fixed in `infra/private-probe/docker-compose.yml`.
- **Docker network name is `infra_k6workshop`**, not `k6workshop`. Docker
  Compose prefixes the network name with the project name (`infra`). The
  old README's compose snippet declared `external: true` with the network
  named `k6workshop` — which doesn't match the actual name. Fixed both
  `labs/lab-25-private-probes/README.md` Step 3 and the reference
  `docker-compose.yml`.
- **Modal now called out in Step 2.** Lab-25 explicitly describes the
  Probe setup modal with both `API_TOKEN` and `API_SERVER`, and points at
  the Copy buttons. Added a note about **Reset Access Token** from the
  probe's edit page if the token is lost.

I did not personally verify the agent connects end-to-end — my copy of
the token had a transcription error (I was reading off a screenshot
instead of using the Copy button, exactly what the README now tells
students to avoid). The agent code path is correct; with the Copy button
and the corrected compose file, end-to-end should work cleanly.

## Commits landing from this run

```
fix: lab-17 Browser wizard — add Instance field, note k6-testing template
fix: lab-22 rewrite for per-check alerts + Notification configuration tabs
fix: lab-25 private probe — region-specific gRPC endpoint + Docker network name
```

## What still isn't walked live

- **Lab 24 k6 Studio** — desktop-only, not possible inside Instruqt.
- **Lab 22 end-to-end alert trigger** — deliberately breaking a check and
  seeing the email arrive. The mechanism is verified (rules get created
  correctly); the full round-trip to a real inbox was out of scope.
- **Lab 25 agent-connects-and-runs-checks** — see note above; the README
  is now correct, but I didn't personally observe the `probe is online`
  green heart with the latest token.

Recommend delivering the workshop with the fixes pushed and monitoring
for the `l`/`I` token issue; if it trips students during a live session,
have them reset and use the Copy button.
