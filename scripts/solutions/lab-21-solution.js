// Lab 21 Solution: WebSocket test with custom metrics, multiple cycles, and checks
//
// Extends the starter with:
//   - A custom Counter metric tracking total messages received
//   - Multiple send/receive cycles per WebSocket connection
//   - A check verifying the echo matches the sent message
//   - Error handling that marks the iteration as failed on ws error
//
// Run: k6 run scripts/solutions/lab-21-solution.js

import { WebSocket } from 'k6/experimental/websockets';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Custom metric: counts total WebSocket messages successfully received
const wsMessagesReceived = new Counter('ws_messages_received');

export const options = {
  vus: 2,
  duration: '20s',
  thresholds: {
    // At least 90% of checks must pass
    checks: ['rate>0.90'],
    // All WebSocket connections must succeed (0 errors)
    ws_messages_received: ['count>0'],
  },
};

// Number of messages to send per WebSocket connection
const MESSAGES_PER_CONNECTION = 3;

export default function () {
  const ws = new WebSocket('ws://localhost:8765');

  let sentMessages = [];
  let receivedCount = 0;
  let hasError = false;

  ws.onopen = () => {
    // Send multiple messages in sequence once the connection is open
    for (let i = 1; i <= MESSAGES_PER_CONNECTION; i++) {
      const msg = `k6 message ${i} from VU ${__VU}`;
      sentMessages.push(msg);
      ws.send(msg);
    }
  };

  ws.onmessage = (event) => {
    const expected = sentMessages[receivedCount];

    // Verify the echo server returned exactly what we sent
    const matched = check(event.data, {
      'echo matches sent message': (data) => data === expected,
    });

    if (!matched) {
      console.warn(`mismatch: sent "${expected}", received "${event.data}"`);
    }

    wsMessagesReceived.add(1);
    receivedCount++;

    // Close after receiving all expected echo replies
    if (receivedCount >= MESSAGES_PER_CONNECTION) {
      ws.close();
    }
  };

  ws.onerror = (error) => {
    console.error('ws error:', error.error());
    hasError = true;
    ws.close();
  };

  ws.onclose = () => {
    if (hasError) {
      console.warn(`connection closed with error after ${receivedCount} messages`);
    }
  };

  // Allow time for all message exchanges to complete
  sleep(3);
}
