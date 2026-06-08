import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type {
  Board,
  ListColumn,
  Card,
  Action,
  User,
  WSMessage,
} from './Types';

const PORT = 3005;
const MAX_USERS = 6;
const MAX_HISTORY = 50;

interface Room {
  roomCode: string;
  board: Board;
  users: User[];
  history: Action[];
  clients: Map<string, { ws: WebSocket; nickname: string }>;
}

interface ClientData {
  clientId: string;
  roomCode: string | null;
}

const rooms = new Map<string, Room>();

const app = express();
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server });

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

function createInitialBoard(): Board {
  const defaultTitles = ['待办', '进行中', '完成'];
  return {
    id: uuidv4(),
    lists: defaultTitles.map((title) => ({
      id: uuidv4(),
      title,
      cards: [],
    })),
  };
}

function send(ws: WebSocket, type: string, payload?: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

function broadcast(room: Room, type: string, payload?: any, excludeClientId?: string) {
  const msg = JSON.stringify({ type, payload });
  for (const [clientId, { ws }] of room.clients) {
    if (clientId !== excludeClientId && ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

function pushHistory(room: Room, action: Action) {
  room.history.push(action);
  if (room.history.length > MAX_HISTORY) {
    room.history.shift();
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function handleCreateBoard(ws: WebSocket, data: ClientData, payload: any) {
  const nickname = payload?.nickname?.trim();
  if (!nickname) {
    send(ws, 'ERROR', { message: '昵称不能为空' });
    return;
  }
  const roomCode = generateRoomCode();
  const board = createInitialBoard();
  const user: User = {
    id: data.clientId,
    nickname,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
  const room: Room = {
    roomCode,
    board,
    users: [user],
    history: [],
    clients: new Map([[data.clientId, { ws, nickname }]]),
  };
  rooms.set(roomCode, room);
  data.roomCode = roomCode;
  send(ws, 'JOINED', {
    roomCode,
    board,
    users: room.users,
    history: room.history,
    selfUserId: user.id,
  });
  console.log(`[ROOM] Created: ${roomCode} by ${nickname}`);
}

function handleJoinBoard(ws: WebSocket, data: ClientData, payload: any) {
  const roomCode = payload?.roomCode?.trim().toUpperCase();
  const nickname = payload?.nickname?.trim();
  if (!roomCode || !nickname) {
    send(ws, 'ERROR', { message: '房间码和昵称不能为空' });
    return;
  }
  const room = rooms.get(roomCode);
  if (!room) {
    send(ws, 'ERROR', { message: '房间不存在' });
    return;
  }
  if (room.users.length >= MAX_USERS) {
    send(ws, 'ERROR', { message: '房间人数已满（最多6人）' });
    return;
  }
  const usedColors = new Set(room.users.map((u) => u.color));
  const availableColors = COLORS.filter((c) => !usedColors.has(c));
  const color = availableColors.length > 0
    ? availableColors[Math.floor(Math.random() * availableColors.length)]
    : COLORS[Math.floor(Math.random() * COLORS.length)];
  const user: User = { id: data.clientId, nickname, color };
  room.users.push(user);
  room.clients.set(data.clientId, { ws, nickname });
  data.roomCode = roomCode;
  send(ws, 'JOINED', {
    roomCode,
    board: room.board,
    users: room.users,
    history: room.history,
    selfUserId: user.id,
  });
  broadcast(room, 'USER_JOINED', { users: room.users }, data.clientId);
  console.log(`[ROOM] ${nickname} joined ${roomCode}`);
}

function handleAddList(room: Room, data: ClientData, payload: any) {
  const title = payload?.title?.trim();
  if (!title) return;
  const list: ListColumn = { id: uuidv4(), title, cards: [] };
  room.board.lists.push(list);
  const nickname = room.clients.get(data.clientId)?.nickname || '未知用户';
  const action: Action = {
    type: 'ADD_LIST',
    timestamp: Date.now(),
    nickname,
    payload: { listId: list.id, title },
    description: `添加了列表「${title}」`,
  };
  pushHistory(room, action);
  broadcast(room, 'STATE_UPDATED', { board: room.board, action });
}

function handleAddCard(room: Room, data: ClientData, payload: any) {
  const { listId, title, content = '' } = payload || {};
  if (!listId || !title?.trim()) return;
  const list = room.board.lists.find((l) => l.id === listId);
  if (!list) return;
  const card: Card = {
    id: uuidv4(),
    title: title.trim(),
    content: content.trim(),
    position: list.cards.length,
    createdAt: Date.now(),
  };
  list.cards.push(card);
  const nickname = room.clients.get(data.clientId)?.nickname || '未知用户';
  const action: Action = {
    type: 'ADD_CARD',
    timestamp: Date.now(),
    nickname,
    payload: { cardId: card.id, listId, title: card.title },
    description: `在「${list.title}」添加了卡片「${card.title}」`,
  };
  pushHistory(room, action);
  broadcast(room, 'STATE_UPDATED', { board: room.board, action });
}

function handleMoveCard(room: Room, data: ClientData, payload: any) {
  const { cardId, fromListId, toListId, toIndex } = payload || {};
  if (!cardId || !fromListId || !toListId || toIndex === undefined) return;
  const fromList = room.board.lists.find((l) => l.id === fromListId);
  const toList = room.board.lists.find((l) => l.id === toListId);
  if (!fromList || !toList) return;
  const cardIdx = fromList.cards.findIndex((c) => c.id === cardId);
  if (cardIdx === -1) return;
  const [card] = fromList.cards.splice(cardIdx, 1);
  fromList.cards.forEach((c, i) => (c.position = i));
  const insertIdx = Math.max(0, Math.min(toIndex, toList.cards.length));
  toList.cards.splice(insertIdx, 0, card);
  toList.cards.forEach((c, i) => (c.position = i));
  const nickname = room.clients.get(data.clientId)?.nickname || '未知用户';
  const action: Action = {
    type: 'MOVE_CARD',
    timestamp: Date.now(),
    nickname,
    payload: { cardId, cardTitle: card.title, fromListId, toListId, toIndex: insertIdx },
    description: fromListId === toListId
      ? `在「${toList.title}」中移动了卡片「${card.title}」`
      : `将卡片「${card.title}」从「${fromList.title}」移动到「${toList.title}」`,
  };
  pushHistory(room, action);
  broadcast(room, 'STATE_UPDATED', { board: room.board, action });
}

function handleRollback(room: Room, data: ClientData, payload: any) {
  const actionIndex = payload?.actionIndex;
  if (actionIndex === undefined || actionIndex < 0 || actionIndex >= room.history.length) return;
  const initialBoard = createInitialBoard();
  const actionsToKeep = room.history.slice(0, actionIndex + 1);
  const newBoard: Board = {
    id: room.board.id,
    lists: initialBoard.lists.map((l) => ({ ...l, cards: [] })),
  };
  const listIdMap = new Map<string, string>();
  room.board.lists.forEach((l, idx) => {
    if (idx < newBoard.lists.length) {
      listIdMap.set(l.id, newBoard.lists[idx].id);
    }
  });
  const keptActions: Action[] = [];
  for (const act of actionsToKeep) {
    if (act.type === 'ADD_LIST') {
      const newList: ListColumn = { id: uuidv4(), title: act.payload.title, cards: [] };
      newBoard.lists.push(newList);
      listIdMap.set(act.payload.listId, newList.id);
      keptActions.push(act);
    } else if (act.type === 'ADD_CARD') {
      const mappedListId = listIdMap.get(act.payload.listId);
      if (mappedListId) {
        const list = newBoard.lists.find((l) => l.id === mappedListId);
        if (list) {
          const card: Card = {
            id: uuidv4(),
            title: act.payload.title,
            content: '',
            position: list.cards.length,
            createdAt: Date.now(),
          };
          list.cards.push(card);
          keptActions.push(act);
        }
      }
    } else if (act.type === 'MOVE_CARD') {
      keptActions.push(act);
    }
  }
  room.board = newBoard;
  room.history = keptActions;
  const nickname = room.clients.get(data.clientId)?.nickname || '未知用户';
  const rollbackAction: Action = {
    type: 'ROLLBACK',
    timestamp: Date.now(),
    nickname,
    payload: { actionIndex },
    description: `回滚到了 ${formatTime(actionsToKeep[actionIndex]?.timestamp || Date.now())} 的状态`,
  };
  pushHistory(room, rollbackAction);
  broadcast(room, 'ROLLBACKED', { board: room.board, history: room.history });
  send(room.clients.get(data.clientId)!.ws, 'ROLLBACKED', { board: room.board, history: room.history });
}

function handleClientLeave(data: ClientData) {
  if (!data.roomCode) return;
  const room = rooms.get(data.roomCode);
  if (!room) return;
  room.clients.delete(data.clientId);
  room.users = room.users.filter((u) => u.id !== data.clientId);
  if (room.users.length === 0) {
    rooms.delete(data.roomCode);
    console.log(`[ROOM] Closed: ${data.roomCode}`);
    return;
  }
  broadcast(room, 'USER_LEFT', { users: room.users });
  console.log(`[ROOM] Client left ${data.roomCode}, remaining: ${room.users.length}`);
}

wss.on('connection', (ws) => {
  const data: ClientData = { clientId: uuidv4(), roomCode: null };
  console.log(`[WS] Connected: ${data.clientId}`);

  ws.on('message', (raw) => {
    let msg: WSMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    const room = data.roomCode ? rooms.get(data.roomCode) : undefined;

    switch (msg.type) {
      case 'CREATE_BOARD':
        handleCreateBoard(ws, data, msg.payload);
        break;
      case 'JOIN_BOARD':
        handleJoinBoard(ws, data, msg.payload);
        break;
      case 'ADD_LIST':
        if (room) handleAddList(room, data, msg.payload);
        break;
      case 'ADD_CARD':
        if (room) handleAddCard(room, data, msg.payload);
        break;
      case 'MOVE_CARD':
        if (room) handleMoveCard(room, data, msg.payload);
        break;
      case 'ROLLBACK':
        if (room) handleRollback(room, data, msg.payload);
        break;
    }
  });

  ws.on('close', () => {
    handleClientLeave(data);
    console.log(`[WS] Disconnected: ${data.clientId}`);
  });

  ws.on('error', () => {
    handleClientLeave(data);
  });
});
