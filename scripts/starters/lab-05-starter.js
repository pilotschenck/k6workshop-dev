import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// SharedArray loads data once in the init context and shares it across all VUs.
// TODO: Replace the inline array below with a SharedArray that loads data from an external JSON file.
//
// Hint:
//   const users = new SharedArray('users', function () {
//     return JSON.parse(open('./users.json'));
//   });
//
// For now we define five users inline so the starter runs without an external file.
const users = new SharedArray('users', function () {
  // TODO: Replace this with open('./users.json') to load from a file
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
  // TODO: Select a unique user for this VU using __VU and modulo arithmetic.
  //       Hint: users[(__VU - 1) % users.length]
  const user = users[0]; // replace this line

  const payload = JSON.stringify({
    username: user.username,
    password: user.password,
  });

  // TODO: POST to /login with Content-Type: application/json
  //       Then add check() calls to validate status is 200 and body contains a token
  const params = { headers: { 'Content-Type': 'application/json' } };
  const res = http.post(`${BASE_URL}/login`, payload, params);

  // TODO: Add checks here
  check(res, {});

  // TODO: Log which user is being used: console.log(`VU ${__VU} using ${user.username}`);

  sleep(1);
}
