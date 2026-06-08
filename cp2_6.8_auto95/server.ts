import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

interface StoryNode {
  id: string;
  content: string;
  parentId: string | null;
  children: string[];
  saved: boolean;
  createdAt: number;
}

interface User {
  id: string;
  name: string;
  color: string;
  editingNodeId: string | null;
  ws: WebSocket;
}

interface Room {
  code: string;
  users: Map<string, User>;
  nodes: Map<string, StoryNode>;
  lastActivity: number;
  usedColors: Set<string>;
}

const rooms = new Map<string, Room>();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateNodeId(): string {
  return 'node_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function generateUserId(): string {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function getRandomColor(room: Room): string {
  const available = PRESET_COLORS.filter(c => !room.usedColors.has(c));
  if (available.length === 0) {
    return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

function getOrCreateRoom(code: string): Room {
  let room = rooms.get(code);
  if (!room) {
    room = {
      code,
      users: new Map(),
      nodes: new Map(),
      lastActivity: Date.now(),
      usedColors: new Set(),
    };
    const rootNode: StoryNode = {
      id: generateNodeId(),
      content: '故事开始了...',
      parentId: null,
      children: [],
      saved: true,
      createdAt: Date.now(),
    };
    room.nodes.set(rootNode.id, rootNode);
    rooms.set(code, room);
  }
  return room;
}

function broadcastRoomState(room: Room) {
  const state = {
    type: 'room_state',
    code: room.code,
    users: Array.from(room.users.values()).map(u => ({
      id: u.id,
      name: u.name,
      color: u.color,
      editingNodeId: u.editingNodeId,
    })),
    nodes: Array.from(room.nodes.values()),
  };
  const data = JSON.stringify(state);
  room.users.forEach(user => {
    if (user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(data);
    }
  });
}

function cleanupRooms() {
  const now = Date.now();
  rooms.forEach((room, code) => {
    if (room.users.size === 0 && now - room.lastActivity > 30 * 60 * 1000) {
      rooms.delete(code);
      console.log(`Room ${code} cleaned up due to inactivity`);
    }
  });
}

setInterval(cleanupRooms, 60 * 1000);

wss.on('connection', (ws: WebSocket) => {
  let currentRoom: Room | null = null;
  let currentUser: User | null = null;

  ws.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());

      if (message.type === 'create_room') {
        let code: string;
        do {
          code = generateRoomCode();
        } while (rooms.has(code));
        currentRoom = getOrCreateRoom(code);

        if (currentRoom.users.size >= 6) {
          ws.send(JSON.stringify({ type: 'error', message: '房间已满' }));
          return;
        }

        const color = getRandomColor(currentRoom);
        currentRoom.usedColors.add(color);
        currentUser = {
          id: generateUserId(),
          name: message.name || '匿名用户',
          color,
          editingNodeId: null,
          ws,
        };
        currentRoom.users.set(currentUser.id, currentUser);
        currentRoom.lastActivity = Date.now();

        ws.send(JSON.stringify({
          type: 'room_joined',
          code,
          userId: currentUser.id,
          color: currentUser.color,
        }));
        broadcastRoomState(currentRoom);
        return;
      }

      if (message.type === 'join_room') {
        const code = message.code;
        currentRoom = rooms.get(code);

        if (!currentRoom) {
          ws.send(JSON.stringify({ type: 'error', message: '房间不存在' }));
          return;
        }
        if (currentRoom.users.size >= 6) {
          ws.send(JSON.stringify({ type: 'error', message: '房间已满' }));
          return;
        }

        const color = getRandomColor(currentRoom);
        currentRoom.usedColors.add(color);
        currentUser = {
          id: generateUserId(),
          name: message.name || '匿名用户',
          color,
          editingNodeId: null,
          ws,
        };
        currentRoom.users.set(currentUser.id, currentUser);
        currentRoom.lastActivity = Date.now();

        ws.send(JSON.stringify({
          type: 'room_joined',
          code,
          userId: currentUser.id,
          color: currentUser.color,
        }));
        broadcastRoomState(currentRoom);
        return;
      }

      if (!currentRoom || !currentUser) {
        ws.send(JSON.stringify({ type: 'error', message: '未加入房间' }));
        return;
      }

      currentRoom.lastActivity = Date.now();

      if (message.type === 'add_node') {
        const parentId = message.parentId;
        const parent = currentRoom.nodes.get(parentId);
        if (!parent) {
          ws.send(JSON.stringify({ type: 'error', message: '父节点不存在' }));
          return;
        }
        if (parent.children.length >= 3) {
          ws.send(JSON.stringify({ type: 'error', message: '子节点数量已达上限' }));
          return;
        }
        if (currentRoom.nodes.size >= 200) {
          ws.send(JSON.stringify({ type: 'error', message: '节点数量已达上限' }));
          return;
        }

        const newNode: StoryNode = {
          id: generateNodeId(),
          content: '',
          parentId,
          children: [],
          saved: false,
          createdAt: Date.now(),
        };
        currentRoom.nodes.set(newNode.id, newNode);
        parent.children.push(newNode.id);
        broadcastRoomState(currentRoom);
        return;
      }

      if (message.type === 'start_editing') {
        const nodeId = message.nodeId;
        const node = currentRoom.nodes.get(nodeId);
        if (!node) return;
        if (node.saved) return;
        currentUser.editingNodeId = nodeId;
        broadcastRoomState(currentRoom);
        return;
      }

      if (message.type === 'update_node') {
        const nodeId = message.nodeId;
        const content = message.content || '';
        const node = currentRoom.nodes.get(nodeId);
        if (!node) return;
        if (node.saved) return;
        node.content = content;
        const updateMsg = JSON.stringify({
          type: 'node_updated',
          nodeId,
          content,
          userId: currentUser.id,
        });
        currentRoom.users.forEach(user => {
          if (user.id !== currentUser!.id && user.ws.readyState === WebSocket.OPEN) {
            user.ws.send(updateMsg);
          }
        });
        return;
      }

      if (message.type === 'save_node') {
        const nodeId = message.nodeId;
        const content = message.content || '';
        const node = currentRoom.nodes.get(nodeId);
        if (!node) return;
        if (node.saved) return;
        node.content = content;
        node.saved = true;
        if (currentUser.editingNodeId === nodeId) {
          currentUser.editingNodeId = null;
        }
        broadcastRoomState(currentRoom);
        return;
      }

      if (message.type === 'stop_editing') {
        if (currentUser.editingNodeId === message.nodeId) {
          currentUser.editingNodeId = null;
          broadcastRoomState(currentRoom);
        }
        return;
      }
    } catch (e) {
      console.error('Message parse error:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoom && currentUser) {
      currentRoom.usedColors.delete(currentUser.color);
      currentRoom.users.delete(currentUser.id);
      currentRoom.lastActivity = Date.now();
      if (currentRoom.users.size === 0) {
      } else {
        broadcastRoomState(currentRoom);
      }
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
