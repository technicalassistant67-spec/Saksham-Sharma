/**
 * SafeCross Standalone Node.js WebSocket Relay Server
 * Run on a laptop via: node server.js
 * Default port: 8080 (or process.env.PORT)
 * No database. In-memory only. Zero API keys.
 */

import http from 'http';
import { WebSocketServer } from 'ws';
import { RelayManager } from './relay_manager.js';

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', name: 'SafeCross Relay Server', time: Date.now() }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('SafeCross WebSocket Relay Server running on port ' + PORT);
});

const wss = new WebSocketServer({ server });
const relay = new RelayManager();

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress || 'unknown';
  relay.registerConnection(ws, ip);

  ws.on('message', (data) => {
    relay.handleMessage(ws, data);
  });

  ws.on('close', () => {
    relay.handleDisconnect(ws);
  });

  ws.on('error', () => {
    relay.handleDisconnect(ws);
  });
});

// Periodic cleanup of expired participants (every 10 seconds)
setInterval(() => {
  relay.cleanupExpiredSessions();
}, 10000);

server.listen(PORT, HOST, () => {
  console.log(`[SafeCross Relay] WebSocket server active on ws://${HOST}:${PORT}`);
  console.log(`[SafeCross Relay] Connect phones via ws://<LAPTOP_LOCAL_IP>:${PORT}`);
});
