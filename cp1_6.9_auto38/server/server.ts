import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import type { InstrumentType, NoteEvent, UserInfo } from '../src/types';

const app = express();
app.use(express.json());

const PORT = 3001;

const initialUsers: UserInfo[] = [
  { id: 'user1', name: 'User1', instrument: 'piano', volume: 70 },
  { id: 'user2', name: 'User2', instrument: 'strings', volume: 60 },
  { id: 'user3', name: 'User3', instrument: 'synth', volume: 50 }
];

const usersStore = new Map<string, UserInfo>();
initialUsers.forEach(u => usersStore.set(u.id, { ...u }));

type EventBusHandler = (event: NoteEvent) => void;

class EventBus {
  private handlers: Set<EventBusHandler> = new Set();

  subscribe(handler: EventBusHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  publish(event: NoteEvent) {
    this.handlers.forEach(h => {
      try {
        h(event);
      } catch (e) {
        console.error('EventBus handler error:', e);
      }
    });
  }
}

const eventBus = new EventBus();

app.get('/api/users', (_req: Request, res: Response) => {
  res.json(Array.from(usersStore.values()));
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const user = usersStore.get(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

app.put('/api/users/:id', (req: Request, res: Response) => {
  const user = usersStore.get(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const { instrument, volume } = req.body as { instrument?: InstrumentType; volume?: number };
  if (instrument) user.instrument = instrument;
  if (volume !== undefined) user.volume = Math.max(0, Math.min(100, volume));
  res.json(user);
});

app.post('/api/notes', (req: Request, res: Response) => {
  const note = req.body as NoteEvent;
  eventBus.publish(note);
  res.json({ success: true });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/api/ws' });

wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket client connected');

  const unsubscribe = eventBus.subscribe((event: NoteEvent) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'note', data: event }));
    }
  });

  ws.on('message', (message: string) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.type === 'note') {
        eventBus.publish(parsed.data as NoteEvent);
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'note', data: parsed.data }));
          }
        });
      }
    } catch (e) {
      console.error('WS message parse error:', e);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    unsubscribe();
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`HTTP API: http://localhost:${PORT}/api`);
  console.log(`WebSocket: ws://localhost:${PORT}/api/ws`);
});
