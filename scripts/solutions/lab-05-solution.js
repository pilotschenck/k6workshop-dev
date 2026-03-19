import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Switch target with BASE_URL env var (defaults to demo-app):
//   k6 run -e BASE_URL=http://localhost:3001 scripts/solutions/lab-05-solution.js
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// SharedArray initializes once in the init context and shares memory across all VUs.
// In a real test you would load from a file: JSON.parse(open('./users.json'))
// For portability we define the data inline here.
const users = new SharedArray('users', function () {
  return [
    { username: 'user1', password: 'pass1' },
    { username: 'user2', password: 'pass2' },
    { username: 'user3', password: 'pass3' },
    { username: 'user4', password: 'pass4' },
    { username: 'user5', password: 'pass5' },
  ];
});

export const options = {
  vus: 5,
  duration: '30s',
};

export default function () {
  // Select a unique user per VU using modulo so we never go out of bounds.
  // __VU starts at 1, so subtract 1 before the modulo to start at index 0.
  const user = users[(__VU - 1) % users.length];

  // Log which account this VU is using — visible in the k6 terminal output
  console.log(`VU ${__VU} (iter ${__ITER}) using ${user.username}`);

  const payload = JSON.stringify({
    username: user.username,
    password: user.password,
  });
  const params = { headers: { 'Content-Type': 'application/json' } };

  const loginRes = http.post(`${BASE_URL}/login`, payload, params);

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'response has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token !== undefined && body.token.length > 0;
      } catch (_) {
        return false;
      }
    },
  });

  sleep(1);
}
