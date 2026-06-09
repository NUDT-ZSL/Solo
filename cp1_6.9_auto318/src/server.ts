import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FrameData {
  id: string;
  audioBase64: string;
  sampleRate: number;
  length: number;
  playbackRate: number;
  waveformData: number[];
  createdAt: number;
}

interface ResonanceEvent {
  frameA: string;
  frameB: string;
  timestamp: number;
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const MAX_FRAMES = 12;

const frames: Map<string, FrameData> = new Map();
const resonanceHistory: ResonanceEvent[] = [];

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '..')));

app.get('/api/frames', (_req, res) => {
  const frameList = Array.from(frames.values());
  res.json({ success: true, frames: frameList, total: frameList.length });
});

app.get('/api/frames/:id', (req, res) => {
  const frame = frames.get(req.params.id);
  if (!frame) {
    res.status(404).json({ success: false, error: '画框不存在' });
    return;
  }
  res.json({ success: true, frame });
});

app.post('/api/frames', (req, res) => {
  if (frames.size >= MAX_FRAMES) {
    const oldestKey = Array.from(frames.entries())
      .sort((a, b) => a[1].createdAt - b[1].createdAt)[0][0];
    frames.delete(oldestKey);
    broadcast({ type: 'frame_removed', frameId: oldestKey });
  }

  const { audioBase64, sampleRate, length, waveformData } = req.body;

  if (!audioBase64 || !sampleRate || !waveformData) {
    res.status(400).json({ success: false, error: '缺少必要参数' });
    return;
  }

  const id = randomUUID();
  const playbackRate = 0.8 + Math.random() * 0.4;

  const frameData: FrameData = {
    id,
    audioBase64,
    sampleRate,
    length: length || 15,
    playbackRate,
    waveformData,
    createdAt: Date.now()
  };

  frames.set(id, frameData);

  broadcast({
    type: 'frame_added',
    frame: frameData
  });

  res.status(201).json({ success: true, frame: frameData });
});

app.delete('/api/frames/:id', (req, res) => {
  const id = req.params.id;
  if (!frames.has(id)) {
    res.status(404).json({ success: false, error: '画框不存在' });
    return;
  }
  frames.delete(id);
  broadcast({ type: 'frame_removed', frameId: id });
  res.json({ success: true });
});

app.get('/api/stats', (_req, res) => {
  res.json({
    success: true,
    totalFrames: frames.size,
    maxFrames: MAX_FRAMES,
    connectedClients: wss.clients.size,
    resonanceEvents: resonanceHistory.length
  });
});

function broadcast(message: unknown) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

wss.on('connection', (ws) => {
  console.log('新客户端连接');

  ws.send(JSON.stringify({
    type: 'welcome',
    frames: Array.from(frames.values()),
    timestamp: Date.now()
  }));

  ws.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());

      switch (message.type) {
        case 'playback_sync': {
          broadcast({
            type: 'playback_update',
            frameId: message.frameId,
            progress: message.progress,
            timestamp: Date.now()
          });
          break;
        }
        case 'resonance': {
          const event: ResonanceEvent = {
            frameA: message.frameA,
            frameB: message.frameB,
            timestamp: Date.now()
          };
          resonanceHistory.push(event);
          if (resonanceHistory.length > 100) {
            resonanceHistory.shift();
          }
          broadcast({
            type: 'resonance',
            frameA: message.frameA,
            frameB: message.frameB,
            duration: 3000
          });
          break;
        }
        case 'ping': {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
          break;
        }
      }
    } catch (err) {
      console.error('WebSocket消息解析错误:', err);
    }
  });

  ws.on('close', () => {
    console.log('客户端断开连接');
  });
});

server.listen(PORT, () => {
  console.log(`回声镜廊后端服务已启动:`);
  console.log(`  HTTP服务: http://localhost:${PORT}`);
  console.log(`  WebSocket: ws://localhost:${PORT}/ws`);
});
