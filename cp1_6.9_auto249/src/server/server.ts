import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import bottleRouter, { bottleStore } from './routes/bottles';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const app = express();
const server = createServer(app);

app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', bottles: bottleStore.bottles.length });
});

app.use('/api/bottles', bottleRouter);

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;
  if (pathname === '/ws' || pathname?.startsWith('/ws?')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws: WebSocket) => {
  const listener = (msg: { type: string; payload: any }) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(msg));
      } catch {}
    }
  };
  bottleStore.listeners.add(listener);

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      // Broadcast received messages to all other clients (fan-out)
      bottleStore.listeners.forEach((l) => {
        if (l !== listener) {
          try {
            l(data);
          } catch {}
        }
      });
    } catch {}
  });

  ws.on('close', () => {
    bottleStore.listeners.delete(listener);
  });

  ws.on('error', () => {
    bottleStore.listeners.delete(listener);
  });
});

server.listen(PORT, () => {
  console.log(`🌊 灵感漂流瓶后端已启动: http://localhost:${PORT}`);
  console.log(`   REST API: /api/bottles`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
});
