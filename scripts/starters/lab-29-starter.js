/**
 * Lab 29 Starter: End-to-End Checkout Flow Load Test
 *
 * Your task: complete every TODO below. The structure is already in place —
 * you need to fill in the implementation.
 *
 * Target endpoints:
 *   GET  http://localhost:3000/api/products
 *   POST http://localhost:3000/login       { username, password }
 *   POST http://localhost:3000/checkout    { cartId, userId }
 *
 * Run:  k6 run scripts/starters/lab-29-starter.js
 */

// Imports — k6's standard modules. Leave these alone.
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// ── Custom business metrics ──────────────────────────────────────────────────
// TODO: declare a Counter named 'orders_placed'
// TODO: declare a Rate named 'checkout_success'

// ── Test users (use SharedArray to load once, share across VUs) ──────────────
// TODO: create a SharedArray called 'users' containing at least two test users:
//   [{ username: 'testuser', password: 'testpass', userId: 'user-001' }, ...]

// ── Options ───────────────────────────────────────────────────────────────────
export const options = {
  // Minimal starter profile so the file is runnable as-is.
  // TODO: replace with the 3-stage ramp described in the lab:
  //   - ramp up to 5 VUs over 30 seconds
  //   - hold 5 VUs for 2 minutes
  //   - ramp down to 0 VUs over 30 seconds
  stages: [
    { duration: '10s', target: 1 },
  ],
  thresholds: {
    // TODO: p95 response time for the browse group < 500ms
    // TODO: p95 response time for the authenticate group < 500ms
    // TODO: p95 response time for the checkout group < 500ms
    // TODO: overall error rate < 1%
    // TODO: checkout_success rate > 99%
  },
};

// ── Default function ──────────────────────────────────────────────────────────
export default function () {
  // TODO: pick a user from the SharedArray (use __VU index or Math.random)
  // const user = users[...];

  let token;
  let productId;

  // ── Group: browse ─────────────────────────────────────────────────────────
  // TODO: wrap in group('browse', () => { ... })
  //   - GET /api/products
  //   - check: status 200
  //   - check: response is a non-empty array
  //   - extract a productId from the first item in the array

  // ── Group: authenticate ───────────────────────────────────────────────────
  // TODO: wrap in group('authenticate', () => { ... })
  //   - POST /login with JSON body { username, password }
  //   - set Content-Type: application/json header
  //   - check: status 200
  //   - check: response body contains a token
  //   - extract the token: token = JSON.parse(res.body).token

  // ── Group: checkout ───────────────────────────────────────────────────────
  // TODO: wrap in group('checkout', () => { ... })
  //   - POST /checkout with JSON body { cartId: 'cart-001', userId: user.userId }
  //   - include Authorization: Bearer <token> header if token was extracted
  //   - check: status is 200 or 201
  //   - check: response body contains order confirmation
  //   - add(1) to orders_placed counter
  //   - add(true/false) to checkout_success rate based on check result

  // TODO: sleep(1)
}
