# Lab 23: SLOs and Error Budgets

**Time:** 20 min | **Module:** Module 3 — Advanced

## Overview

A **Service Level Objective (SLO)** is a reliability target for a service over a fixed time window: "99.5% of synthetic checks must pass over the last 30 days." Grafana Synthetic Monitoring has a built-in SLO feature that computes uptime and error budgets directly from your check results and displays them in a purpose-built dashboard.

SLOs give engineering teams a shared, measurable answer to "how reliable has this service been?" They also provide a principled framework for deciding when to ship features vs. when to focus on reliability work.

> **DataDog comparison:** DataDog SLOs are a separate product configuration in DD Monitors, and correlating them with dashboard data or alert context requires jumping between views. Grafana SLOs live in the same platform as your dashboards, alerts, and synthetic checks — no context switching. Grafana also ships burn rate alerts out of the box; in DataDog, burn rate alerting requires manual monitor configuration.

## What You'll Learn

- The definitions of SLI, SLO, error budget, and burn rate
- How to create an SLO in Grafana SM backed by your HTTP check results
- How to read an SLO dashboard: status, remaining budget, burn rate
- How to configure fast-burn and slow-burn rate alerts on an SLO
- How to interpret error budget math and apply it to engineering decisions

## Prerequisites

- Lab 10 completed — at least one HTTP check running in Synthetic Monitoring with several hours of data
- Lab 22 recommended — familiarity with Grafana Alerting contact points (used for SLO alerts)

## Key Concepts

Before creating an SLO, make sure these four terms are clear:

**SLI — Service Level Indicator**
The measurement. For synthetic monitoring, the SLI is the fraction of check runs that returned a successful result: `successful_checks / total_checks`. A value of 1.0 means every check passed; 0.995 means 99.5% passed.

**SLO — Service Level Objective**
The target. You commit that the SLI will stay at or above a threshold over a rolling time window. Example: "SLI >= 99.5% over the last 30 days."

**Error Budget**
The allowed headroom for failures. If the SLO target is 99.5% over 30 days, you can afford 0.5% of checks to fail. For a check running every minute (43,200 runs per month), that is 216 allowed failures — roughly 3.6 hours of total downtime spread over the month.

**Burn Rate**
How fast you are consuming your error budget relative to the baseline pace. A burn rate of 1.0× means you are on track to use exactly 100% of the budget by the end of the window. A burn rate of 14× means failures are occurring 14 times faster than the baseline — at that rate you exhaust the budget in roughly 2 days (30 days / 14 ≈ 2.1 days).

## Instructions

### Step 1: Navigate to SLOs in Synthetic Monitoring

1. In your Grafana Cloud stack, navigate to **Synthetic Monitoring** in the left sidebar
2. Click **SLOs** in the SM sub-navigation

If the SLO section is not visible, it may be accessible via the main Grafana navigation under **SLO** (a separate plugin). Both surfaces manage the same SLO data.

You will see an empty list. You are about to create your first SLO.

### Step 2: Create a New SLO

Click **Create SLO** (or **Add SLO**) and fill in the form:

**Basic information**

| Field | Value |
|-------|-------|
| Name | `Workshop Demo SLO` |
| Description | `Uptime SLO for the Workshop Demo HTTP check` |

**SLI definition**

- SLI type: **Success rate** (ratio of successful checks to total checks)
- Check: select **Workshop Demo** (the HTTP check from Lab 10)
- Grafana populates the underlying metric automatically — it uses `probe_success` from your SM data

**Objective**

| Field | Value |
|-------|-------|
| Target | `99.5%` |
| Rolling window | `30 days` |

99.5% is a realistic target for a public endpoint in a workshop environment. A stricter target (99.9%) would be harder to maintain during the lab exercises where you intentionally break the check.

Click **Save** to create the SLO.

### Step 3: Read the SLO Dashboard

After saving, Grafana automatically opens a dashboard scoped to your new SLO. It has several sections:

**Current status badge**
One of three states:
- **In budget** (green): actual SLI is above the target; error budget is positive
- **Breach risk** (yellow): burn rate is elevated; you may exhaust the budget before the window ends
- **Breached** (red): the SLI has fallen below the target for the current window

**Error budget remaining**
A percentage gauge and a minutes/hours number. This is the most actionable single number on the page — it tells you how much runway you have. If the budget is 78% remaining, you have consumed 22% of your allowed failures for this 30-day window.

**Burn rate graph**
A time series chart showing current burn rate vs. the 1× baseline. The 1× line is the neutral reference — at exactly 1× you would use exactly 100% of the budget by day 30. A spike to 10× during an outage is immediately visible here, even if the overall error budget remaining looks healthy.

**SLO compliance chart**
A historical view of how the SLI has compared to the target over the window. Green area = in target, red area = below target. This is the "did we meet our SLO?" chart for past post-mortems or monthly reliability reviews.

### Step 4: Configure Burn Rate Alerts

A single alert on "SLO breached" is too late — by the time you breach, the budget is gone. Burn rate alerts give you advance warning at two horizons:

**Fast burn alert (page-worthy)**
Fires when burn rate exceeds 14× for 5 minutes. At 14×, the 30-day budget is exhausted in ~2 days. This warrants immediate investigation.

**Slow burn alert (ticket-worthy)**
Fires when burn rate exceeds 3× for 60 minutes. At 3×, the budget is exhausted in ~10 days. This is not an emergency but warrants a reliability investigation before the budget runs out.

To add burn rate alerts to your SLO:

1. From the SLO dashboard, click **Edit SLO** (or navigate back to the SLO list and click Edit)
2. Find the **Alerting** section
3. Click **Add alert**

Configure the fast burn alert:

| Field | Value |
|-------|-------|
| Alert name | `Workshop Demo — fast burn` |
| Burn rate threshold | `14` |
| Window | `5m` |
| Severity label | `critical` |

Click **Add alert** again and configure the slow burn alert:

| Field | Value |
|-------|-------|
| Alert name | `Workshop Demo — slow burn` |
| Burn rate threshold | `3` |
| Window | `60m` |
| Severity label | `warning` |

Save the SLO. Grafana creates the underlying Grafana Alerting rules automatically.

### Step 5: Understand the Error Budget Math

Work through a concrete scenario so the numbers feel intuitive.

**Setup:**
- SLO target: 99.5% over 30 days
- Check frequency: 1 minute
- Total check runs in 30 days: 30 × 24 × 60 = 43,200 runs

**Error budget calculation:**
- Allowed failure rate: 100% − 99.5% = 0.5%
- Allowed failures: 43,200 × 0.005 = **216 check failures** (≈ 3.6 hours of consecutive downtime)

**Burn scenario:**
Your check fails continuously for 10 minutes (10 consecutive failed runs).

- Budget consumed: 10 / 216 = **4.6% of monthly budget in 10 minutes**
- Burn rate during that period: (10 failures / 10 minutes) ÷ (216 failures / 43,200 minutes) = 10 ÷ 0.005 = **200× burn rate**

A 10-minute outage is relatively minor in absolute terms, but at 200× burn rate, the fast-burn alert fires within seconds. That is exactly the intent — high burn rate means the situation is serious even if the budget percentage consumed looks small.

### Step 6: Error Budget Policies

An error budget policy is a team agreement about how remaining budget drives engineering decisions. These are not Grafana features — they are agreements you write down and post somewhere visible. Grafana gives you the data; the policy is how your team acts on it.

A common four-level policy:

| Error budget remaining | Action |
|-----------------------|--------|
| > 50% | Ship freely; the reliability position is strong |
| 20% – 50% | Exercise caution; every deployment carries reliability risk |
| < 20% | Stop feature work; prioritize reliability improvements and root cause analysis |
| 0% (exhausted) | Feature freeze until the next period; mandatory reliability sprint |

Post this policy in your team's Slack channel or engineering wiki. When the SLO dashboard shows budget remaining, any engineer can look at the policy and know what mode the team should be in — no manager decision required.

> **Important:** The policy works only if engineers trust the SLI measurement. Synthetic Monitoring probes are independent of your application infrastructure, so they measure what real users experience. This is a meaningful property — a SLI based on internal metrics can look healthy during an outage if the metrics pipeline is broken too.

### Step 7: Simulate a Budget Burn

Optionally trigger a real budget burn to see the dashboard update.

1. In **Synthetic Monitoring > Checks**, click on **Workshop Demo** and click **Edit**
2. Change the URL to `https://grafana.com/thispagedoesnotexist` (returns 404, fails the assertion)
3. Save — the check starts failing on every probe run
4. Wait 3–5 minutes, then return to the SLO dashboard
5. Observe: error budget remaining has decreased; burn rate graph shows a spike above 1×

Restore the check:

1. Edit the check again and restore the URL to `https://grafana.com`
2. Save — the check resumes passing; burn rate returns to 0×; budget stops decreasing (it does not recover within the 30-day window — failures are permanent until the window rolls forward)

The fact that budget does not recover is the point. Each failure has a real, lasting cost within the window. This is what makes the budget finite and meaningful.

## Expected Output

After completing the lab:

- The SLO list shows **Workshop Demo SLO** with status **In budget** and a target of 99.5%
- The SLO dashboard shows error budget remaining, a flat burn rate graph near 1×, and green compliance history
- Two burn rate alert rules appear in **Alerting > Alert Rules**: one for fast burn (14× / 5m) and one for slow burn (3× / 60m)
- If you ran the simulation in Step 7, the error budget remaining is slightly below 100%, and the burn rate graph shows a spike during the failure window

## Key Takeaways

- SLI measures what users experience; SLO sets the reliability target; error budget is the finite allowance for failure within a window
- Burn rate tells you how fast the budget is being consumed — it is a leading indicator that gives you time to act before a breach
- Configure two burn rate alerts per SLO: fast-burn (page-worthy, ~2 days to exhaustion) and slow-burn (ticket-worthy, ~10 days to exhaustion)
- Error budget policies turn a number on a dashboard into an agreed-upon engineering action — write the policy down and share it with the team
- Grafana SM SLOs live in the same platform as your dashboards, alerts, and check configurations — no cross-product navigation required
