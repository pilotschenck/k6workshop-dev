import http from 'k6/http';
import { sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  // Starter stages — runs out of the box with a small ramp so you can see
  // the VU count change in the progress line. Replace the targets below
  // with the values from the lab README to feel a bigger ramp.
  //
  // TODO: bump targets to match the lab README example:
  //   Stage 1 — ramp up from 0 to 10 VUs over 30 seconds
  //   Stage 2 — hold at 10 VUs for 1 minute
  //   Stage 3 — ramp down from 10 to 0 VUs over 30 seconds
  //
  // Hint: each stage object takes { duration: '<time>', target: <number> }
  stages: [
    { duration: '10s', target: 3 }, // TODO: ramp up to 10 VUs
    { duration: '30s', target: 3 }, // TODO: sustain 10 VUs
    { duration: '10s', target: 0 }, // ramp down to 0 (correct as-is)
  ],
};

export default function () {
  // Simple GET to the homepage — watch the VU count in the progress line while this runs
  http.get(`${BASE_URL}/`);
  sleep(1);
}
