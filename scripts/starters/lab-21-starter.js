// Lab 21 Starter: WebSocket test using k6/experimental/websockets
//
// This script connects to the httpbin WebSocket echo endpoint, sends one
// message, waits for the echo response, then closes the connection.
//
// Run: k6 run scripts/starters/lab-21-starter.js
//
// The ws-echo service (jmalloc/echo-server) runs on port 8765 and echoes
// every WebSocket message frame back unchanged.

import { WebSocket } from 'k6/experimental/websockets';
import { sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '15s',
};

export default function () {
  const ws = new WebSocket('ws://localhost:8765');

  ws.onopen = () => {
    ws.send('hello from k6');
  };

  ws.onmessage = (event) => {
    console.log('received:', event.data);
    ws.close();
  };

  ws.onerror = (error) => {
    console.error('ws error:', error.error());
  };

  // Give the WebSocket connection time to complete before the next iteration
  sleep(2);
}
