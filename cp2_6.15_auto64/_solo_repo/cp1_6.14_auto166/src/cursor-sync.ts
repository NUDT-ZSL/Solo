import { io, Socket } from 'socket.io-client';

export interface User {
  id: string;
  nickname: string;
  color: string;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface SelectionRange {
  start: CursorPosition;
  end: CursorPosition;
  direction: 'forward' | 'backward' | 'none';
}

export interface CursorState {
  userId: string;
  position: CursorPosition;
  selection: SelectionRange | null;
  timestamp: number;
}

export interface UserJoinedEvent {
  user: User;
  users: User[];
}

export interface UserLeftEvent {
  userId: string;
  users: User[];
}

export interface CodeUpdateEvent {
  code: string;
  userId: string;
  timestamp: number;
}

export interface ExecutionBroadcastEvent {
  userId: string;
  outputs: Array<{
    type: string;
    content: string;
    timestamp: number;
    order: number;
  }>;
}

export interface RoomStateEvent {
  users: User[];
  code: string;
  cursors: Record<string, CursorState>;
}

type EventMap = {
  'user-joined': UserJoinedEvent;
  'user-left': UserLeftEvent;
  'cursor-update': CursorState;
  'selection-update': CursorState;
  'code-update': CodeUpdateEvent;
  'execution-broadcast': ExecutionBroadcastEvent;
  'room-state': RoomStateEvent;
  'connected': { success: boolean; reconnect: boolean };
  'disconnected': void;
  'connection-error': { message: string };
};

type HandlerFunction<T> = (data: T) => void;
type HandlerRegistry = {
  [K in keyof EventMap]?: Set<HandlerFunction<EventMap[K]>>;
};

export class CursorSyncService {
  private socket: Socket | null = null;
  private handlers: HandlerRegistry = {};
  private currentUser: User | null = null;
  private mockMode = false;
  private mockUsers: User[] = [];
  private mockCursors: Record<string, CursorState> = {};
  private _mockCode = '';
  private mockIntervalId: ReturnType<typeof setInterval> | null = null;
  private serverUrl: string | null = null;

  connect(user: User, serverUrl?: string): void {
    this.currentUser = user;
    this.serverUrl = serverUrl || null;

    if (serverUrl) {
      this.tryConnectSocket(user, serverUrl);
    } else {
      setTimeout(() => this.enableMockMode(user), 100);
    }
  }

  private tryConnectSocket(user: User, url: string): void {
    try {
      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        autoConnect: true,
      });

      let isReconnect = false;

      this.socket.on('connect', () => {
        this.emit('connected', { success: true, reconnect: isReconnect });
        this.socket?.emit('room:join', { user, roomId: 'codecanvas-default' });
        isReconnect = true;
      });

      this.socket.on('disconnect', () => {
        this.emit('disconnected', undefined as unknown as void);
      });

      this.socket.on('connect_error', (err) => {
        this.emit('connection-error', { message: err.message });
        if (!this.mockMode) {
          this.enableMockMode(user);
        }
      });

      this.socket.on('room:state', (data: RoomStateEvent) => {
        this.emit('room-state', data);
        if (data.users) {
          this.mockUsers = data.users;
          this.emit('user-joined', { user, users: data.users });
        }
        if (data.code) {
          this.emit('code-update', {
            code: data.code,
            userId: 'server',
            timestamp: Date.now(),
          });
        }
      });

      this.socket.on('user:joined', (data: UserJoinedEvent) => {
        this.emit('user-joined', data);
      });

      this.socket.on('user:left', (data: UserLeftEvent) => {
        this.emit('user-left', data);
      });

      this.socket.on('cursor:update', (data: CursorState) => {
        if (data.userId !== this.currentUser?.id) {
          this.emit('cursor-update', data);
          if (data.selection) {
            this.emit('selection-update', data);
          }
        }
      });

      this.socket.on('selection:update', (data: CursorState) => {
        if (data.userId !== this.currentUser?.id) {
          this.emit('selection-update', data);
          this.emit('cursor-update', data);
        }
      });

      this.socket.on('code:update', (data: CodeUpdateEvent) => {
        if (data.userId !== this.currentUser?.id) {
          this.emit('code-update', data);
        }
      });

