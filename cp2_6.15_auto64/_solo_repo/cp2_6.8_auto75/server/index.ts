import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type {
  WSMessage,
  WSMessageType,
  CreateRoomPayload,
  JoinRoomPayload,
  EditEvent,
  CodeSnapshot,
  CodeCheckResult,
  StudentDetailPayload,
  RoomState,
  StudentInfo,
  BroadcastCode,
} from '../src/types';

const PORT = 3001;
const MAX_STUDENTS_PER_ROOM = 10;
const DISCONNECT_GRACE_MS = 10000;
const MAX_SNIPSHOTS_PER_STUDENT = 10;
const MAX_ERRORS_PER_STUDENT = 20;

interface ConnectionData {
  id: string;
  role: 'teacher' | 'student';
  nickname: string;
  roomCode: string;
  studentId?: string;
  isAlive: boolean;
}

interface Room {
  code: string;
  name: string;
  teacherConn?: WebSocket;
  students: Map<string, { info: StudentInfo; conn?: WebSocket; disconnectTimer?: ReturnType<typeof setTimeout> }>;
  editHistory: EditEvent[];
  codeHistory: Map<string, CodeSnapshot[]>;
  errorHistory: Map<string, CodeCheckResult[]>;
}

const app = express();
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const rooms = new Map<string, Room>();
const connections = new Map<WebSocket, ConnectionData>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code: string;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

function send(ws: WebSocket, type: WSMessageType, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload } as WSMessage));
  }
}

function broadcastRoom(room: Room, type: WSMessageType, payload: unknown, excludeWs?: WebSocket) {
  const msg = JSON.stringify({ type, payload } as WSMessage);
  if (room.teacherConn && room.teacherConn !== excludeWs && room.teacherConn.readyState === WebSocket.OPEN) {
    room.teacherConn.send(msg);
  }
  for (const s of room.students.values()) {
    if (s.conn && s.conn !== excludeWs && s.conn.readyState === WebSocket.OPEN) {
      s.conn.send(msg);
    }
  }
}

function getRoomState(room: Room): RoomState {
  return {
    roomCode: room.code,
    roomName: room.name,
    students: Array.from(room.students.values()).map((s) => s.info),
    teacherConnected: !!(room.teacherConn && room.teacherConn.readyState === WebSocket.OPEN),
  };
}

function checkJS(code: string): { hasError: boolean; errorType?: string; errorLine?: number; errorMessage?: string } {
  try {
    new Function(code);
    return { hasError: false };
  } catch (e) {
    const err = e as Error & { lineNumber?: number };
    let errorLine: number | undefined;
    const msg = err.message || String(e);
    const match = msg.match(/(?:line\s+|:\s*)(\d+)(?:[,:]|$)/i);
    if (match) errorLine = parseInt(match[1], 10);
    if (err.lineNumber) errorLine = err.lineNumber;

    let errorType = 'SyntaxError';
    if (msg.includes('ReferenceError')) errorType = 'ReferenceError';
    else if (msg.includes('TypeError')) errorType = 'TypeError';
    else if (msg.includes('RangeError')) errorType = 'RangeError';
    else if (msg.includes('URIError')) errorType = 'URIError';
    else if (e instanceof SyntaxError) errorType = 'SyntaxError';

    return {
      hasError: true,
      errorType,
      errorLine,
      errorMessage: msg,
    };
  }
}

function parseMessage(data: string): WSMessage | null {
  try {
    return JSON.parse(data) as WSMessage;
  } catch {
    return null;
  }
}

function handleCreateRoom(ws: WebSocket, payload: CreateRoomPayload) {
  const { roomName, teacherName } = payload;
  if (!roomName || !teacherName) {
    send(ws, 'ERROR', '房间名称和讲师昵称不能为空');
    return;
  }

  const code = generateRoomCode();
  const room: Room = {
    code,
    name: roomName,
    teacherConn: ws,
    students: new Map(),
    editHistory: [],
    codeHistory: new Map(),
    errorHistory: new Map(),
  };
  rooms.set(code, room);

  connections.set(ws, {
    id: uuidv4(),
    role: 'teacher',
    nickname: teacherName,
    roomCode: code,
    isAlive: true,
  });

  send(ws, 'ROOM_STATE', getRoomState(room));
  console.log(`[Room] Created ${code} by ${teacherName}`);
}

