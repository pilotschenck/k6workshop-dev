# Workshop QA Guide

How to run a full UI-driven QA pass on this workshop using Claude Code + Chrome.
Written after four rounds of this process (QA Runs 1-4, April 2026); see the
matching `WORKSHOP_*_*.md` files for historical notes.

A complete pass takes ~90 minutes of Claude-agent work if nothing is broken,
longer if you find real drift. Most of that is waiting for cloud runs and
batch script executions — you can leave it alone during those and come back.

---

## Part 1 — What you need before starting

### Accounts and environments

1. **Field Engineering Brokkr AppEnv** — stand up a fresh environment. This
   gives you a Grafana Cloud stack and a set of disposable student user
   accounts (e.g. `bdef91user10842` / generated password).
2. **Instruqt invite** for the `k6-lab-environment` track — the workstation
   image has Docker, k6, and the whole `k6workshop-dev` repo pre-cloned at
   `/root/k6workshop-dev`.
3. **Your own GitHub credentials** if you want Claude to commit and push
   fixes. `gh auth status` should show you logged in with `repo` scope.

### Software on the host where Claude Code runs

- Claude Code CLI, started with the specific flags:
  ```bash
  claude --chrome --dangerously-skip-permissions
  ```
  - `--chrome` attaches the browser-automation extension that lets Claude
    drive Chrome (navigate, click, type, screenshot).
  - `--dangerously-skip-permissions` lets the agent issue Bash/Edit/Write
    calls without prompting you for every single one. Without it you'll
    spend the whole run clicking Allow.
- A working `git` + `gh` setup, with the repo cloned somewhere Claude can
  edit it. During Runs 1-4 the working tree had the remote set to SSH
  (`ssh://git@github.com/...`) but only HTTPS pushed successfully via the
  `gh` credential helper — Claude swaps the remote before push and swaps
  it back after.

### Tokens Claude will need in the Instruqt workstation shell

Export these in Terminal 0 of Instruqt before Claude starts, or tell
Claude where to find them. Claude is **not** good at reading long base64
tokens off a screenshot — don't make it try.

1. `K6_CLOUD_TOKEN` — personal API token from `grafana.com → Your Stack →
   k6 → Settings → API Token`. The stack must also have **at least one
   Performance project** (create one under `Testing & synthetics →
   Performance → Projects` if the list is empty) or lab-09 cloud runs
   fail with `(400/E2) No valid default project found.`
2. `PROBE_TOKEN` — needed only for lab 25. Register a Private Probe via
   `Testing & synthetics → Synthetics → Probes → Add Private Probe`, hit
   the Copy button next to `API_TOKEN` in the Probe setup modal, and
   `export PROBE_TOKEN='<paste>'`. **Hard-code it into `~/.bashrc` so it
   survives shell resets** — the modal is one-shot; resetting the token
   invalidates any earlier value.

---

## Part 2 — Initial browser setup

Before kicking off Claude, open these tabs in the Chrome profile that
has the Claude-in-Chrome extension attached:

| # | URL | Purpose |
|---|---|---|
| 1 | `https://pilotschenck.github.io/k6workshop-dev/` | Slides index (student landing) |
| 2 | `https://play.instruqt.com/grafana/invite/<your-invite-code>` | Instruqt track — click **Continue** / **Start** |
| 3 | `https://<stack>.grafana.net/` | Grafana Cloud stack for SM/SLO UI work |

Claude will open a code-server tab (`https://grafana-workstation-8443-<id>.env.play.instruqt.com/`)
on its own when needed.

---

## Part 3 — The QA pass, in order

Give Claude a prompt like:

> Walk through the entire workshop as a student would, in the browser.
> You can use Instruqt Terminal 0 via the xterm paste helper. PROBE_TOKEN
> and K6_CLOUD_TOKEN are already exported in the shell. Commit and push
> any drift you find.

Claude will generally organise the work like this:

### Phase 0 — Preflight (≈ 2 min)

- `cd /root/k6workshop-dev && git pull --ff-only`
- Verify `PROBE_TOKEN` and `K6_CLOUD_TOKEN` are set with non-zero length.
- `docker ps --format '{{.Names}}'` — all 11 services should be present:
  `infra-alloy-1`, `infra-broken-app-1`, `infra-demo-app-1`,
  `infra-fake-dd-agent-1`, `infra-grafana-1`, `infra-httpbin-1`,
  `infra-influxdb-1`, `infra-prometheus-1`, `infra-tempo-1`,
  `infra-wiremock-1`, `infra-ws-echo-1`.
  If any are missing, `docker start <name>`.

### Phase 1 — Batch the script labs (≈ 11 min, mostly passive)

A one-line shell loop runs the 17 runnable solutions with the right
`--out` flags and summarises PASS/FAIL. Claude typically kicks this off
in Terminal 0 and then works on the SM UI in parallel.

