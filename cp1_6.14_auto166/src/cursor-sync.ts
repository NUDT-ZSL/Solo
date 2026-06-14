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

export interface Selection {
  start: CursorPosition;
  end: CursorPosition;
}

export interface CursorState {
  userId: string;
  position: CursorPosition;
  selection: Selection | null;
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
}

export interface ExecutionBroadcastEvent {
  userId: string;
  outputs: Array<{ type: string; content: string; timestamp: number }>;
}

type EventHandler<T = unknown> = (data: T) => void;

interface EventHandlers {
  'user-joined': EventHandler<UserJoinedEvent>[];
  'user-left': EventHandler<UserLeftEvent>[];
  'cursor-update': EventHandler<CursorState>[];
  'code-update': EventHandler<CodeUpdateEvent>[];
  'execution-broadcast': EventHandler<ExecutionBroadcastEvent>[];
  'connected': EventHandler<{ success: boolean }>[];
  'disconnected': EventHandler<void>[];
}

export class CursorSyncService {
  private socket: Socket | null = null;
  private eventHandlers: EventHandlers = {
    'user-joined': [],
    'user-left': [],
    'cursor-update': [],
    'code-update': [],
    'execution-broadcast': [],
    'connected': [],
    'disconnected': [],
  };
  private currentUser: User | null = null;
  private mockMode = false;
  private mockUsers: User[] = [];

  connect(user: User, serverUrl?: string): void {
    this.currentUser = user;

    try {
      if (serverUrl) {
        this.socket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
          this.emit('connected', { success: true });
          this.socket?.emit('join', user);
        });

        this.socket.on('disconnect', () => {
          this.emit('disconnected');
        });

        this.socket.on('user-joined', (data: UserJoinedEvent) => {
          this.emit('user-joined', data);
        });

        this.socket.on('user-left', (data: UserLeftEvent) => {
          this.emit('user-left', data);
        });

        this.socket.on('cursor-update', (data: CursorState) => {
          if (data.userId !== this.currentUser?.id) {
            this.emit('cursor-update', data);
          }
        });

        this.socket.on('code-update', (data: CodeUpdateEvent) => {
          if (data.userId !== this.currentUser?.id) {
            this.emit('code-update', data);
          }
        });

        this.socket.on('execution-broadcast', (data: ExecutionBroadcastEvent) => {
          if (data.userId !== this.currentUser?.id) {
            this.emit('execution-broadcast', data);
          }
        });

        this.socket.on('connect_error', () => {
          this.enableMockMode(user);
        });
      } else {
        this.enableMockMode(user);
      }
    } catch {
      this.enableMockMode(user);
    }
  }

  private enableMockMode(user: User): void {
    this.mockMode = true;
    this.mockUsers = [user];
    this.emit('connected', { success: true });
    this.emit('user-joined', { user, users: this.mockUsers });

    setTimeout(() => {
      const mockUser: User = {
        id: 'mock-user-1',
        nickname: 'DemoUser',
        color: '#10b981',
      };
      this.mockUsers.push(mockUser);
      this.emit('user-joined', { user: mockUser, users: this.mockUsers });
    }, 2000);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.mockMode = false;
    this.mockUsers = [];
    this.currentUser = null;
  }

  sendCursorPosition(position: CursorPosition, selection: Selection | null): void {
    if (!this.currentUser) return;

    const cursorState: CursorState = {
      userId: this.currentUser.id,
      position,
      selection,
    };

    if (this.socket && this.socket.connected) {
      this.socket.emit('cursor-update', cursorState);
    }
  }

  sendCodeUpdate(code: string): void {
    if (!this.currentUser) return;

    if (this.socket && this.socket.connected) {
      this.socket.emit('code-update', {
        code,
        userId: this.currentUser.id,
      });
    }
  }

  broadcastExecution(outputs: Array<{ type: string; content: string; timestamp: number }>): void {
    if (!this.currentUser) return;

    const event: ExecutionBroadcastEvent = {
      userId: this.currentUser.id,
      outputs,
    };

    if (this.socket && this.socket.connected) {
      this.socket.emit('execution-broadcast', event);
    }
  }

  on<T extends keyof EventHandlers>(
    event: T,
    handler: EventHandlers[T][number]
  ): () => void {
    this.eventHandlers[event].push(handler as EventHandler);
    return () => {
      const handlers = this.eventHandlers[event] as EventHandler[];
      this.eventHandlers[event] = handlers.filter(
        h => h !== handler
      ) as EventHandlers[T];
    };
  }

  private emit<T extends keyof EventHandlers>(
    event: T,
    data?: Parameters<EventHandlers[T][number]>[0]
  ): void {
    this.eventHandlers[event].forEach(handler => {
      (handler as EventHandler)(data);
    });
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isConnected(): boolean {
    return this.mockMode || (this.socket?.connected ?? false);
  }
}

export const cursorSyncService = new CursorSyncService();

export const COLORS = [
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
];

export function getRandomColor(usedColors: string[]): string {
  const available = COLORS.filter(c => !usedColors.includes(c));
  if (available.length === 0) {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}
