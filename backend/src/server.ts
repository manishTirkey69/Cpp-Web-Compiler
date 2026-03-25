import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { URL } from 'url';
import { compileRoute } from './routes/compile';
import { runSession } from './compiler';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:4173'],
    methods: ['GET', 'POST'],
  })
);
app.use(express.json({ limit: '2mb' }));

// ── REST Routes ─────────────────────────────────────────────────────────────
app.use('/api', compileRoute);

app.get('/', (_req, res) => {
  res.json({ name: 'CppShell Backend', version: '1.0.0' });
});

// ── HTTP + WebSocket Server ─────────────────────────────────────────────────
const server = http.createServer(app);

const wss = new WebSocketServer({ noServer: true });

// Upgrade HTTP → WebSocket only for /ws/run/:sessionId
server.on('upgrade', (request, socket, head) => {
  const baseUrl = `http://${request.headers.host}`;
  const pathname = new URL(request.url ?? '/', baseUrl).pathname;

  if (pathname.startsWith('/ws/run/')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const baseUrl = `http://${req.headers.host}`;
  const pathname = new URL(req.url ?? '/', baseUrl).pathname;
  // e.g. /ws/run/550e8400-e29b-41d4-a716-446655440000
  const sessionId = pathname.replace('/ws/run/', '');

  if (!sessionId) {
    ws.close(1008, 'Missing session ID');
    return;
  }

  console.log(`[WS] Session connected: ${sessionId.substring(0, 8)}…`);
  runSession(sessionId, ws);
});

server.listen(PORT, () => {
  console.log(`\n🚀 CppShell backend running on http://localhost:${PORT}`);
  console.log(`   WebSocket endpoint: ws://localhost:${PORT}/ws/run/:sessionId\n`);
});
