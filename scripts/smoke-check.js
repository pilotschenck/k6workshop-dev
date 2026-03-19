import { check } from 'k6';
import http from 'k6/http';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    // Allow up to 30% of requests to fail (accommodates broken-app random errors)
    http_req_failed: ['rate<0.3'],
  },
};

export default function () {
  const results = {};

  // --- demo-app ---
  const demoApp = http.get('http://localhost:3000/health');
  results['demo-app'] = check(demoApp, {
    'demo-app: status 200': (r) => r.status === 200,
  });

  // --- broken-app (warn only — may fail due to random errors) ---
  const brokenApp = http.get('http://localhost:3001/health');
  const brokenOk = check(brokenApp, {
    'broken-app: status 200': (r) => r.status === 200,
  });
  if (!brokenOk) {
    console.warn(
      `[WARN] broken-app health check returned ${brokenApp.status} — this is expected occasionally due to random errors`
    );
  }
  results['broken-app'] = brokenOk;

  // --- httpbin ---
  const httpbin = http.get('http://localhost:8080/get');
  results['httpbin'] = check(httpbin, {
    'httpbin: status 200': (r) => r.status === 200,
  });

  // --- wiremock ---
  const wiremock = http.get('http://localhost:8888/api/products');
  results['wiremock'] = check(wiremock, {
    'wiremock: status 200': (r) => r.status === 200,
  });

  // --- influxdb ---
  const influxdb = http.get('http://localhost:8086/ping');
  results['influxdb'] = check(influxdb, {
    'influxdb: status 204': (r) => r.status === 204,
  });

  // --- grafana ---
  const grafana = http.get('http://localhost:3030/api/health');
  results['grafana'] = check(grafana, {
    'grafana: status 200': (r) => r.status === 200,
  });

  // --- prometheus ---
  const prometheus = http.get('http://localhost:9090/-/healthy');
  results['prometheus'] = check(prometheus, {
    'prometheus: status 200': (r) => r.status === 200,
  });

  // --- jaeger ---
  const jaeger = http.get('http://localhost:16686/');
  results['jaeger'] = check(jaeger, {
    'jaeger: status 200': (r) => r.status === 200,
  });

  // --- Summary ---
  const passed = Object.entries(results)
    .filter(([, ok]) => ok)
    .map(([name]) => name);
  const failed = Object.entries(results)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);

  console.log('=== Smoke Check Summary ===');
  console.log(`Services OK    (${passed.length}): ${passed.join(', ') || 'none'}`);
  console.log(`Services FAIL  (${failed.length}): ${failed.join(', ') || 'none'}`);

  if (failed.length === 0) {
    console.log('All services are up and healthy.');
  } else if (failed.length === 1 && failed[0] === 'broken-app') {
    console.log('All required services are healthy. broken-app failure is acceptable.');
  } else {
    console.log('One or more required services are DOWN — fix before running workshop labs.');
  }
}
