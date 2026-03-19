// scripts/starters/lab-16-starter.js
// Lab 16: Browser + HTTP Mixed Testing — Starter Script
//
// This script runs two scenarios simultaneously:
//   - api_load:     5 HTTP VUs hitting the demo-app API for 30 seconds
//   - browser_check: 1 browser VU loading the demo-app homepage for 30 seconds
//
// Your job: fill in the TODO sections in apiTest() and browserTest().
//
// Run:
//   K6_BROWSER_HEADLESS=true k6 run scripts/starters/lab-16-starter.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { browser } from 'k6/browser';

export const options = {
  scenarios: {
    api_load: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'apiTest',
    },
    browser_check: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      exec: 'browserTest',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
};

// apiTest runs in the api_load scenario (5 HTTP VUs, no browser).
// TODO: Hit GET /api/products and POST /login.
//       Add checks and a sleep(1) between requests.
export function apiTest() {
  // TODO: GET http://localhost:3000/api/products
  // TODO: check status 200 and response time < 300ms
  // TODO: sleep(1)

  // TODO: POST http://localhost:3000/login with JSON body { username, password }
  // TODO: check that a response was received and response time < 500ms
  // TODO: sleep(1)
}

// browserTest runs in the browser_check scenario (1 browser VU, Chromium).
// This function MUST be async because browser APIs return Promises.
// TODO: Open the demo-app homepage, take a screenshot, check the page title.
export async function browserTest() {
  const page = await browser.newPage();

  try {
    // TODO: await page.goto('http://localhost:3000/');
    // TODO: await page.screenshot({ path: 'mixed-test-screenshot.png' });

    // TODO: read the page title with page.title()
    // TODO: console.log the title
    // TODO: check that the title is not empty

    // TODO: read page body text and check it has content
  } finally {
    await page.close();
  }
}