Labs batched: `01, 02, 03, 04, 05, 06 (influxdb), 07 (prom), 08 (json),
14, 15, 16 (browser headless), 18 (otel), 19, 20, 21 (ws), 27, 29
(capstone, ~3 min)`.

### Phase 2 — `k6 cloud run` (≈ 3 min, passive)

Runs lab-09 starter and solution through `k6 cloud run` using
`K6_CLOUD_TOKEN`. Look for `(400/E2) No valid default project found.`
— that means no default project, not a workshop bug.

### Phase 3 — SM UI walk-through (≈ 30 min, active)

Claude creates a real check for each type, at least once:

| Lab | Check | Path |
|---|---|---|
| 10 | HTTP `Workshop Demo` → `https://grafana.com` | API Endpoint → HTTP radio |
| 11 | HTTP `httpbin JSON endpoint` with Regexp validation | API Endpoint → HTTP → Uptime tab → Regexp validation (Invert checked, `slideshow`) |
| 12 | DNS `DNS Resolution Check` → `grafana.com` | API Endpoint → DNS radio |
| 12 | TCP `TCP Port Check` → `grafana.com:443` | API Endpoint → TCP radio |
| 13 | Scripted `Multi-Step API Workflow` | Scripted card; paste `scripts/solutions/lab-13-solution.js` into Monaco |
| 17 | Browser `Grafana Homepage Browser Check` | Browser card; paste `scripts/solutions/lab-17-solution.js` |

Then:

| Lab | Action |
|---|---|
| 22 | Enable per-check alerts on Workshop Demo (Alerting step of check wizard — Failed Checks + Latency toggles). Verify `Alerts & IRM → Alerting → Alert rules` shows the generated rule. |
| 22 | Walk `Alerts & IRM → Alerting → Notification configuration` tabs: Contact points, Notification policies, Templates, Time intervals. |
| 23 | Walk the 5-step SLO wizard (see gotcha below). Save an SLO backed by `probe_all_success_sum` / `probe_all_success_count` grouped by `job`. |
| 25 | Start the private-probe agent in Docker and confirm green heart in the UI. |

### Phase 4 — Write findings, commit, push

Claude writes a new `WORKSHOP_QA_RUN<N>_YYYY-MM-DD.md` at the repo
root, commits the doc + any README/compose fixes to `main`, pushes
to `origin` via HTTPS (the `gh` credential helper), and swaps the
remote back to SSH.

---

## Part 4 — Known traps and how Claude should handle them

These are real bugs or UI quirks that cost an hour+ to diagnose the
first time. Write them into the prompt so the next agent doesn't
repeat the mistakes.

### Token ambiguity

Tokens from the Probe setup modal and similar places are base64 and
contain `l`/`I`, `o`/`0` that look identical in most monospace fonts.
**Always use the Copy button.** Do not try to read tokens off a
screenshot. This cost ~40 minutes in Run 3.

### Private probe agent ignores environment variables

The `grafana/synthetic-monitoring-agent` image reads its config from
**CLI flags only**:

```yaml
command:
  - -api-token=<value>
  - -api-server-address=<region-specific-grpc-endpoint>:443
```

Passing `SM_ACCESS_TOKEN` / `SM_API_SERVER_ADDRESS` as `environment:`
silently fails — the agent logs `invalid API token` forever. The
reference compose file at `infra/private-probe/docker-compose.yml`
shows the correct shape as of Run 4.

### `API_SERVER` for private probes is region-specific

The Probe setup modal shows an `API_SERVER` like
`synthetic-monitoring-grpc-us-west-0.grafana.net:443`. Do **not**
substitute the older-style `synthetic-monitoring-api.grafana.net` —
different region, different protocol (HTTP vs gRPC), the agent will
refuse to connect.

### Docker network name is `infra_k6workshop`

Docker Compose prefixes network names with the project name
(`infra_` in our setup). The private probe must join this network to
resolve `demo-app` by hostname. Reference compose uses:

```yaml
networks:
  k6workshop:
    name: infra_k6workshop
    external: true
```

### Lab 09 cloud run needs a default Performance project

The `K6_CLOUD_TOKEN` alone isn't enough — the stack needs at least
one Performance project (`Testing & synthetics → Performance →
Projects`). If empty, create one. Without it:

```
time="..." level=error msg="(400/E2) No valid default project found."
```

**Even if the project exists and is marked Default in the UI**, the
CLI may still return `(400/E2)`. Run 6 hit this despite `k6 cloud
login --token=...` succeeding — the org-level default linkage the
CLI consults was apparently not what the UI showed. Force the
project via env var:

```bash
K6_CLOUD_PROJECT_ID=<id> k6 cloud run scripts/...
```

Get `<id>` from the URL `/a/k6-app/projects/<id>`.

### Browser wizard has an `Instance` field

Both Browser and Scripted checks require a second field —
`Instance` — in addition to `Job name`. Follows the Prometheus
`job`/`instance` convention. Older READMEs didn't mention it.

