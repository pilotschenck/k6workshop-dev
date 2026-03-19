import http from 'k6/http';
import { check, sleep } from 'k6';

// Use BASE_URL env var to switch between demo-app and broken-app without editing the script.
// Default points at demo-app. To target broken-app run:
//   k6 run -e BASE_URL=http://localhost:3001 scripts/starters/lab-02-starter.js
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 5,
  duration: '30s',

  // TODO: Add a thresholds block here.
  // Requirements:
  //   - p(95) of http_req_duration must be under 500 ms
  //   - http_req_failed rate must be below 5% (0.05)
  //   - checks pass rate must be above 95% (0.95)
  //
  // thresholds: {
  //   'http_req_duration': [...],
  //   'http_req_failed':   [...],
  //   'checks':            [...],
  // },
};

export default function () {
  // GET homepage
  const res = http.get(`${BASE_URL}/`);

  // TODO: Add a check() call that validates:
  //   1. The HTTP status code is 200
  //   2. The response time is under 500 ms  (hint: r.timings.duration)
  //   3. The response body is not empty
  //
  // check(res, {
  //   'status is 200': (r) => ...,
  //   'response time < 500ms': (r) => ...,
  //   'body is not empty': (r) => ...,
  // });

  sleep(1);
}
