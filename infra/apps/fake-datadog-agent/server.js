'use strict';

// NOTE: This server handles only the DataDog HTTP API endpoints (agent port 8126).
// DogStatsD metrics are normally sent over UDP port 8125. Supporting UDP would
// require a separate dgram server — this file intentionally omits that, since
// k6 workshop labs use the HTTP output (xk6-output-statsd or Prometheus remote
// write) rather than raw StatsD UDP datagrams.

const http = require('http');

const PORT = 8126;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  if (method === 'POST' && url === '/api/v1/series') {
    const body = await readBody(req);
    const seriesCount = Array.isArray(body.series) ? body.series.length : 0;
    console.log(`[fake-datadog] received ${seriesCount} metric series`);
    send(res, 202, { status: 'ok' });

  } else if (method === 'POST' && url === '/api/v1/check_run') {
    const body = await readBody(req);
    console.log(`[fake-datadog] check_run received:`, JSON.stringify(body));
    send(res, 202, { status: 'ok' });

  } else if (method === 'GET' && url === '/api/v1/validate') {
    console.log('[fake-datadog] API key validation request');
    send(res, 200, { valid: true });

  } else {
    send(res, 404, { error: 'not found' });
  }

  console.log(`${method} ${url} ${res.statusCode}`);
});

server.listen(PORT, () => {
  console.log(`fake-datadog-agent listening on port ${PORT}`);
});
