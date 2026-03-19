import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 3,
  duration: '30s',
};

export default function () {
  // GET homepage
  const homeRes = http.get(`${BASE_URL}/`);
  check(homeRes, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // GET product listing
  const productsRes = http.get(`${BASE_URL}/api/products`);
  check(productsRes, {
    'products status is 200': (r) => r.status === 200,
    'products returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) || (body.products && Array.isArray(body.products));
      } catch (_) {
        return false;
      }
    },
  });

  sleep(1);

  // POST login
  const loginPayload = JSON.stringify({
    username: 'user1',
    password: 'pass1',
  });
  const loginParams = {
    headers: { 'Content-Type': 'application/json' },
  };
  const loginRes = http.post(`${BASE_URL}/login`, loginPayload, loginParams);
  check(loginRes, {
    'login status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'login response time < 1s': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}