function handleJoinRoom(ws: WebSocket, payload: JoinRoomPayload) {
  const { roomCode, nickname, role } = payload;
  const room = rooms.get(roomCode.toUpperCase());

  if (!room) {
    send(ws, 'ERROR', '房间不存在');
    return;
  }
  if (!nickname) {
    send(ws, 'ERROR', '昵称不能为空');
    return;
  }

  if (role === 'teacher') {
    if (room.teacherConn && room.teacherConn.readyState === WebSocket.OPEN) {
      send(ws, 'ERROR', '该房间已有讲师');
      return;
    }
    room.teacherConn = ws;
    connections.set(ws, {
      id: uuidv4(),
      role: 'teacher',
      nickname,
      roomCode: room.code,
      isAlive: true,
    });
    send(ws, 'ROOM_STATE', getRoomState(room));
    broadcastRoom(room, 'ROOM_STATE', getRoomState(room), ws);
    console.log(`[Room] ${room.code} teacher ${nickname} joined`);
    return;
  }

  if (role === 'student') {
    if (room.students.size >= MAX_STUDENTS_PER_ROOM) {
      send(ws, 'ERROR', '房间人数已满（最多10人）');
      return;
    }

    const studentId = uuidv4();
    const info: StudentInfo = {
      id: studentId,
      nickname,
      roomCode: room.code,
      connected: true,
    };

    room.students.set(studentId, { info, conn: ws });
    if (!room.codeHistory.has(studentId)) room.codeHistory.set(studentId, []);
    if (!room.errorHistory.has(studentId)) room.errorHistory.set(studentId, []);

    connections.set(ws, {
      id: uuidv4(),
      role: 'student',
      nickname,
      roomCode: room.code,
      studentId,
      isAlive: true,
    });

    send(ws, 'ROOM_STATE', getRoomState(room));
    broadcastRoom(room, 'ROOM_STATE', getRoomState(room), ws);
    console.log(`[Room] ${room.code} student ${nickname} (${studentId}) joined`);
  }
}

function handleEditEvent(ws: WebSocket, payload: Omit<EditEvent, 'studentId' | 'nickname' | 'timestamp'>) {
  const conn = connections.get(ws);
  if (!conn || conn.role !== 'student' || !conn.studentId) return;

  const room = rooms.get(conn.roomCode);
  if (!room) return;

  const studentEntry = room.students.get(conn.studentId);
  if (!studentEntry) return;

  const event: EditEvent = {
    studentId: conn.studentId,
    nickname: conn.nickname,
    timestamp: Date.now(),
    frequency: payload.frequency,
    cursorPosition: payload.cursorPosition,
    codeLength: payload.codeLength,
  };

  room.editHistory.push(event);
  if (room.editHistory.length > 5000) room.editHistory.splice(0, room.editHistory.length - 5000);

  if (room.teacherConn && room.teacherConn.readyState === WebSocket.OPEN) {
    send(room.teacherConn, 'EDIT_EVENT', event);
  }
}

function handleCodeSnapshot(ws: WebSocket, payload: { code: string }) {
  const conn = connections.get(ws);
  if (!conn || conn.role !== 'student' || !conn.studentId) return;

  const room = rooms.get(conn.roomCode);
  if (!room) return;

  const studentEntry = room.students.get(conn.studentId);
  if (!studentEntry) return;

  const ts = Date.now();
  const snap: CodeSnapshot = {
    studentId: conn.studentId,
    nickname: conn.nickname,
    timestamp: ts,
    code: payload.code,
  };

  const snaps = room.codeHistory.get(conn.studentId)!;
  snaps.push(snap);
  if (snaps.length > MAX_SNIPSHOTS_PER_STUDENT) snaps.splice(0, snaps.length - MAX_SNIPSHOTS_PER_STUDENT);

  const check = checkJS(payload.code);
  const firstLine = payload.code.split('\n')[0] || '';
  const snippet = firstLine.length > 50 ? firstLine.slice(0, 50) + '…' : firstLine;

  const result: CodeCheckResult = {
    studentId: conn.studentId,
    nickname: conn.nickname,
    timestamp: ts,
    hasError: check.hasError,
    errorType: check.errorType,
    errorLine: check.errorLine,
    errorMessage: check.errorMessage,
    codeSnippet: snippet,
  };

  if (check.hasError) {
    const errs = room.errorHistory.get(conn.studentId)!;
    errs.push(result);
    if (errs.length > MAX_ERRORS_PER_STUDENT) errs.splice(0, errs.length - MAX_ERRORS_PER_STUDENT);
  }

  if (room.teacherConn && room.teacherConn.readyState === WebSocket.OPEN) {
    send(room.teacherConn, 'CODE_CHECK_RESULT', result);
  }
}

