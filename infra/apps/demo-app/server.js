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

const server = http.createServer(async (req, res) => {
  const { method, url } = req;
  let status = 200;

  try {
    if (method === 'GET' && url === '/') {
      status = 200;
      send(res, status, { status: 'ok', app: 'demo-app', version: '1.0.0' });

    } else if (method === 'GET' && url === '/health') {
      status = 200;
      send(res, status, { status: 'healthy' });

    } else if (method === 'GET' && url === '/api/products') {
      status = 200;
      send(res, status, PRODUCTS);

    } else if (method === 'POST' && url === '/login') {
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
  console.log(`demo-app listening on port ${PORT}`);
});
