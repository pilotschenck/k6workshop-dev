import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Ramp-up → sustain → ramp-down using the simple `stages` shorthand.
// Total test duration: 10s + 30s + 10s = 50 seconds.
export const options = {
  stages: [
    { duration: '10s', target: 5 }, // ramp up to 5 VUs over 10 seconds
    { duration: '30s', target: 5 }, // hold at 5 VUs for 30 seconds
    { duration: '10s', target: 0 }, // ramp down to 0 VUs over 10 seconds
  ],
};

// BONUS: The block below shows the equivalent using the explicit `scenarios` API.
// Uncomment it (and comment out the `stages` options above) to try the ramping-vus executor directly.
//
// export const options = {
//   scenarios: {
//     load_profile: {
//       executor: 'ramping-vus',
//       startVUs: 0,
//       stages: [
//         { duration: '10s', target: 5 },
//         { duration: '30s', target: 5 },
//         { duration: '10s', target: 0 },
//       ],
//       // gracefulRampDown gives in-flight iterations time to finish when VUs are removed.
//       gracefulRampDown: '10s',
//     },
//   },
// };

export default function () {
  const res = http.get(`${BASE_URL}/`);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
