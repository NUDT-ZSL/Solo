import type { FrameData, FrameUpdate, UserData, ChatMessage, WallId } from './gallery';

export type MessageType =
  | 'join_room'
  | 'room_state'
  | 'user_joined'
  | 'user_left'
  | 'user_status'
  | 'place_frame'
  | 'update_frame'
  | 'delete_frame'
  | 'send_message'
  | 'chat_message';

export interface WSMessage {
  type: MessageType;
  payload: any;
  roomCode: string;
  senderId: string;
  timestamp: number;
}

export interface RoomManagerCallbacks {
  onConnected: () => void;
  onDisconnected: () => void;
  onRoomState: (frames: FrameData[], users: UserData[], messages: ChatMessage[]) => void;
  onUserJoined: (user: UserData) => void;
  onUserLeft: (userId: string) => void;
  onUserStatus: (userId: string, online: boolean) => void;
  onFramePlaced: (frame: FrameData) => void;
  onFrameUpdated: (id: string, update: FrameUpdate) => void;
  onFrameDeleted: (id: string) => void;
  onChatMessage: (message: ChatMessage) => void;
  onError: (error: string) => void;
}

interface RoomState {
  frames: FrameData[];
  users: Map<string, UserData>;
  messages: ChatMessage[];
}

const STORAGE_PREFIX = 'vgallery_room_';

function getRoomStorageKey(roomCode: string): string {
  return STORAGE_PREFIX + roomCode;
}

function loadRoomState(roomCode: string): RoomState {
  try {
    const raw = localStorage.getItem(getRoomStorageKey(roomCode));
    if (raw) {
      const data = JSON.parse(raw);
      return {
        frames: data.frames || [],
        users: new Map((data.users || []).map((u: UserData) => [u.id, { ...u, online: false }])),
        messages: data.messages || []
      };
    }
  } catch (_) {
    // ignore
  }
  return { frames: [], users: new Map(), messages: [] };
}

function saveRoomState(roomCode: string, state: RoomState) {
  try {
    const data = {
      frames: state.frames,
      users: Array.from(state.users.values()),
      messages: state.messages.slice(-100)
    };
    localStorage.setItem(getRoomStorageKey(roomCode), JSON.stringify(data));
  } catch (_) {
    // ignore
  }
}

const VALID_ROOM_CODES = ['1001', '1002', '1003', '1004'];

export class RoomManager {
  private channel: BroadcastChannel | null = null;
  private callbacks: Partial<RoomManagerCallbacks> = {};
  private roomCode: string = '';
  private userId: string = '';
  private nickname: string = '';
  private connected: boolean = false;
  private roomState: RoomState = { frames: [], users: new Map(), messages: [] };

  setCallbacks(callbacks: Partial<RoomManagerCallbacks>) {
    this.callbacks = callbacks;
  }

  connect(roomCode: string, userId: string, nickname: string): boolean {
    if (!VALID_ROOM_CODES.includes(roomCode)) {
      this.callbacks.onError?.('房间码无效，请输入 1001-1004 之间的房间码');
      return false;
    }

    this.roomCode = roomCode;
    this.userId = userId;
    this.nickname = nickname;
    this.roomState = loadRoomState(roomCode);

    try {
      this.channel = new BroadcastChannel('vgallery_' + roomCode);
      this.channel.onmessage = (e) => this.handleMessage(e.data as WSMessage);
    } catch (_) {
      this.channel = null;
    }

    this.connected = true;

    const currentUser: UserData = { id: userId, nickname, online: true };
    this.roomState.users.set(userId, currentUser);
    saveRoomState(roomCode, this.roomState);

    this.broadcast({
      type: 'user_joined',
      payload: currentUser,
      roomCode,
      senderId: userId,
      timestamp: Date.now()
    });

    setTimeout(() => {
      this.callbacks.onConnected?.();
      this.callbacks.onRoomState?.(
        this.roomState.frames,
        Array.from(this.roomState.users.values()),
        this.roomState.messages
      );
    }, 100);

    window.addEventListener('beforeunload', this.handleBeforeUnload);

    return true;
  }

  private handleBeforeUnload = () => {
    this.disconnect();
  };

  disconnect() {
    if (!this.connected) return;

    this.broadcast({
      type: 'user_left',
      payload: { userId: this.userId },
      roomCode: this.roomCode,
      senderId: this.userId,
      timestamp: Date.now()
    });

    const user = this.roomState.users.get(this.userId);
    if (user) {
      user.online = false;
      saveRoomState(this.roomCode, this.roomState);
    }

    this.connected = false;
    window.removeEventListener('beforeunload', this.handleBeforeUnload);

    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    this.callbacks.onDisconnected?.();
  }

