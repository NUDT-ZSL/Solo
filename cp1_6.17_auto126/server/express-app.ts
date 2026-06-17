import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { dataSimulator, SimulatedData } from './data-simulator';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = 4000;

app.use(cors());
app.use(express.json());

app.get('/api/bikes', (_req, res) => {
  const data = dataSimulator.getCurrentData();
  res.json(data);
});

app.post('/api/refresh-interval', (req, res) => {
  const { interval } = req.body;
  if (typeof interval === 'number' && interval >= 1000 && interval <= 5000) {
    dataSimulator.setRefreshInterval(interval);
    res.json({ success: true, interval });
  } else {
    res.status(400).json({ success: false, error: 'Invalid interval. Must be between 1000 and 5000 ms.' });
  }
});

function broadcast(data: SimulatedData): void {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify(dataSimulator.getCurrentData()));

  ws.on('message', (msg) => {
    try {
      const parsed = JSON.parse(msg.toString());
      if (parsed.type === 'setInterval' && typeof parsed.interval === 'number') {
        dataSimulator.setRefreshInterval(parsed.interval);
      }
    } catch (_) {
      // ignore parse errors
    }
  });
});

dataSimulator.subscribe((data) => {
  broadcast(data);
});

dataSimulator.start(3000);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server on ws://localhost:${PORT}/ws`);
});
