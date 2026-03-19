# Lab 14: k6 Browser - Intro and Page Navigation

**Time:** 15 min | **Module:** Module 4 - Browser Testing

## Overview

k6 includes a built-in browser module powered by Chromium. Unlike the HTTP API in k6, the browser module drives a real browser, letting you test JavaScript-rendered pages, measure Web Vitals, and capture screenshots — all from the same k6 script structure you already know.

In this lab you will write your first browser test, navigate to a page, capture a screenshot, and retrieve the page title.

> **k6 Studio & HAR conversion:** k6 Studio is a desktop application that lets you record browser scripts visually by browsing your target site. On Instruqt, use the `k6 har-convert` CLI with a provided HAR file to generate a browser script from a recording instead.

## What You'll Learn

- How the k6 browser module relates to standard k6 scripts
- How to configure a scenario to use the `chromium` browser executor
- How to open a page with `browser.newPage()` and `page.goto()`
- How to capture a screenshot with `page.screenshot()`
- How to retrieve and check the page title with `page.title()`
- The importance of the `K6_BROWSER_HEADLESS` environment variable in CI

## Prerequisites

- Labs 01–03 (k6 basics, checks, stages)
- The lab environment running (`docker compose up -d`)

## Instructions

### Step 1: Understand the k6 Browser Module

The browser module ships with k6 — no extra install needed. It wraps Chromium using the Chrome DevTools Protocol (CDP), the same protocol Playwright and Puppeteer use.

Key differences from HTTP scripts:

| HTTP scripts | Browser scripts |
|---|---|
| `import http from 'k6/http'` | `import { browser } from 'k6/browser'` |
| Synchronous | Async/await required |
| No UI | Full Chromium browser |
| Lightweight | Higher resource usage per VU |

> **CI environments:** Set `K6_BROWSER_HEADLESS=true` (or the `headless: true` scenario option) when running in environments without a display server. On Instruqt, headless mode is already the default.

### Step 2: Script Structure for Browser Tests

Browser tests use the `chromium` executor in a named scenario. The default function must be `async` because browser APIs return Promises.

Open the starter script:

```bash
cat /home/aschenck/lab/k6workshop-dev/scripts/starters/lab-14-starter.js
```

The scenario block looks like this:

```javascript
export const options = {
  scenarios: {
    browser_test: {
      executor: 'shared-iterations',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
};
```

### Step 3: Navigate to a Page

The demo app returns JSON, so this lab uses httpbin's HTML endpoint at `http://localhost:8080/html`.

```javascript
import { browser } from 'k6/browser';

export default async function () {
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:8080/html');
    // page is now loaded
  } finally {
    await page.close();
  }
}
```

Always close the page in a `finally` block so resources are released even when assertions fail.

### Step 4: Take a Screenshot

Add a screenshot call after navigation:

```javascript
await page.screenshot({ path: 'screenshot.png' });
```

Run the script and verify the file was created:

```bash
k6 run /home/aschenck/lab/k6workshop-dev/scripts/starters/lab-14-starter.js
ls -lh screenshot.png
```

The screenshot file is written to the current working directory.

### Step 5: Get the Page Title

```javascript
const title = await page.title();
console.log(`Page title: ${title}`);
```

Combine this with a k6 `check()` to make the title assertion part of your pass/fail criteria:

```javascript
import { check } from 'k6';
import { browser } from 'k6/browser';

// ...

const title = await page.title();
check(title, {
  'page title is not empty': (t) => t.length > 0,
});
```

### Step 6: Run the Full Solution

```bash
k6 run /home/aschenck/lab/k6workshop-dev/scripts/solutions/lab-14-solution.js
```

Watch the terminal output. You will see browser-specific metrics alongside the standard k6 metrics.

### Step 7: Review Browser Logs in the Output

k6 forwards `console.log`, `console.warn`, and `console.error` calls from the browser page to the k6 output stream. Look for lines prefixed with `INFO` that contain your `console.log` calls.

## Expected Output

```
          /\      |‾‾| /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / __________ \  |__| \__\ \_____/ .io

  execution: local
     script: lab-14-solution.js
     output: -

  scenarios (100.00%) 1 scenario, 1 max VUs, 10m30s max duration (incl. graceful stop):
           * browser_test: 1 iterations shared [exec: default] ...

INFO[0002] Page title: Herman Melville - Moby-Dick       source=console

✓ page title is not empty

     browser_dom_content_loaded.....: avg=...
     browser_first_contentful_paint.: avg=...
     browser_loaded..................: avg=...
     checks.........................: 100.00% ✓ 1  ✗ 0
```

A `screenshot.png` file appears in the current directory.

## Key Takeaways

- The k6 browser module uses real Chromium — no separate browser install required.
- Browser scenarios require the `chromium` executor type and an `async` default function.
- `browser.newPage()` opens a new browser tab; always `await page.close()` in a `finally` block.
- `page.screenshot()` writes a PNG to disk; useful for visual debugging.
- Set `K6_BROWSER_HEADLESS=true` in CI environments that lack a display server.
- Browser tests automatically collect Web Vitals metrics (FCP, LCP, etc.) alongside standard k6 metrics.