### SLO wizard state loss on back-nav

The Monaco editors on the Define SLI step lose their contents when
you leave and return to the step via the left rail or "Edit section"
buttons. Workaround: fill the queries, click **Run queries**, then
**only move forward** — never click back to Define SLI. If you have
to go back, re-enter the queries.

### `Alerts (Legacy)` banner

`Testing & synthetics → Synthetics → Alerts (Legacy)` shows a
deprecation banner. The auto-generated SM alerts that older docs
described **no longer exist**. The replacement is the **per-check
Alerting step** inside each check's edit wizard — three toggles:
Failed Checks, TLS Certificate, Latency. Ticking one writes a real
Grafana alert rule under `Alerts & IRM → Alerting → Alert rules`.

### Notification configuration is one page with tabs

`Contact points`, `Notification policies`, `Templates`, and
`Time intervals` (formerly "Mute timings") are **tabs on a single
page** at `Alerts & IRM → Alerting → Notification configuration`.
Older docs treated them as separate sidebar items.

The nested-policy button is labelled **`+ Add route`**, not "Add
nested policy" as older docs said.

---

## Part 5 — Claude-specific operational notes

### Terminal interaction

Claude drives Instruqt's xterm by pasting into its helper textarea,
then dispatching a keydown Enter:

```js
const xt = [...document.querySelectorAll('.xterm')].find(x => x.getBoundingClientRect().width > 0);
const ta = xt.querySelector('.xterm-helper-textarea');
window.__sendToTerm = (text) => {
  ta.focus();
  const nl = text.endsWith('\n');
  const body = nl ? text.slice(0, -1) : text;
  if (body.length) {
    const dt = new DataTransfer();
    dt.setData('text/plain', body);
    ta.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }
  if (nl) ta.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13 }));
};
```

Do **not** try to drive the terminal with per-character `KeyboardEvent`
dispatches — xterm.js receives both `keydown` and `keypress` and
double-types. Paste events work cleanly.

### Reading terminal output

xterm renders to canvas, so DOM selection returns nothing. Use the
`mcp__claude-in-chrome__computer` `screenshot` action to read what
the terminal shows.

### Sensitive value handling

If a JS return value contains a long base64 string, the browser
harness's safety filter redacts it (`[BLOCKED: Sensitive key]`). To
move a token between tabs or feed it into the terminal, stash it on a
`window.__foo` global (never returned from JS), then either:

- dispatch it through `__sendToTerm` inside the same-tab JS call, or
- have the user paste it from clipboard + `export FOO=...` in the
  shell (which is the right pattern for workshop students anyway).

### Monaco editors

For Monaco-backed inputs (SLO SLI queries, scripted/browser check
scripts):

- `window.monaco.editor.getEditors()[i].setValue(...)` works for
  displaying the value, but React may not pick it up for validation.
- The more reliable path is `mcp__claude-in-chrome__computer` with
  `action: left_click` on the editor ref, then `action: type` for
  each character — React sees the input events and commits state
  correctly.

### Commit + push pattern

The project's remote is `ssh://git@github.com/pilotschenck/k6workshop-dev`
but SSH keys are typically not available to Claude. Push via HTTPS
using the `gh` credential helper:

```bash
git remote set-url origin https://github.com/pilotschenck/k6workshop-dev.git
git push origin main
git remote set-url origin ssh://git@github.com/pilotschenck/k6workshop-dev
```

Sean's local working tree usually has some in-progress changes to
`docs/*/grot.jpg`, `prereqs.sh`, `test-labs.sh`, and a file-mode
diff on scripts. **Stage specific files by name** — never `git add .`
— to avoid sweeping his WIP into a QA commit.

### Git pager hangs the terminal

`git log`, `git diff`, and `git show` pipe through `less` by default on
the Instruqt workstation, and xterm-via-paste has no clean way to
dismiss the pager. Prefix with `GIT_PAGER=cat` or use `git --no-pager
log` / `git log --no-pager -n 5` so output dumps straight to the
terminal.

### Don't burn cloud runs unnecessarily

`k6 cloud run` costs VUh against the workshop stack. Run both the
starter and the solution once each per QA pass; don't re-run them
mid-debug. If lab 09 fails, look at the error text, not the test.

---

## Part 6 — When to stop

A clean QA run ends with:

- All 17 runnable solution labs PASS in the batch
- Lab 09 cloud runs both exit 0 (or surface a known environmental
  issue like `No valid default project found`)
- At least one check of each type exists in the SM UI and shows
  either green or expected validation behavior
- Lab 25 private probe shows a green heart in `Testing & synthetics
  → Synthetics → Probes`
- The commit is pushed and the QA Run report is at the repo root

If all of those are true and nothing else stood out, you're done. The
commit message + the `WORKSHOP_QA_RUN<N>_YYYY-MM-DD.md` report together
are the handoff to the next tester — be specific about what you
verified live vs. what you took on static faith, because the next run
will read it before starting.
