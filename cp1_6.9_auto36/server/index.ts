import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { roomManager } from './roomManager.js';
import type {
  JoinMessage,
  EditParagraphMessage,
  AddParagraphMessage,
  DeleteParagraphMessage,
  ReorderParagraphMessage,
  SetIllustrationMessage,
  LockParagraphMessage,
  UnlockParagraphMessage,
  ChatMessageSend,
  ClientMessage
} from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/export/:roomCode', (req, res) => {
  const { roomCode } = req.params;
  const creatorId = req.query.creatorId as string;
  if (!creatorId) {
    res.status(400).json({ error: '缺少creatorId参数' });
    return;
  }
  const result = roomManager.exportStoryToHtml(roomCode, creatorId);
  if (!result) {
    res.status(404).json({ error: '房间不存在或权限不足' });
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
  res.send(result.html);
});

app.get('/api/share/:roomCode', (req, res) => {
  const { roomCode } = req.params;
  const state = roomManager.getShareState(roomCode);
  if (!state) {
    res.status(404).json({ error: '房间不存在' });
    return;
  }
  res.json({
    success: true,
    shareUrl: `/share/${roomCode}`,
    state
  });
});

app.get('/api/room/:roomCode', (req, res) => {
  const { roomCode } = req.params;
  const state = roomManager.getShareState(roomCode);
  if (!state) {
    res.status(404).json({ exists: false });
    return;
  }
  res.json({
    exists: true,
    hasShareToken: !!state.shareToken,
    createdAt: state.createdAt,
    paragraphCount: state.paragraphs.length
  });
});

const distDir = path.resolve(__dirname, '../dist');
app.use(express.static(distDir));

app.get(['/', '/room/:code', '/share/:code'], (req, res) => {
  const indexFile = path.resolve(distDir, 'index.html');
  const srcIndex = path.resolve(__dirname, '../index.html');
  res.sendFile(indexFile, () => res.sendFile(srcIndex));
});

const wsConnections = new Map<string, { ws: any; roomCode: string; userId: string; nickname: string }>();

wss.on('connection', (ws) => {
  let connId: string | null = null;

  ws.on('message', (raw) => {
    try {
      const msg: ClientMessage = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'join': {
          const joinMsg = msg as JoinMessage;
          connId = joinMsg.userId + '-' + Date.now();
          wsConnections.set(connId, {
            ws,
            roomCode: joinMsg.roomCode,
            userId: joinMsg.userId,
            nickname: joinMsg.nickname
          });

          const existing = roomManager.getRoom(joinMsg.roomCode);
          if (!existing) {
            const info = roomManager.createRoom(ws, joinMsg.nickname, joinMsg.avatar);
            joinMsg.userId = info.userId;
            joinMsg.roomCode = info.code;
          }
          roomManager.handleJoin(joinMsg, ws);
          break;
        }
        case 'leave': {
          roomManager.handleLeave(msg.roomCode, msg.userId);
          if (connId) wsConnections.delete(connId);
          break;
        }
        case 'edit_paragraph':
          roomManager.handleEditParagraph(msg as EditParagraphMessage);
          break;
        case 'add_paragraph':
          roomManager.handleAddParagraph(msg as AddParagraphMessage);
          break;
        case 'delete_paragraph':
          roomManager.handleDeleteParagraph(msg as DeleteParagraphMessage);
          break;
        case 'reorder_paragraph':
          roomManager.handleReorderParagraph(msg as ReorderParagraphMessage);
          break;
        case 'set_illustration':
          roomManager.handleSetIllustration(msg as SetIllustrationMessage);
          break;
        case 'lock_paragraph':
          roomManager.handleLockParagraph(msg as LockParagraphMessage);
          break;
        case 'unlock_paragraph':
          roomManager.handleUnlockParagraph(msg as UnlockParagraphMessage);
          break;
        case 'chat':
          roomManager.handleChat(msg as ChatMessageSend);
          break;
      }
    } catch (err) {
      console.error('WebSocket消息处理错误:', err);
    }
  });

  ws.on('close', () => {
    if (connId) {
      const conn = wsConnections.get(connId);
      if (conn) {
        roomManager.handleLeave(conn.roomCode, conn.userId, conn.nickname);
        wsConnections.delete(connId);
      }
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket错误:', err);
  });
});

server.listen(PORT, () => {
  console.log(`\n🎨 故事拼图·多人协作 服务已启动`);
  console.log(`   HTTP:   http://localhost:${PORT}`);
  console.log(`   WS:     ws://localhost:${PORT}/ws`);
  console.log(`   开发模式请同时运行: npm run dev:client (Vite on :5173)\n`);
});

process.on('SIGINT', () => {
  console.log('\n关闭服务器...');
  server.close(() => process.exit(0));
});
