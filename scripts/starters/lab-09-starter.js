// scripts/starters/lab-09-starter.js
// Lab 09: k6 Cloud Run — Starter Script
//
// This script hits three demo-app endpoints with 2 VUs for 30 seconds.
// Run it locally first, then send it to Grafana Cloud k6 with `k6 cloud run`.

import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 2,
  duration: '30s',
};

export default function () {
  // Home page
  http.get('http://localhost:3000/');

  sleep(1);

  // Product catalog
  http.get('http://localhost:3000/api/products');

  sleep(1);

  // Login endpoint
  const payload = JSON.stringify({
    username: 'testuser',
    password: 'password123',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  http.post('http://localhost:3000/login', payload, params);

  sleep(1);
}
