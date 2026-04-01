'use strict';

const http = require('http');

const PORT = 3000;

const PRODUCTS = [
  { id: 1, name: 'Wireless Headphones', price: 79.99, category: 'electronics' },
  { id: 2, name: 'Running Shoes', price: 119.99, category: 'clothing' },
  { id: 3, name: 'Coffee Maker', price: 49.99, category: 'kitchen' },
  { id: 4, name: 'Yoga Mat', price: 34.99, category: 'fitness' },
  { id: 5, name: 'Mechanical Keyboard', price: 159.99, category: 'electronics' },
];

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const HTML_HOME = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Broken App — k6 Workshop</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #111217; color: #d0d0d0; font-family: 'Segoe UI', system-ui, sans-serif; padding: 2rem; }
    header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid #2a2e36; padding-bottom: 1.5rem; }
    header svg { flex-shrink: 0; }
    header h1 { font-size: 1.6rem; font-weight: 600; color: #fff; }
    header p { color: #8a8a9a; font-size: 0.9rem; margin-top: 0.25rem; }
    .badge { display: inline-block; background: #3a1e1e; color: #e06c75; font-size: 0.75rem; font-weight: 600; padding: 0.15rem 0.55rem; border-radius: 999px; border: 1px solid #6b2d2d; }
    .grid { display: grid; gap: 1rem; }
    .card { background: #1a1d24; border: 1px solid #2a2e36; border-radius: 8px; padding: 1.25rem 1.5rem; }
    .card h2 { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #8a8a9a; margin-bottom: 1rem; }
    .endpoint { display: grid; grid-template-columns: 70px 180px 1fr; align-items: start; gap: 0.75rem; padding: 0.6rem 0; border-bottom: 1px solid #2a2e36; }
    .endpoint:last-child { border-bottom: none; padding-bottom: 0; }
    .method { font-family: monospace; font-size: 0.78rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 4px; text-align: center; }
    .get  { background: #1a3a5c; color: #61afef; }
    .post { background: #2b3a1a; color: #98c379; }
    .path { font-family: monospace; font-size: 0.88rem; color: #fff; padding-top: 0.15rem; }
    .desc { font-size: 0.85rem; color: #a0a0b0; padding-top: 0.15rem; }
    .alert { background: #1e1510; border: 1px solid #5c3a1a; border-radius: 6px; padding: 0.9rem 1.1rem; font-size: 0.85rem; color: #e5c07b; }
    .alert strong { color: #ff9f43; }
    .example-block { background: #0d0f14; border: 1px solid #2a2e36; border-radius: 6px; padding: 1rem 1.25rem; }
    .example-block h2 { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #8a8a9a; margin-bottom: 0.75rem; }
    pre { font-family: 'Cascadia Code', 'Fira Code', monospace; font-size: 0.8rem; color: #abb2bf; line-height: 1.7; overflow-x: auto; white-space: pre; }
    .comment { color: #5c6370; }
    .url { color: #e5c07b; }
    .flag { color: #61afef; }
    .string { color: #98c379; }
  </style>
</head>
<body>
  <header>
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#c0392b"/>
      <text x="20" y="27" text-anchor="middle" font-size="20" font-family="monospace" font-weight="bold" fill="#fff">k6</text>
    </svg>
    <div>
      <h1>Broken App <span class="badge">degraded</span></h1>
      <p>Workshop target API &mdash; version 1.0.0 &nbsp;&bull;&nbsp; port 3001</p>
    </div>
  </header>

  <div class="grid">
    <div class="alert">
      <strong>Heads up:</strong> This service has known reliability issues. Use k6 to find out what's wrong.
    </div>

    <div class="card">
      <h2>Endpoints</h2>
      <div class="endpoint">
        <span class="method get">GET</span>
        <span class="path">/</span>
        <span class="desc">App status &amp; version info</span>
      </div>
      <div class="endpoint">
        <span class="method get">GET</span>
        <span class="path">/health</span>
        <span class="desc">Health check</span>
      </div>
      <div class="endpoint">
        <span class="method get">GET</span>
        <span class="path">/api/products</span>
        <span class="desc">Returns the full product catalogue (JSON array)</span>
      </div>
      <div class="endpoint">
        <span class="method post">POST</span>
        <span class="path">/login</span>
        <span class="desc">Authenticate — body: <code>{"username":"…","password":"…"}</code></span>
      </div>
      <div class="endpoint">
        <span class="method post">POST</span>
        <span class="path">/checkout</span>
        <span class="desc">Place an order — body: <code>{"cartId":"…","userId":1}</code></span>
      </div>
    </div>

    <div class="example-block">
      <h2>Quick curl examples</h2>
      <pre><span class="comment"># List products</span>
curl <span class="url">http://localhost:3001/api/products</span>

<span class="comment"># Login</span>
curl <span class="flag">-X POST</span> <span class="url">http://localhost:3001/login</span> \\
     <span class="flag">-H</span> <span class="string">'Content-Type: application/json'</span> \\
     <span class="flag">-d</span> <span class="string">'{"username":"alice","password":"secret"}'</span>

<span class="comment"># Checkout</span>
curl <span class="flag">-X POST</span> <span class="url">http://localhost:3001/checkout</span> \\
     <span class="flag">-H</span> <span class="string">'Content-Type: application/json'</span> \\
     <span class="flag">-d</span> <span class="string">'{"cartId":"cart-42","userId":1}'</span></pre>
    </div>
  </div>
</body>
</html>`;

function sendHTML(res, html) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': Buffer.byteLength(html) });
  res.end(html);
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;
  let status = 200;

  // FLAW: 20% of ALL requests return 500
  if (Math.random() < 0.20) {
    status = 500;
    send(res, status, { error: 'internal server error', detail: 'random failure' });
    console.log(`${method} ${url} ${status}`);
    return;
  }

  try {
    if (method === 'GET' && url === '/') {
      sendHTML(res, HTML_HOME);
      console.log(`${method} ${url} 200`);
      return;

    } else if (method === 'GET' && url === '/health') {
      status = 200;
      send(res, status, { status: 'healthy' });

    } else if (method === 'GET' && url === '/api/products') {
      // FLAW: 10% of product requests are delayed by 2000ms
      if (Math.random() < 0.10) {
        await sleep(2000);
      }
      status = 200;
      send(res, status, PRODUCTS);

    } else if (method === 'POST' && url === '/login') {
      // FLAW: 30% chance the auth service is "unavailable"
      if (Math.random() < 0.30) {
        status = 503;
        send(res, status, { error: 'auth service unavailable' });
        console.log(`${method} ${url} ${status}`);
        return;
      }
      const body = await readBody(req);
      if (!body.username || !body.password) {
        status = 400;
        send(res, status, { error: 'missing required fields: username, password' });
      } else {
        status = 200;
        send(res, status, { token: 'fake-jwt-token-abc123', userId: 1 });
      }

    } else if (method === 'POST' && url === '/checkout') {
      const body = await readBody(req);
      if (!body.cartId || !body.userId) {
        status = 400;
        send(res, status, { error: 'missing required fields: cartId, userId' });
      } else {
        status = 201;
        send(res, status, { orderId: 'ord-123', total: 99.99, status: 'confirmed' });
      }

    } else {
      status = 404;
      send(res, status, { error: 'not found' });
    }
  } catch (err) {
    status = 500;
    send(res, status, { error: 'internal server error' });
  }

  console.log(`${method} ${url} ${status}`);
});

server.listen(PORT, () => {
  console.log(`broken-app listening on port ${PORT}`);
});