function handleRequestStudentDetail(ws: WebSocket, payload: { studentId: string }) {
  const conn = connections.get(ws);
  if (!conn || conn.role !== 'teacher') return;

  const room = rooms.get(conn.roomCode);
  if (!room) return;

  const detail: StudentDetailPayload = {
    studentId: payload.studentId,
    recentSnippets: [...(room.codeHistory.get(payload.studentId) ?? [])].reverse().slice(0, 10),
    errorHistory: [...(room.errorHistory.get(payload.studentId) ?? [])].reverse().slice(0, 10),
  };

  send(ws, 'STUDENT_DETAIL', detail);
}

function handleBroadcastCode(ws: WebSocket, payload: { studentId: string }) {
  const conn = connections.get(ws);
  if (!conn || conn.role !== 'teacher') return;

  const room = rooms.get(conn.roomCode);
  if (!room) return;

  const studentEntry = room.students.get(payload.studentId);
  if (!studentEntry) return;

  const snaps = room.codeHistory.get(payload.studentId) ?? [];
  const latest = snaps[snaps.length - 1];
  if (!latest) return;

  const bc: BroadcastCode = {
    fromStudentId: payload.studentId,
    fromNickname: studentEntry.info.nickname,
    timestamp: Date.now(),
    code: latest.code,
  };

  broadcastRoom(room, 'BROADCAST_CODE', bc, ws);
}

function handleDisconnect(ws: WebSocket) {
  const conn = connections.get(ws);
  if (!conn) return;

  const room = rooms.get(conn.roomCode);
  connections.delete(ws);

  if (!room) return;

  if (conn.role === 'teacher') {
    if (room.teacherConn === ws) {
      room.teacherConn = undefined;
    }
    broadcastRoom(room, 'ROOM_STATE', getRoomState(room));
    console.log(`[Room] ${room.code} teacher disconnected`);
    return;
  }

  if (conn.role === 'student' && conn.studentId) {
    const entry = room.students.get(conn.studentId);
    if (entry) {
      entry.info.connected = false;
      entry.conn = undefined;

      if (entry.disconnectTimer) clearTimeout(entry.disconnectTimer);
      entry.disconnectTimer = setTimeout(() => {
        if (room.students.has(conn.studentId!) && !room.students.get(conn.studentId!)!.info.connected) {
          room.students.delete(conn.studentId!);
          room.codeHistory.delete(conn.studentId!);
          room.errorHistory.delete(conn.studentId!);
          broadcastRoom(room, 'ROOM_STATE', getRoomState(room));
          console.log(`[Room] ${room.code} student ${conn.nickname} removed after timeout`);

          if (room.students.size === 0 && !room.teacherConn) {
            rooms.delete(room.code);
            console.log(`[Room] ${room.code} destroyed (empty)`);
          }
        }
      }, DISCONNECT_GRACE_MS);

      broadcastRoom(room, 'ROOM_STATE', getRoomState(room));
      console.log(`[Room] ${room.code} student ${conn.nickname} disconnected (grace period start)`);
    }
  }
}

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const msg = parseMessage(data.toString());
    if (!msg) return;

    switch (msg.type) {
      case 'CREATE_ROOM':
        handleCreateRoom(ws, msg.payload as CreateRoomPayload);
        break;
      case 'JOIN_ROOM':
        handleJoinRoom(ws, msg.payload as JoinRoomPayload);
        break;
      case 'EDIT_EVENT':
        handleEditEvent(ws, msg.payload as Omit<EditEvent, 'studentId' | 'nickname' | 'timestamp'>);
        break;
      case 'CODE_SNAPSHOT':
        handleCodeSnapshot(ws, msg.payload as { code: string });
        break;
      case 'REQUEST_STUDENT_DETAIL':
        handleRequestStudentDetail(ws, msg.payload as { studentId: string });
        break;
      case 'BROADCAST_CODE':
        handleBroadcastCode(ws, msg.payload as { studentId: string });
        break;
    }
  });

  ws.on('close', () => handleDisconnect(ws));
  ws.on('error', () => handleDisconnect(ws));
});

server.listen(PORT, () => {
  console.log(`[Server] HTTP + WS listening on :${PORT}`);
});
