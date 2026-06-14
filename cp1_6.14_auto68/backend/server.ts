import express from 'express';
import cors from 'cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import userRoutes from './userRoutes.js';
import sessionRoutes from './sessionRoutes.js';

export interface User {
  id: string;
  nickname: string;
  nativeLanguage: string;
  targetLanguage: string;
  avatarColor: string;
  createdAt: number;
  isOnline: boolean;
}

export interface Message {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  timestamp: number;
  type: 'text' | 'topic';
}

export interface Correction {
  id: string;
  sessionId: string;
  messageId: string;
  correctorId: string;
  originalText: string;
  correctedText: string;
  timestamp: number;
}

export interface Note {
  id: string;
  sessionId: string;
  userId: string;
  messageId: string;
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  participants: string[];
  messages: Message[];
  corrections: Correction[];
  notes: Note[];
  createdAt: number;
  endedAt: number | null;
  duration: number;
}

interface DatabaseData {
  users: User[];
  sessions: Session[];
  unreadMessages: Record<string, string[]>;
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const adapter = new JSONFile<DatabaseData>('db.json');
const db = new Low<DatabaseData>(adapter, {
  users: [],
  sessions: [],
  unreadMessages: {},
});

await db.write();

app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes(db, wss));
app.use('/api/sessions', sessionRoutes(db, wss));

const connectedClients = new Map<string, WebSocket>();

wss.on('connection', (ws) => {
  let userId: string | null = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'auth') {
        userId = message.userId;
        if (userId) {
          connectedClients.set(userId, ws);
          db.update((data) => {
            const user = data.users.find((u) => u.id === userId);
            if (user) user.isOnline = true;
          });
        }
      }
      
      if (message.type === 'chat' && userId) {
        const { sessionId, content, targetUserId } = message;
        
        db.update((data) => {
          const session = data.sessions.find((s) => s.id === sessionId);
          if (session) {
            const newMessage: Message = {
              id: uuidv4(),
              sessionId,
              senderId: userId!,
              content,
              timestamp: Date.now(),
              type: 'text',
            };
            session.messages.push(newMessage);
            
            if (targetUserId) {
              if (!data.unreadMessages[targetUserId]) {
                data.unreadMessages[targetUserId] = [];
              }
              data.unreadMessages[targetUserId].push(sessionId);
            }
          }
        });
        
        const targetWs = targetUserId ? connectedClients.get(targetUserId) : null;
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          db.data?.sessions.find((s) => {
            if (s.id === sessionId) {
              const msg = s.messages[s.messages.length - 1];
              targetWs.send(JSON.stringify({ type: 'chat', message: msg }));
            }
          });
        }
      }
    } catch (e) {
      console.error('WebSocket error:', e);
    }
  });

  ws.on('close', () => {
    if (userId) {
      connectedClients.delete(userId);
      db.update((data) => {
        const user = data.users.find((u) => u.id === userId);
        if (user) user.isOnline = false;
      });
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`LingoLoop server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});

export { db, wss, connectedClients };
