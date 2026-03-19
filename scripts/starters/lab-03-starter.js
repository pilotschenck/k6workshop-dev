import http from 'k6/http';
import { sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  // TODO: Replace these placeholder stages with a real ramp-up / sustain / ramp-down pattern.
  //
  // Goal:
  //   Stage 1 — ramp up from 0 to 5 VUs over 10 seconds
  //   Stage 2 — hold at 5 VUs for 30 seconds
  //   Stage 3 — ramp down from 5 to 0 VUs over 10 seconds
  //
  // Hint: each stage object takes { duration: '<time>', target: <number> }
  stages: [
    { duration: '10s', target: 0 }, // TODO: set the correct target
    { duration: '30s', target: 0 }, // TODO: set the correct target
    { duration: '10s', target: 0 }, // TODO: set the correct target
  ],
};

export default function () {
  // Simple GET to the homepage — watch the VU count in the progress line while this runs
  http.get(`${BASE_URL}/`);
  sleep(1);
}
