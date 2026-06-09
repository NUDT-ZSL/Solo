import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type {
  RoomState,
  Paragraph,
  UserInfo,
  ChatMessage,
  JoinMessage,
  EditParagraphMessage,
  AddParagraphMessage,
  DeleteParagraphMessage,
  ReorderParagraphMessage,
  SetIllustrationMessage,
  LockParagraphMessage,
  UnlockParagraphMessage,
  ChatMessageSend,
  ServerMessage,
  Illustration
} from '../shared/types';

interface User {
  id: string;
  nickname: string;
  avatar: string;
  ws: WebSocket;
  joinedAt: number;
  isCreator: boolean;
}

interface LockStateData {
  paragraphId: string;
  userId: string;
  nickname: string;
  lockedAt: number;
  timeout: NodeJS.Timeout;
}

interface Room {
  state: RoomState;
  users: Map<string, User>;
  locks: Map<string, LockStateData>;
  chatHistory: ChatMessage[];
}

const MAX_USERS_PER_ROOM = 5;
const LOCK_DURATION_MS = 3000;

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function createParagraph(): Paragraph {
  const now = Date.now();
  return {
    id: uuidv4(),
    content: '',
    illustration: null,
    order: 0,
    createdAt: now,
    updatedAt: now
  };
}

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(room: Room, msg: ServerMessage, excludeUserId?: string): void {
  const data = JSON.stringify(msg);
  for (const user of room.users.values()) {
    if (excludeUserId && user.id === excludeUserId) continue;
    if (user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(data);
    }
  }
}

function serializeUsers(room: Room): UserInfo[] {
  return Array.from(room.users.values()).map(u => ({
    id: u.id,
    nickname: u.nickname,
    avatar: u.avatar,
    isCreator: u.isCreator
  }));
}

function publicRoomState(room: Room): RoomState {
  return {
    ...room.state,
    paragraphs: [...room.state.paragraphs].sort((a, b) => a.order - b.order)
  };
}

class RoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(creatorWs: WebSocket, nickname: string, avatar: string): { code: string; userId: string } {
    let code: string;
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));

    const userId = uuidv4();
    const firstParagraph = createParagraph();
    const now = Date.now();

    const state: RoomState = {
      code,
      creatorId: userId,
      paragraphs: [firstParagraph],
      version: 1,
      createdAt: now,
      shareToken: uuidv4()
    };

    const room: Room = {
      state,
      users: new Map(),
      locks: new Map(),
      chatHistory: []
    };

    const creator: User = {
      id: userId,
      nickname,
      avatar,
      ws: creatorWs,
      joinedAt: now,
      isCreator: true
    };

    room.users.set(userId, creator);
    this.rooms.set(code, room);

    return { code, userId };
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  handleJoin(msg: JoinMessage, ws: WebSocket): void {
    const code = msg.roomCode.toUpperCase();
    const room = this.rooms.get(code);

    if (!room) {
      send(ws, { type: 'room_full', message: '房间不存在' });
      return;
    }

    if (room.users.size >= MAX_USERS_PER_ROOM) {
      send(ws, { type: 'room_full', message: '房间人数已满（最多5人）' });
      return;
    }

    let userId = msg.userId;
    if (!userId || !room.users.has(userId)) {
      userId = uuidv4();
    }

    const existingUser = room.users.get(userId);
    const isCreator = existingUser?.isCreator ?? room.users.size === 0;

    const user: User = {
      id: userId,
      nickname: msg.nickname,
      avatar: msg.avatar,
      ws,
      joinedAt: existingUser?.joinedAt ?? Date.now(),
      isCreator
    };

    room.users.set(userId, user);

    send(ws, {
      type: 'join_success',
      roomCode: code,
      userId,
      state: publicRoomState(room),
      users: serializeUsers(room)
    });

    const systemMsg: ChatMessage = {
      userId: 'system',
      nickname: '系统',
      content: `${msg.nickname}加入了房间`,
      timestamp: Date.now(),
      isSystem: true
    };
    room.chatHistory.push(systemMsg);

    broadcast(room, {
      type: 'user_joined',
      userId,
      nickname: msg.nickname,
      avatar: msg.avatar,
      users: serializeUsers(room),
      timestamp: Date.now()
    }, userId);

    broadcast(room, {
      type: 'chat_broadcast',
      ...systemMsg
    });
  }

  handleLeave(roomCode: string, userId: string, nickname?: string): void {
    const code = roomCode.toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return;

    const user = room.users.get(userId);
    if (!user) return;

    const leaveNickname = nickname ?? user.nickname;
    room.users.delete(userId);

    for (const [pId, lock] of room.locks.entries()) {
      if (lock.userId === userId) {
        clearTimeout(lock.timeout);
        room.locks.delete(pId);
        broadcast(room, {
          type: 'paragraph_unlocked',
          paragraphId: pId,
          userId
        });
      }
    }

    if (room.users.size === 0) {
      setTimeout(() => {
        const stillEmpty = this.rooms.get(code);
        if (stillEmpty && stillEmpty.users.size === 0) {
          this.rooms.delete(code);
        }
      }, 10 * 60 * 1000);
    } else {
      const systemMsg: ChatMessage = {
        userId: 'system',
        nickname: '系统',
        content: `${leaveNickname}离开了房间`,
        timestamp: Date.now(),
        isSystem: true
      };
      room.chatHistory.push(systemMsg);

      broadcast(room, {
        type: 'user_left',
        userId,
        nickname: leaveNickname,
        users: serializeUsers(room),
        timestamp: Date.now()
      });

      broadcast(room, {
        type: 'chat_broadcast',
        ...systemMsg
      });
    }
  }

  handleEditParagraph(msg: EditParagraphMessage): void {
    const code = msg.roomCode.toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return;

    const paragraph = room.state.paragraphs.find(p => p.id === msg.paragraphId);
    if (!paragraph) {
      send(room.users.get(msg.userId)?.ws!, {
        type: 'operation_ack',
        operationId: msg.operationId,
        success: false,
        conflict: false,
        overridden: false,
        latestVersion: room.state.version
      });
      return;
    }

    const overridden = msg.version < room.state.version;
    const content = msg.content.slice(0, 200);

    room.state.version += 1;
    paragraph.content = content;
    paragraph.updatedAt = Date.now();

    send(room.users.get(msg.userId)?.ws!, {
      type: 'operation_ack',
      operationId: msg.operationId,
      success: true,
      conflict: overridden,
      overridden,
      latestVersion: room.state.version
    });

    broadcast(room, {
      type: 'paragraph_updated',
      operationId: msg.operationId,
      editType: 'edit',
      paragraphId: paragraph.id,
      data: { content: paragraph.content, updatedAt: paragraph.updatedAt },
      userId: msg.userId,
      version: room.state.version,
      timestamp: Date.now()
    });
  }

  handleAddParagraph(msg: AddParagraphMessage): void {
    const code = msg.roomCode.toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return;

    const overridden = msg.version < room.state.version;
    const newPara = createParagraph();

    let insertIndex = room.state.paragraphs.length;
    if (msg.afterId) {
      const idx = room.state.paragraphs.findIndex(p => p.id === msg.afterId);
      if (idx !== -1) insertIndex = idx + 1;
    }

    room.state.version += 1;
    room.state.paragraphs.splice(insertIndex, 0, newPara);
    room.state.paragraphs.forEach((p, i) => { p.order = i; });

    send(room.users.get(msg.userId)?.ws!, {
      type: 'operation_ack',
      operationId: msg.operationId,
      success: true,
      conflict: overridden,
      overridden,
      latestVersion: room.state.version
    });

    broadcast(room, {
      type: 'paragraph_updated',
      operationId: msg.operationId,
      editType: 'add',
      paragraphId: newPara.id,
      data: { paragraph: newPara, paragraphs: room.state.paragraphs.map(p => ({ id: p.id, order: p.order })) },
      userId: msg.userId,
      version: room.state.version,
      timestamp: Date.now()
    });
  }

  handleDeleteParagraph(msg: DeleteParagraphMessage): void {
    const code = msg.roomCode.toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return;

    if (room.state.paragraphs.length <= 1) {
      send(room.users.get(msg.userId)?.ws!, {
        type: 'operation_ack',
        operationId: msg.operationId,
        success: false,
        conflict: false,
        overridden: false,
        latestVersion: room.state.version
      });
      return;
    }

    const idx = room.state.paragraphs.findIndex(p => p.id === msg.paragraphId);
    if (idx === -1) {
      send(room.users.get(msg.userId)?.ws!, {
        type: 'operation_ack',
        operationId: msg.operationId,
        success: false,
        conflict: false,
        overridden: false,
        latestVersion: room.state.version
      });
      return;
    }

    const overridden = msg.version < room.state.version;

    room.state.version += 1;
    room.state.paragraphs.splice(idx, 1);
    room.state.paragraphs.forEach((p, i) => { p.order = i; });

    const existingLock = room.locks.get(msg.paragraphId);
    if (existingLock) {
      clearTimeout(existingLock.timeout);
      room.locks.delete(msg.paragraphId);
    }

    send(room.users.get(msg.userId)?.ws!, {
      type: 'operation_ack',
      operationId: msg.operationId,
      success: true,
      conflict: overridden,
      overridden,
      latestVersion: room.state.version
    });

    broadcast(room, {
      type: 'paragraph_updated',
      operationId: msg.operationId,
      editType: 'delete',
      paragraphId: msg.paragraphId,
      data: { paragraphs: room.state.paragraphs.map(p => ({ id: p.id, order: p.order })) },
      userId: msg.userId,
      version: room.state.version,
      timestamp: Date.now()
    });
  }

  handleReorderParagraph(msg: ReorderParagraphMessage): void {
    const code = msg.roomCode.toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return;

    const fromIdx = room.state.paragraphs.findIndex(p => p.id === msg.paragraphId);
    if (fromIdx === -1) return;

    const overridden = msg.version < room.state.version;
    const newIndex = Math.max(0, Math.min(msg.newIndex, room.state.paragraphs.length - 1));

    if (fromIdx === newIndex) {
      send(room.users.get(msg.userId)?.ws!, {
        type: 'operation_ack',
        operationId: msg.operationId,
        success: true,
        conflict: false,
        overridden: false,
        latestVersion: room.state.version
      });
      return;
    }

    room.state.version += 1;
    const [moved] = room.state.paragraphs.splice(fromIdx, 1);
    room.state.paragraphs.splice(newIndex, 0, moved);
    room.state.paragraphs.forEach((p, i) => { p.order = i; });

    send(room.users.get(msg.userId)?.ws!, {
      type: 'operation_ack',
      operationId: msg.operationId,
      success: true,
      conflict: overridden,
      overridden,
      latestVersion: room.state.version
    });

    broadcast(room, {
      type: 'paragraph_updated',
      operationId: msg.operationId,
      editType: 'reorder',
      paragraphId: msg.paragraphId,
      data: { paragraphs: room.state.paragraphs.map(p => ({ id: p.id, order: p.order })) },
      userId: msg.userId,
      version: room.state.version,
      timestamp: Date.now()
    });
  }

  handleSetIllustration(msg: SetIllustrationMessage): void {
    const code = msg.roomCode.toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return;

    const paragraph = room.state.paragraphs.find(p => p.id === msg.paragraphId);
    if (!paragraph) return;

    const overridden = msg.version < room.state.version;
    let illustration: Illustration | null = null;

    if (msg.illustration) {
      const data = typeof msg.illustration.data === 'string'
        ? (msg.illustration.data.length > 1024 * 1024 * 5
          ? msg.illustration.data.slice(0, 1024 * 1024 * 5)
          : msg.illustration.data)
        : '';
      illustration = {
        data,
        type: msg.illustration.type === 'canvas' ? 'canvas' : 'upload'
      };
    }

    room.state.version += 1;
    paragraph.illustration = illustration;
    paragraph.updatedAt = Date.now();

    send(room.users.get(msg.userId)?.ws!, {
      type: 'operation_ack',
      operationId: msg.operationId,
      success: true,
      conflict: overridden,
      overridden,
      latestVersion: room.state.version
    });

    broadcast(room, {
      type: 'paragraph_updated',
      operationId: msg.operationId,
      editType: 'illustration',
      paragraphId: paragraph.id,
      data: { illustration: paragraph.illustration, updatedAt: paragraph.updatedAt },
      userId: msg.userId,
      version: room.state.version,
      timestamp: Date.now()
    });
  }

  handleLockParagraph(msg: LockParagraphMessage): void {
    const code = msg.roomCode.toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return;

    const user = room.users.get(msg.userId);
    if (!user) return;

    const existing = room.locks.get(msg.paragraphId);

    if (existing && existing.userId !== msg.userId) return;

    if (existing?.timeout) clearTimeout(existing.timeout);

    const timeout = setTimeout(() => {
      const lock = room.locks.get(msg.paragraphId);
      if (lock && lock.userId === msg.userId) {
        room.locks.delete(msg.paragraphId);
        broadcast(room, {
          type: 'paragraph_unlocked',
          paragraphId: msg.paragraphId,
          userId: msg.userId
        });
      }
    }, LOCK_DURATION_MS);

    const isNewLock = !existing;
    room.locks.set(msg.paragraphId, {
      paragraphId: msg.paragraphId,
      userId: msg.userId,
      nickname: user.nickname,
      lockedAt: Date.now(),
      timeout
    });

    if (isNewLock) {
      broadcast(room, {
        type: 'paragraph_locked',
        paragraphId: msg.paragraphId,
        userId: msg.userId,
        nickname: user.nickname
      });
    }
  }

  handleUnlockParagraph(msg: UnlockParagraphMessage): void {
    const code = msg.roomCode.toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return;

    const lock = room.locks.get(msg.paragraphId);
    if (lock && lock.userId === msg.userId) {
      clearTimeout(lock.timeout);
      room.locks.delete(msg.paragraphId);
      broadcast(room, {
        type: 'paragraph_unlocked',
        paragraphId: msg.paragraphId,
        userId: msg.userId
      });
    }
  }

  handleChat(msg: ChatMessageSend): void {
    const code = msg.roomCode.toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return;

    const chat: ChatMessage = {
      userId: msg.userId,
      nickname: msg.nickname,
      content: String(msg.content).slice(0, 500),
      timestamp: msg.timestamp || Date.now(),
      isSystem: false
    };

    room.chatHistory.push(chat);

    broadcast(room, {
      type: 'chat_broadcast',
      ...chat
    });
  }

  exportStoryToHtml(code: string, creatorId: string): { html: string; filename: string } | null {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return null;
    if (room.state.creatorId !== creatorId) return null;

    const sorted = [...room.state.paragraphs].sort((a, b) => a.order - b.order);
    const title = `故事拼图-${code}`;

    const paragraphsHtml = sorted.map(p => {
      const content = p.content || '<span style="color:#999;">（空段落）</span>';
      const imgHtml = p.illustration
        ? `<img src="${p.illustration.data}" style="max-width:300px;height:auto;border:2px solid #D2B48C;box-shadow:0 2px 8px rgba(0,0,0,0.1);border-radius:4px;" alt="插画" />`
        : '';
      return `
        <div style="display:flex;gap:20px;margin-bottom:32px;align-items:flex-start;break-inside:avoid;">
          <div style="flex:1;">
            <p style="font-family:Georgia,'Noto Serif SC',serif;font-size:16px;line-height:1.8;color:#333;margin:0;white-space:pre-wrap;">${content}</p>
          </div>
          ${imgHtml ? `<div style="flex-shrink:0;">${imgHtml}</div>` : ''}
        </div>
      `;
    }).join('\n');

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>${title}</title>
<style>
  body { background:#FFF8E7; padding:40px; margin:0; font-family:Georgia,'Noto Serif SC',serif; }
  .container { max-width:900px; margin:0 auto; background:#FFFFFF; padding:60px; border:1px solid #E0E0E0; box-shadow:0 4px 20px rgba(0,0,0,0.08); border-radius:8px; }
  h1 { text-align:center; color:#5C4033; margin-top:0; font-size:28px; }
  .meta { text-align:center; color:#999; font-size:14px; margin-bottom:40px; }
  @media (max-width:768px) {
    body { padding:16px; }
    .container { padding:24px; }
    div[style*="display:flex"] { flex-direction:column !important; }
    div[style*="display:flex"] img { max-width:100% !important; width:100% !important; }
  }
  @media print {
    body { background:#FFFFFF; padding:0; }
    .container { box-shadow:none; border:none; padding:20px; }
  }
</style>
</head>
<body>
<div class="container">
  <h1>📖 ${title}</h1>
  <div class="meta">房间号：${code} &middot; 导出时间：${new Date().toLocaleString('zh-CN')}</div>
  ${paragraphsHtml}
</div>
</body>
</html>`;

    return { html, filename: `${title}-${Date.now()}.html` };
  }

  getShareState(code: string): RoomState | null {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return null;
    return publicRoomState(room);
  }
}

export const roomManager = new RoomManager();
