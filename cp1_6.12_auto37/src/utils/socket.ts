import { io, Socket } from 'socket.io-client';
import { Node, Edge } from 'reactflow';

export interface User {
  id: string;
  nickname: string;
  color: string;
}

export interface CursorPosition {
  x: number;
  y: number;
}

export interface CursorMoveData {
  userId: string;
  position: CursorPosition;
}

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }
    this.socket = io('http://localhost:3001');
    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(roomId: string, nickname: string): void {
    if (this.socket) {
      this.socket.emit('join-room', { roomId, nickname });
    }
  }

  sendNodesUpdate(nodes: Node[]): void {
    if (this.socket) {
      this.socket.emit('nodes-update', nodes);
    }
  }

  sendEdgesUpdate(edges: Edge[]): void {
    if (this.socket) {
      this.socket.emit('edges-update', edges);
    }
  }

  sendCursorMove(position: CursorPosition): void {
    if (this.socket) {
      this.socket.emit('cursor-move', position);
    }
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