      this.socket.on('execution:broadcast', (data: ExecutionBroadcastEvent) => {
        if (data.userId !== this.currentUser?.id) {
          this.emit('execution-broadcast', data);
        }
      });
    } catch (err) {
      this.enableMockMode(user);
    }
  }

  private enableMockMode(user: User): void {
    if (this.mockMode) return;
    this.mockMode = true;
    this.mockUsers = [user];
    this.mockCursors = {};
    this._mockCode = '';

    this.emit('connected', { success: true, reconnect: false });
    this.emit('user-joined', { user, users: this.mockUsers });

    setTimeout(() => {
      if (!this.mockMode) return;
      const demoUsers: User[] = [
        { id: 'demo-alice', nickname: 'Alice', color: '#ef4444' },
        { id: 'demo-bob', nickname: 'Bob', color: '#10b981' },
      ];
      demoUsers.forEach((demo, idx) => {
        setTimeout(() => {
          if (!this.mockMode) return;
          this.mockUsers.push(demo);
          this.emit('user-joined', { user: demo, users: [...this.mockUsers] });
          this.startMockCursorFor(demo);
        }, (idx + 1) * 1500);
      });
    }, 1000);
  }

  private startMockCursorFor(user: User): void {
    if (!this.mockMode) return;

    const randomLine = () => Math.floor(Math.random() * 20) + 1;
    const randomCol = () => Math.floor(Math.random() * 40) + 1;

    const sendRandom = () => {
      if (!this.mockMode) return;
      const line = randomLine();
      const col = randomCol();
      const hasSelection = Math.random() > 0.7;
      const state: CursorState = {
        userId: user.id,
        position: { line, column: col },
        selection: hasSelection
          ? {
              start: { line, column: Math.max(1, col - 5) },
              end: { line, column: col + 3 },
              direction: 'forward',
            }
          : null,
        timestamp: Date.now(),
      };
      this.mockCursors[user.id] = state;
      this.emit('cursor-update', state);
      if (hasSelection) {
        this.emit('selection-update', state);
      }
    };

    sendRandom();
    const interval = setInterval(() => {
      if (!this.mockMode) {
        clearInterval(interval);
        return;
      }
      if (Math.random() > 0.3) {
        sendRandom();
      }
    }, 2000 + Math.random() * 3000);
  }

  disconnect(): void {
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch {
        /* ignore */
      }
      this.socket = null;
    }
    this.mockMode = false;
    this.mockUsers = [];
    this.mockCursors = {};
    if (this.mockIntervalId) {
      clearInterval(this.mockIntervalId);
      this.mockIntervalId = null;
    }
    this.currentUser = null;
    this.handlers = {};
  }

  sendCursorPosition(position: CursorPosition, selection: SelectionRange | null): void {
    if (!this.currentUser) return;

    const state: CursorState = {
      userId: this.currentUser.id,
      position,
      selection,
      timestamp: Date.now(),
    };

    this.mockCursors[this.currentUser.id] = state;

    if (this.socket && this.socket.connected) {
      this.socket.emit('cursor:update', state);
      if (selection) {
        this.socket.emit('selection:update', state);
      }
    }
  }

  sendSelection(selection: SelectionRange | null, position: CursorPosition): void {
    if (!this.currentUser) return;

    const state: CursorState = {
      userId: this.currentUser.id,
      position,
      selection,
      timestamp: Date.now(),
    };

    this.mockCursors[this.currentUser.id] = state;

    if (this.socket && this.socket.connected) {
      this.socket.emit('selection:update', state);
      this.socket.emit('cursor:update', state);
    }
  }

  sendCodeUpdate(code: string): void {
    if (!this.currentUser) return;
    this._mockCode = code;
    if (this.socket && this.socket.connected) {
      this.socket.emit('code:update', {
        code,
        userId: this.currentUser.id,
        timestamp: Date.now(),
      });
    }
  }

  broadcastExecution(
    outputs: Array<{ type: string; content: string; timestamp: number; order: number }>
  ): void {
    if (!this.currentUser) return;
    const event: ExecutionBroadcastEvent = {
      userId: this.currentUser.id,
      outputs,
    };
    if (this.socket && this.socket.connected) {
      this.socket.emit('execution:broadcast', event);
    }
  }

  on<K extends keyof EventMap>(
    event: K,
    handler: HandlerFunction<EventMap[K]>
  ): () => void {
    if (!this.handlers[event]) {
      this.handlers[event] = new Set() as HandlerRegistry[K];
    }
    (this.handlers[event] as Set<HandlerFunction<EventMap[K]>>).add(handler);
    return () => {
      const set = this.handlers[event] as Set<HandlerFunction<EventMap[K]>> | undefined;
      if (set) {
        set.delete(handler);
      }
    };
  }

  private emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const set = this.handlers[event];
    if (set && set.size > 0) {
      set.forEach((handler) => {
        try {
          (handler as HandlerFunction<EventMap[K]>)(data);
        } catch (err) {
          console.error(`[CursorSync] Handler error for ${event}:`, err);
        }
      });
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getConnectedUsers(): User[] {
    return this.mockUsers;
  }

  isConnected(): boolean {
    return this.mockMode || (this.socket?.connected ?? false);
  }

  isMockMode(): boolean {
    return this.mockMode;
  }

  getServerUrl(): string | null {
    return this.serverUrl;
  }
}

export const cursorSyncService = new CursorSyncService();

export const COLORS: readonly string[] = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#ec4899',
] as const;

export function getRandomColor(usedColors: readonly string[]): string {
  const used = new Set(usedColors);
  const available = COLORS.filter((c) => !used.has(c));
  const pool = available.length > 0 ? available : [...COLORS];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateUserId(): string {
  return `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
