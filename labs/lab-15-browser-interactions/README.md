# Lab 15: Browser Interactions - Forms, Clicks, and Waits

**Time:** 20 min | **Module:** Module 4 - Browser Testing

## Overview

Navigating to a page is only the beginning. Real user journeys involve filling in forms, clicking buttons, waiting for dynamic content to appear, and verifying results. This lab covers the core browser interaction APIs in k6: locators, `fill()`, `click()`, `waitForNavigation()`, `waitForSelector()`, and `evaluate()`.

## What You'll Learn

- How to locate page elements using `page.locator()`
- How to fill text inputs and submit forms
- How to wait for navigation and dynamic content
- How to assert page content after an interaction
- How to run arbitrary JavaScript inside the page with `page.evaluate()`
- How to handle errors in browser scripts with try/catch

## Prerequisites

- Lab 14 (k6 Browser - Intro and Page Navigation)

## Instructions

### Step 1: Navigate to the Form Page

httpbin provides a simple HTML form at `/forms/post`. Navigate to it first to see what you're working with:

```bash
curl http://localhost:8080/forms/post
```

Open the starter script:

```bash
cat /home/aschenck/lab/k6workshop-dev/scripts/starters/lab-15-starter.js
```

The starter already has the scenario configuration and `page.goto()` call. Your job is to fill in the TODO sections.

### Step 2: Fill in Form Fields

Use `page.locator()` with a CSS selector to find an input element, then call `.fill()`:

```javascript
await page.locator('input[name="custname"]').fill('Test User');
await page.locator('input[name="custtel"]').fill('555-1234');
await page.locator('input[name="custemail"]').fill('test@example.com');
```

`locator()` is lazy — it does not query the DOM until you call an action method like `fill()`, `click()`, or `textContent()`. This means you can define locators before the element exists.

### Step 3: Click the Submit Button

```javascript
await page.locator('input[type="submit"]').click();
```

After clicking submit on an HTML form, the browser navigates to a new page. You need to wait for that navigation to complete before interacting with the result.

### Step 4: Wait for Navigation

Wrap the click and the wait together. The recommended pattern is to initiate navigation and wait simultaneously:

```javascript
await Promise.all([
  page.waitForNavigation(),
  page.locator('input[type="submit"]').click(),
]);
```

`waitForNavigation()` resolves when the browser fires the `load` event on the new page. Without this wait, subsequent calls will run against the old page or fail because the new page hasn't loaded yet.

### Step 5: Assert the Result Page

After the form submission, httpbin returns a JSON response page showing the submitted data. Check that the page content contains the submitted name:

```javascript
import { check } from 'k6';

// ...

const bodyText = await page.locator('body').textContent();
check(bodyText, {
  'response contains submitted name': (t) => t.includes('Test User'),
  'response contains custname field': (t) => t.includes('custname'),
});
```

### Step 6: Wait for a Specific Element

For pages where content appears dynamically (after a fetch or animation), use `waitForSelector()`:

```javascript
// Wait up to 5 seconds for an element with class "result" to appear
await page.waitForSelector('.result', { timeout: 5000 });
```

The httpbin result page does not have dynamic content, but this pattern is essential for single-page applications. Add it to your script after navigation as a demonstration:

```javascript
// Wait for the pre element that contains the JSON response
await page.waitForSelector('pre');
const preText = await page.locator('pre').textContent();
console.log(`Response body: ${preText.substring(0, 100)}`);
```

### Step 7: Run JavaScript Inside the Page

`page.evaluate()` lets you execute arbitrary JavaScript in the browser context and return the result to k6:

```javascript
const url = await page.evaluate(() => window.location.href);
console.log(`Current URL: ${url}`);

const inputCount = await page.evaluate(
  () => document.querySelectorAll('input').length
);
console.log(`Found ${inputCount} input elements`);
```

This is useful for reading computed values, scrolling the page, or triggering events that locators cannot reach.

### Step 8: Error Handling

Wrap browser interactions in try/catch so that a single failure does not crash the VU without cleanup:

```javascript
export default async function () {
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:8080/forms/post');

    await page.locator('input[name="custname"]').fill('Test User');

    await Promise.all([
      page.waitForNavigation(),
      page.locator('input[type="submit"]').click(),
    ]);

    const bodyText = await page.locator('body').textContent();
    check(bodyText, {
      'form submission succeeded': (t) => t.includes('Test User'),
    });
  } catch (e) {
    console.error(`Browser interaction failed: ${e.message}`);
  } finally {
    await page.close();
  }
}
```

The `finally` block ensures the page is always closed, even when `catch` runs.

### Step 9: Run the Full Solution

```bash
k6 run /home/aschenck/lab/k6workshop-dev/scripts/solutions/lab-15-solution.js
```

## Expected Output

```
INFO[0003] Response body: {
  "custname": "Test User",
  "custtel": "555-1234",   source=console
INFO[0003] Current URL: http://localhost:8080/post        source=console
INFO[0003] Found 1 input elements on result page         source=console

✓ response contains submitted name
✓ response contains custname field
✓ form submission succeeded

     checks.........................: 100.00% ✓ 3  ✗ 0
     browser_dom_content_loaded.....: avg=120ms
     browser_first_contentful_paint.: avg=145ms
```

## Key Takeaways

- `page.locator(selector)` finds elements by CSS selector; action methods like `.fill()` and `.click()` are async and must be awaited.
- Combine `page.waitForNavigation()` and `.click()` in a `Promise.all()` to avoid race conditions.
- `page.waitForSelector()` is essential for SPAs where content loads after the initial page render.
- `page.evaluate()` runs JavaScript inside the browser and returns results to the k6 VU context.
- Always use try/catch with `page.close()` in a `finally` block to ensure proper cleanup.
