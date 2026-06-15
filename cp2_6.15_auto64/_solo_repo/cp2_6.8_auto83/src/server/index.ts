import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type {
  NodeData,
  EdgeData,
  User,
  RoomState,
  ClientMessage,
  ServerMessage,
  HistoryRecord,
} from '../shared/types';

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

interface Room {
  state: RoomState;
  clients: Map<string, WebSocket>;
}

const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  let code: string;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(code));
  return code;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function broadcast(room: Room, message: ServerMessage, excludeId?: string) {
  const data = JSON.stringify(message);
  room.clients.forEach((ws, id) => {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

function addHistory(room: Room, record: HistoryRecord) {
  room.state.history.unshift(record);
  if (room.state.history.length > 50) {
    room.state.history.pop();
  }
}

function handleClient(ws: WebSocket) {
  let currentRoomCode: string | null = null;
  let currentUserId: string | null = null;

  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === 'createRoom') {
      const roomCode = generateRoomCode();
      const userId = uuidv4();
      const user: User = { id: userId, name: msg.userName || '匿名用户' };
      const room: Room = {
        state: {
          roomCode,
          users: [user],
          nodes: [],
          edges: [],
          history: [],
        },
        clients: new Map([[userId, ws]]),
      };
      rooms.set(roomCode, room);
      currentRoomCode = roomCode;
      currentUserId = userId;
      const resp: ServerMessage = { type: 'roomCreated', roomCode, userId };
      ws.send(JSON.stringify(resp));
      return;
    }

    if (msg.type === 'joinRoom') {
      const room = rooms.get(msg.roomCode);
      if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: '房间不存在' } as ServerMessage));
        return;
      }
      if (room.state.users.length >= 8) {
        ws.send(JSON.stringify({ type: 'error', message: '房间已满（最多8人）' } as ServerMessage));
        return;
      }
      const userId = uuidv4();
      const user: User = { id: userId, name: msg.userName || '匿名用户' };
      room.state.users.push(user);
      room.clients.set(userId, ws);
      currentRoomCode = msg.roomCode;
      currentUserId = userId;
      ws.send(JSON.stringify({ type: 'roomJoined', state: room.state, userId } as ServerMessage));
      broadcast(room, { type: 'userJoined', user } as ServerMessage, userId);
      return;
    }

    if (!currentRoomCode || !currentUserId) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    const user = room.state.users.find((u) => u.id === currentUserId);
    if (!user) return;

    if (msg.type === 'addNode') {
      const node: NodeData = { ...msg.node, id: msg.node.id || uuidv4() };
      room.state.nodes.push(node);
      const record: HistoryRecord = {
        id: uuidv4(),
        userId: currentUserId,
        userName: user.name,
        action: `${user.name} 添加了节点《${node.text || '新节点'}》`,
        timestamp: Date.now(),
        undoData: { type: 'deleteNode', nodeId: node.id },
      };
      addHistory(room, record);
      broadcast(room, { type: 'nodeAdded', node, record } as ServerMessage);
      return;
    }

    if (msg.type === 'updateNode') {
      const oldNode = room.state.nodes.find((n) => n.id === msg.node.id);
      if (!oldNode) return;
      const oldData = { ...oldNode };
      const idx = room.state.nodes.findIndex((n) => n.id === msg.node.id);
      room.state.nodes[idx] = msg.node;
      let actionText = '';
      if (oldData.x !== msg.node.x || oldData.y !== msg.node.y) {
        actionText = `${user.name} 将《${msg.node.text || '节点'}》移到了(${Math.round(msg.node.x)}, ${Math.round(msg.node.y)})`;
      } else if (oldData.text !== msg.node.text) {
        actionText = `${user.name} 编辑了节点《${msg.node.text || '节点'}》`;
      } else if (oldData.color !== msg.node.color) {
        actionText = `${user.name} 修改了《${msg.node.text || '节点'}》的颜色`;
      } else {
        actionText = `${user.name} 更新了节点《${msg.node.text || '节点'}》`;
      }
      const record: HistoryRecord = {
        id: uuidv4(),
        userId: currentUserId,
        userName: user.name,
        action: actionText,
        timestamp: Date.now(),
        undoData: { type: 'updateNode', node: oldData },
      };
      addHistory(room, record);
      broadcast(room, { type: 'nodeUpdated', node: msg.node, record } as ServerMessage);
      return;
    }

    if (msg.type === 'deleteNode') {
      const idx = room.state.nodes.findIndex((n) => n.id === msg.nodeId);
      if (idx === -1) return;
      const deletedNode = room.state.nodes[idx];
      const relatedEdges = room.state.edges.filter((e) => e.from === msg.nodeId || e.to === msg.nodeId);
      room.state.nodes.splice(idx, 1);
      room.state.edges = room.state.edges.filter((e) => e.from !== msg.nodeId && e.to !== msg.nodeId);
      const record: HistoryRecord = {
        id: uuidv4(),
        userId: currentUserId,
        userName: user.name,
        action: `${user.name} 删除了节点《${deletedNode.text || '节点'}》`,
        timestamp: Date.now(),
        undoData: { type: 'addNode', node: deletedNode, edges: relatedEdges },
      };
      addHistory(room, record);
      broadcast(room, { type: 'nodeDeleted', nodeId: msg.nodeId, record } as ServerMessage);
      return;
    }

    if (msg.type === 'addEdge') {
      if (msg.edge.from === msg.edge.to) {
        ws.send(JSON.stringify({ type: 'error', message: '不能连接到自己' } as ServerMessage));
        return;
      }
      const reverseExists = room.state.edges.some(
        (e) => e.from === msg.edge.to && e.to === msg.edge.from
      );
      if (reverseExists) {
        ws.send(JSON.stringify({ type: 'error', message: '反向连线已存在' } as ServerMessage));
        return;
      }
      const edge: EdgeData = { ...msg.edge, id: msg.edge.id || uuidv4() };
      room.state.edges.push(edge);
      const fromNode = room.state.nodes.find((n) => n.id === edge.from);
      const toNode = room.state.nodes.find((n) => n.id === edge.to);
      const record: HistoryRecord = {
        id: uuidv4(),
        userId: currentUserId,
        userName: user.name,
        action: `${user.name} 添加了连线《${fromNode?.text || ''}→${toNode?.text || ''}》`,
        timestamp: Date.now(),
        undoData: { type: 'deleteEdge', edgeId: edge.id },
      };
      addHistory(room, record);
      broadcast(room, { type: 'edgeAdded', edge, record } as ServerMessage);
      return;
    }

    if (msg.type === 'updateEdge') {
      const oldEdge = room.state.edges.find((e) => e.id === msg.edge.id);
      if (!oldEdge) return;
      const idx = room.state.edges.findIndex((e) => e.id === msg.edge.id);
      room.state.edges[idx] = msg.edge;
      const record: HistoryRecord = {
        id: uuidv4(),
        userId: currentUserId,
        userName: user.name,
        action: `${user.name} 编辑了连线标签《${msg.edge.label || ''}》`,
        timestamp: Date.now(),
        undoData: { type: 'updateEdge', edge: oldEdge },
      };
      addHistory(room, record);
      broadcast(room, { type: 'edgeUpdated', edge: msg.edge, record } as ServerMessage);
      return;
    }

    if (msg.type === 'deleteEdge') {
      const idx = room.state.edges.findIndex((e) => e.id === msg.edgeId);
      if (idx === -1) return;
      const deletedEdge = room.state.edges[idx];
      room.state.edges.splice(idx, 1);
      const record: HistoryRecord = {
        id: uuidv4(),
        userId: currentUserId,
        userName: user.name,
        action: `${user.name} 删除了连线`,
        timestamp: Date.now(),
        undoData: { type: 'addEdge', edge: deletedEdge },
      };
      addHistory(room, record);
      broadcast(room, { type: 'edgeDeleted', edgeId: msg.edgeId, record } as ServerMessage);
      return;
    }

    if (msg.type === 'undo') {
      const recordIdx = room.state.history.findIndex((r) => r.id === msg.recordId);
      if (recordIdx === -1) return;
      const record = room.state.history[recordIdx];
      if (record.userId !== currentUserId) {
        ws.send(JSON.stringify({ type: 'error', message: '只能撤销自己的操作' } as ServerMessage));
        return;
      }
      const undo = record.undoData;
      if (!undo) return;

      if (undo.type === 'deleteNode') {
        const idx = room.state.nodes.findIndex((n) => n.id === undo.nodeId);
        if (idx !== -1) {
          const delNode = room.state.nodes[idx];
          room.state.nodes.splice(idx, 1);
          room.state.edges = room.state.edges.filter((e) => e.from !== undo.nodeId && e.to !== undo.nodeId);
          broadcast(room, { type: 'nodeDeleted', nodeId: undo.nodeId, record } as ServerMessage);
        }
      } else if (undo.type === 'addNode') {
        room.state.nodes.push(undo.node);
        if (undo.edges) {
          undo.edges.forEach((e: EdgeData) => {
            if (!room.state.edges.find((x) => x.id === e.id)) room.state.edges.push(e);
          });
        }
        broadcast(room, { type: 'nodeAdded', node: undo.node, record } as ServerMessage);
        undo.edges?.forEach((e: EdgeData) => {
          broadcast(room, { type: 'edgeAdded', edge: e, record } as ServerMessage);
        });
      } else if (undo.type === 'updateNode') {
        const idx = room.state.nodes.findIndex((n) => n.id === undo.node.id);
        if (idx !== -1) {
          room.state.nodes[idx] = undo.node;
          broadcast(room, { type: 'nodeUpdated', node: undo.node, record } as ServerMessage);
        }
      } else if (undo.type === 'deleteEdge') {
        const idx = room.state.edges.findIndex((e) => e.id === undo.edgeId);
        if (idx !== -1) {
          room.state.edges.splice(idx, 1);
          broadcast(room, { type: 'edgeDeleted', edgeId: undo.edgeId, record } as ServerMessage);
        }
      } else if (undo.type === 'addEdge') {
        if (!room.state.edges.find((x) => x.id === undo.edge.id)) {
          room.state.edges.push(undo.edge);
          broadcast(room, { type: 'edgeAdded', edge: undo.edge, record } as ServerMessage);
        }
      } else if (undo.type === 'updateEdge') {
        const idx = room.state.edges.findIndex((e) => e.id === undo.edge.id);
        if (idx !== -1) {
          room.state.edges[idx] = undo.edge;
          broadcast(room, { type: 'edgeUpdated', edge: undo.edge, record } as ServerMessage);
        }
      }
      room.state.history.splice(recordIdx, 1);
      return;
    }

    if (msg.type === 'chat') {
      broadcast(room, {
        type: 'chat',
        userName: user.name,
        message: msg.message,
        timestamp: Date.now(),
      } as ServerMessage);
      return;
    }
  });

  ws.on('close', () => {
    if (!currentRoomCode || !currentUserId) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    room.clients.delete(currentUserId);
    room.state.users = room.state.users.filter((u) => u.id !== currentUserId);
    broadcast(room, { type: 'userLeft', userId: currentUserId } as ServerMessage);
    if (room.state.users.length === 0) {
      rooms.delete(currentRoomCode);
    }
  });
}

wss.on('connection', handleClient);

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
