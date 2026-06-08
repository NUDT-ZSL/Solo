import { io, Socket } from 'socket.io-client';

export type DrawEventData = {
  roomId: string;
  tool: 'pen' | 'rect' | 'circle';
  color: string;
  lineWidth: number;
  points: { x: number; y: number }[];
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export type StickyData = {
  id: string;
  roomId: string;
  x: number;
  y: number;
  text: string;
  color: string;
};

type SyncCallbacks = {
  onDrawEvent?: (data: DrawEventData) => void;
  onStickyAdd?: (data: StickyData) => void;
  onStickyMove?: (data: { id: string; x: number; y: number }) => void;
  onStickyUpdate?: (data: { id: string; text: string }) => void;
  onStickyDelete?: (data: { id: string }) => void;
  onClearCanvas?: () => void;
  onRoomUsers?: (count: number) => void;
};

export class SyncModule {
  private socket: Socket | null = null;
  private roomId: string = '';
  private callbacks: SyncCallbacks = {};

  connect(roomId: string) {
    this.roomId = roomId;
    this.socket = io({ transports: ['websocket', 'polling'] });

    this.socket.on('connect', () => {
      console.log('[sync] connected', this.socket?.id);
      this.socket!.emit('join-room', roomId);
    });

    this.socket.on('draw-event', (data: DrawEventData) => {
      this.callbacks.onDrawEvent?.(data);
    });

    this.socket.on('sticky-add', (data: StickyData) => {
      this.callbacks.onStickyAdd?.(data);
    });

    this.socket.on('sticky-move', (data: { id: string; x: number; y: number }) => {
      this.callbacks.onStickyMove?.(data);
    });

    this.socket.on('sticky-update', (data: { id: string; text: string }) => {
      this.callbacks.onStickyUpdate?.(data);
    });

    this.socket.on('sticky-delete', (data: { id: string }) => {
      this.callbacks.onStickyDelete?.(data);
    });

    this.socket.on('clear-canvas', () => {
      this.callbacks.onClearCanvas?.();
    });

    this.socket.on('room-users', (count: number) => {
      this.callbacks.onRoomUsers?.(count);
    });
  }

  on(callbacks: SyncCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  emitDrawEvent(data: Omit<DrawEventData, 'roomId'>) {
    this.socket?.emit('draw-event', { ...data, roomId: this.roomId });
  }

  emitStickyAdd(data: Omit<StickyData, 'roomId'>) {
    this.socket?.emit('sticky-add', { ...data, roomId: this.roomId });
  }

  emitStickyMove(id: string, x: number, y: number) {
    this.socket?.emit('sticky-move', { id, x, y, roomId: this.roomId });
  }

  emitStickyUpdate(id: string, text: string) {
    this.socket?.emit('sticky-update', { id, text, roomId: this.roomId });
  }

  emitStickyDelete(id: string) {
    this.socket?.emit('sticky-delete', { id, roomId: this.roomId });
  }

  emitClearCanvas() {
    this.socket?.emit('clear-canvas', this.roomId);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}