  private broadcast(message: WSMessage) {
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (_) {
        // ignore
      }
    }
    this.handleMessage(message, true);
  }

  private handleMessage(message: WSMessage, isSelf: boolean = false) {
    if (message.roomCode !== this.roomCode) return;
    if (isSelf && message.senderId === this.userId && message.type !== 'room_state') {
      // self messages handled via storage
    }

    switch (message.type) {
      case 'user_joined': {
        const user = message.payload as UserData;
        this.roomState.users.set(user.id, user);
        saveRoomState(this.roomCode, this.roomState);
        if (message.senderId !== this.userId) {
          this.callbacks.onUserJoined?.(user);
        }
        break;
      }
      case 'user_left': {
        const { userId } = message.payload as { userId: string };
        const u = this.roomState.users.get(userId);
        if (u) {
          u.online = false;
          saveRoomState(this.roomCode, this.roomState);
        }
        if (userId !== this.userId) {
          this.callbacks.onUserLeft?.(userId);
        }
        break;
      }
      case 'user_status': {
        const { userId, online } = message.payload as { userId: string; online: boolean };
        const u = this.roomState.users.get(userId);
        if (u) {
          u.online = online;
          saveRoomState(this.roomCode, this.roomState);
        }
        this.callbacks.onUserStatus?.(userId, online);
        break;
      }
      case 'place_frame': {
        const frame = message.payload as FrameData;
        if (!this.roomState.frames.find(f => f.id === frame.id)) {
          this.roomState.frames.push(frame);
          saveRoomState(this.roomCode, this.roomState);
        }
        if (message.senderId !== this.userId) {
          this.callbacks.onFramePlaced?.(frame);
        }
        break;
      }
      case 'update_frame': {
        const { id, update } = message.payload as { id: string; update: FrameUpdate };
        const frame = this.roomState.frames.find(f => f.id === id);
        if (frame) {
          Object.assign(frame, update);
          saveRoomState(this.roomCode, this.roomState);
        }
        if (message.senderId !== this.userId) {
          this.callbacks.onFrameUpdated?.(id, update);
        }
        break;
      }
      case 'delete_frame': {
        const { id } = message.payload as { id: string };
        this.roomState.frames = this.roomState.frames.filter(f => f.id !== id);
        saveRoomState(this.roomCode, this.roomState);
        if (message.senderId !== this.userId) {
          this.callbacks.onFrameDeleted?.(id);
        }
        break;
      }
      case 'send_message':
      case 'chat_message': {
        const msg = message.payload as ChatMessage;
        if (!this.roomState.messages.find(m => m.id === msg.id)) {
          this.roomState.messages.push(msg);
          if (this.roomState.messages.length > 100) {
            this.roomState.messages.shift();
          }
          saveRoomState(this.roomCode, this.roomState);
        }
        this.callbacks.onChatMessage?.(msg);
        break;
      }
    }
  }

  placeFrame(wallId: WallId, positionX: number, positionY: number, imageData: string): string {
    const id = 'frame_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const frame: FrameData = {
      id,
      wallId,
      positionX,
      positionY,
      width: 2,
      height: 1.5,
      rotation: 0,
      imageData,
      ownerId: this.userId
    };
    this.broadcast({
      type: 'place_frame',
      payload: frame,
      roomCode: this.roomCode,
      senderId: this.userId,
      timestamp: Date.now()
    });
    return id;
  }

  updateFrame(id: string, update: FrameUpdate) {
    this.broadcast({
      type: 'update_frame',
      payload: { id, update },
      roomCode: this.roomCode,
      senderId: this.userId,
      timestamp: Date.now()
    });
  }

  deleteFrame(id: string) {
    this.broadcast({
      type: 'delete_frame',
      payload: { id },
      roomCode: this.roomCode,
      senderId: this.userId,
      timestamp: Date.now()
    });
  }

  sendMessage(content: string) {
    const msg: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      userId: this.userId,
      nickname: this.nickname,
      content,
      timestamp: Date.now()
    };
    this.broadcast({
      type: 'chat_message',
      payload: msg,
      roomCode: this.roomCode,
      senderId: this.userId,
      timestamp: Date.now()
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  getRoomCode(): string {
    return this.roomCode;
  }

  getUserId(): string {
    return this.userId;
  }
}
