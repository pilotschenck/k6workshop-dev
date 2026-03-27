'use strict';

const WebSocket = require('ws');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    ws.send(message.toString());
  });
});

console.log(`WebSocket echo server listening on port ${PORT}`);
