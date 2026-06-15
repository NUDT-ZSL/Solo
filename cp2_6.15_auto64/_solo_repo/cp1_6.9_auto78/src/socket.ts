import { io, Socket } from 'socket.io-client';

export interface MindMapNode {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  isRoot: boolean;
  createdAt: number;
}

export interface MindMapEdge {
  id: string;
  from: string;
  to: string;
}

export interface MindMapState {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export interface UserInfo {
  id: string;
  name: string;
  draggingNodeId: string | null;
}

export interface DraggingUser {
  userId: string;
  nodeId: string;
  userName: string;
}

type EventCallback = (...args: any[]) => void;

class SocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();

  connect(): void {
    if (this.socket && this.socket.connected) return;
    this.socket = io({
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      this.emit('connected', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      this.emit('disconnected');
    });

    this.socket.on('room:joined', (data: { state: MindMapState; roomId: string; users: UserInfo[] }) => {
      this.emit('room:joined', data);
    });

    this.socket.on('user:joined', (data: { userId: string; userName: string }) => {
      this.emit('user:joined', data);
    });

    this.socket.on('user:left', (data: { userId: string; userName: string }) => {
      this.emit('user:left', data);
    });

    this.socket.on('node:created', (data: { node: MindMapNode; initiatorId: string }) => {
      this.emit('node:created', data);
    });

    this.socket.on('node:created:ack', (data: { node: MindMapNode; clientId: string }) => {
      this.emit('node:created:ack', data);
    });

    this.socket.on('node:moved', (data: { nodeId: string; x: number; y: number; initiatorId: string }) => {
      this.emit('node:moved', data);
    });

    this.socket.on('node:text:updated', (data: { nodeId: string; text: string; initiatorId: string }) => {
      this.emit('node:text:updated', data);
    });

    this.socket.on('node:deleted', (data: { nodeId: string; initiatorId: string }) => {
      this.emit('node:deleted', data);
    });

    this.socket.on('edge:created', (data: { edge: MindMapEdge; initiatorId: string }) => {
      this.emit('edge:created', data);
    });

    this.socket.on('edge:created:ack', (data: { edge: MindMapEdge }) => {
      this.emit('edge:created:ack', data);
    });

    this.socket.on('edge:deleted', (data: { edgeId: string; initiatorId: string }) => {
      this.emit('edge:deleted', data);
    });

    this.socket.on('user:dragging', (data: DraggingUser) => {
      this.emit('user:dragging', data);
    });

    this.socket.on('user:drag:end', (data: { userId: string; nodeId: string }) => {
      this.emit('user:drag:end', data);
    });

    this.socket.on('state:update', (data: { state: MindMapState; initiatorId: string }) => {
      this.emit('state:update', data);
    });

    this.socket.on('version:created', (data: { version: { id: string; timestamp: number; creatorId: string; creatorName: string } }) => {
      this.emit('version:created', data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  joinRoom(roomId: string, userName: string): void {
    this.socket?.emit('room:join', { roomId, userName });
  }

  createNode(roomId: string, node: Omit<MindMapNode, 'id' | 'createdAt'> & { id?: string }): void {
    this.socket?.emit('node:create', { roomId, node });
  }

  moveNode(roomId: string, nodeId: string, x: number, y: number): void {
    this.socket?.emit('node:move', { roomId, nodeId, x, y });
  }

  dragStart(roomId: string, nodeId: string): void {
    this.socket?.emit('node:drag:start', { roomId, nodeId });
  }

  dragEnd(roomId: string, nodeId: string): void {
    this.socket?.emit('node:drag:end', { roomId, nodeId });
  }

  updateNodeText(roomId: string, nodeId: string, text: string): void {
    this.socket?.emit('node:text', { roomId, nodeId, text });
  }

  deleteNode(roomId: string, nodeId: string): void {
    this.socket?.emit('node:delete', { roomId, nodeId });
  }

  createEdge(roomId: string, from: string, to: string): void {
    this.socket?.emit('edge:create', { roomId, from, to });
  }

  deleteEdge(roomId: string, edgeId: string): void {
    this.socket?.emit('edge:delete', { roomId, edgeId });
  }

  takeSnapshot(roomId: string, userId: string, userName: string): void {
    this.socket?.emit('state:snapshot', { roomId, userId, userName });
  }

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach(cb => cb(...args));
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

export const socketManager = new SocketManager();
export default socketManager;
