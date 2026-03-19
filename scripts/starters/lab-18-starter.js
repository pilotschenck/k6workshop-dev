import http from 'k6/http';
import { check, sleep } from 'k6';
import { instrumentHTTP } from 'k6/experimental/tracing';

// instrumentHTTP patches k6's http module so that every request
// automatically receives a W3C traceparent header. Call this once
// in the init context — not inside the default function.
instrumentHTTP({
  propagator: 'w3c',
});

export const options = {
  vus: 2,
  duration: '30s',
};

export default function () {
  // TODO: Make a GET request to http://localhost:3000/api/products
  // and check that status is 200.

  // TODO: Make a POST request to http://localhost:3000/login with
  // body { username: 'user1', password: 'pass1' } and check status is 200.

  // TODO: After the products request, add:
  //   console.log('Request headers: ' + JSON.stringify(productsRes.request.headers));
  // to verify the traceparent header is present.

  sleep(1);
}
