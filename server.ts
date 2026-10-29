/**
 * SafeCross Fullstack Server Entry Point
 * Mounts Express + Vite middlewares in dev + Integrated WebSocket Relay Server on Port 3000
 */

import http from 'http';
import express from 'express';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { RelayManager } from './server/relay_manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    return parseInt(process.argv[portArgIndex + 1], 10);
  }
  // In AI Studio, nginx listens on 8080 and proxies to 3000.
  // Therefore, the Node app server must always listen on 3000.
  if (process.env.PORT && process.env.PORT !== '8080') {
    return parseInt(process.env.PORT, 10);
  }
  return 3000;
}

function getHost(): string {
  const hostArgIndex = process.argv.indexOf('--host');
  if (hostArgIndex !== -1 && process.argv[hostArgIndex + 1]) {
    return process.argv[hostArgIndex + 1];
  }
  return '0.0.0.0';
}

const PORT = getPort();
const HOST = getHost();

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  const relay = new RelayManager();

  // WebSocket Server attached to HTTP server
  const wss = new WebSocketServer({
    server,
    // Accept connections on /ws or root /
    verifyClient: (info, done) => {
      done(true);
    },
  });

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

  // Periodic cleanup of expired participants (> 60s without fix)
  setInterval(() => {
    relay.cleanupExpiredSessions();
  }, 10000);

  // Health and API routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'SafeCross Fullstack Server',
      stats: relay.getStats(),
      timestamp: Date.now(),
    });
  });

  // Check if running in production or development
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Mount Vite dev server middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api') || url.startsWith('/ws')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Production: serve built static files from dist
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`[SafeCross] Server listening on http://${HOST}:${PORT}`);
    console.log(`[SafeCross] WebSocket relay active on ws://${HOST}:${PORT}/ws`);
  });
}

startServer().catch((err) => {
  console.error('[SafeCross] Failed to start server:', err);
  process.exit(1);
});
