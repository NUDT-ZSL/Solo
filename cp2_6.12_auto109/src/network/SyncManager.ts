import { io, Socket } from 'socket.io-client';
import type { DrawOperation, User } from '../../shared/types.js';

interface SyncManagerOptions {
  roomId: string;
  nickname: string;
  onOperation?: (operation: DrawOperation, userId: string) => void;
  onCursor?: (userId: string, x: number, y: number, isDrawing: boolean) => void;
  onReaction?: (userId: string, emoji: string, timestamp: number, duration: number) => void;
  onUserJoined?: (userId: string, nickname: string, color: string) => void;
  onUserLeft?: (userId: string) => void;
  onUsersList?: (users: User[]) => void;
  onHistory?: (operations: DrawOperation[]) => void;
  onUndo?: (userId: string) => void;
  onClear?: (userId: string) => void;
  onJoined?: (userId: string, color: string) => void;
}

class SyncManager {
  private socket: Socket | null = null;
  private roomId: string;
  private nickname: string;
  private userId: string = '';
  private userColor: string = '';
  private isConnected: boolean = false;

  private onOperation?: (operation: DrawOperation, userId: string) => void;
  private onCursor?: (userId: string, x: number, y: number, isDrawing: boolean) => void;
  private onReaction?: (userId: string, emoji: string, timestamp: number, duration: number) => void;
  private onUserJoined?: (userId: string, nickname: string, color: string) => void;
  private onUserLeft?: (userId: string) => void;
  private onUsersList?: (users: User[]) => void;
  private onHistory?: (operations: DrawOperation[]) => void;
  private onUndo?: (userId: string) => void;
  private onClear?: (userId: string) => void;
  private onJoined?: (userId: string, color: string) => void;

  private pendingOperations: DrawOperation[] = [];
  private lastSyncTime: number = 0;
  private syncThrottleMs: number = 30;

  private cursorThrottleMs: number = 30;
  private lastCursorTime: number = 0;

  constructor(options: SyncManagerOptions) {
    this.roomId = options.roomId;
    this.nickname = options.nickname;
    this.onOperation = options.onOperation;
    this.onCursor = options.onCursor;
    this.onReaction = options.onReaction;
    this.onUserJoined = options.onUserJoined;
    this.onUserLeft = options.onUserLeft;
    this.onUsersList = options.onUsersList;
    this.onHistory = options.onHistory;
    this.onUndo = options.onUndo;
    this.onClear = options.onClear;
    this.onJoined = options.onJoined;
  }

  connect() {
    this.socket = io({
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.socket?.emit('join', { roomId: this.roomId, nickname: this.nickname });
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });

    this.socket.on('joined', (data: { userId: string; color: string }) => {
      this.userId = data.userId;
      this.userColor = data.color;
      this.onJoined?.(data.userId, data.color);
    });

    this.socket.on('usersList', (users: User[]) => {
      this.onUsersList?.(users);
    });

    this.socket.on('userJoined', (data: { userId: string; nickname: string; color: string }) => {
      this.onUserJoined?.(data.userId, data.nickname, data.color);
    });

    this.socket.on('userLeft', (data: { userId: string }) => {
      this.onUserLeft?.(data.userId);
    });

    this.socket.on('operation', (data: { operation: DrawOperation; userId: string }) => {
      this.onOperation?.(data.operation, data.userId);
    });

    this.socket.on('cursor', (data: { userId: string; x: number; y: number; isDrawing: boolean }) => {
      this.onCursor?.(data.userId, data.x, data.y, data.isDrawing);
    });

    this.socket.on('reaction', (data: { userId: string; emoji: string; timestamp: number; duration: number }) => {
      this.onReaction?.(data.userId, data.emoji, data.timestamp, data.duration);
    });

    this.socket.on('history', (data: { operations: DrawOperation[] }) => {
      this.onHistory?.(data.operations);
    });

    this.socket.on('undo', (data: { userId: string }) => {
      this.onUndo?.(data.userId);
    });

    this.socket.on('clear', (data: { userId: string }) => {
      this.onClear?.(data.userId);
    });
  }

  sendOperation(operation: DrawOperation) {
    if (!this.isConnected || !this.socket) return;

    const now = Date.now();
    if (now - this.lastSyncTime < this.syncThrottleMs) {
      this.pendingOperations.push(operation);
      return;
    }

    this.lastSyncTime = now;

    if (this.pendingOperations.length > 0) {
      this.pendingOperations.forEach((op) => {
        this.socket?.emit('operation', { roomId: this.roomId, operation: op });
      });
      this.pendingOperations = [];
    }

    operation.userId = this.userId;
    this.socket.emit('operation', { roomId: this.roomId, operation });
  }

  sendCursor(x: number, y: number, isDrawing: boolean) {
    if (!this.isConnected || !this.socket) return;

    const now = Date.now();
    if (now - this.lastCursorTime < this.cursorThrottleMs) return;

    this.lastCursorTime = now;
    this.socket.emit('cursor', { roomId: this.roomId, x, y, isDrawing });
  }

  sendReaction(emoji: string) {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('reaction', { roomId: this.roomId, emoji });
  }

  sendUndo() {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('undo', { roomId: this.roomId });
  }

  sendClear() {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('clear', { roomId: this.roomId });
  }

  requestHistory() {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('getHistory', { roomId: this.roomId });
  }

  getUserId(): string {
    return this.userId;
  }

  getUserColor(): string {
    return this.userColor;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  isConnectedToServer(): boolean {
    return this.isConnected;
  }
}

export default SyncManager;
