import { io, Socket } from 'socket.io-client';

interface CursorPosition {
  line: number;
  column: number;
}

interface ServerToClientEvents {
  'proposal-updated': () => void;
  'collaborator-joined': (collaborator: { userId: string; username: string; color: string }) => void;
  'collaborator-left': (data: { userId: string }) => void;
  'remote-content-change': (data: { content: string; userId: string }) => void;
  'remote-cursor-move': (data: { userId: string; username: string; position: number; cursorPosition: CursorPosition; color: string }) => void;
}

interface ClientToServerEvents {
  'join-proposal': (data: { proposalId: string; userId: string; username: string; color: string }) => void;
  'leave-proposal': (data: { proposalId: string; userId: string }) => void;
  'content-change': (data: { proposalId: string; content: string; userId: string }) => void;
  'cursor-move': (data: { proposalId: string; userId: string; position: number; cursorPosition: CursorPosition }) => void;
}

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

class SocketService {
  private socket: TypedSocket = io({ autoConnect: false, reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 1000 });
  private listeners: Map<string, (...args: unknown[]) => void> = new Map();

  connect(): void {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect(): void {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

  joinProposal(proposalId: string, userId: string, username: string, color: string): void {
    this.socket.emit('join-proposal', { proposalId, userId, username, color });
  }

  leaveProposal(proposalId: string, userId: string): void {
    this.socket.emit('leave-proposal', { proposalId, userId });
  }

  sendContentChange(proposalId: string, content: string, userId: string): void {
    this.socket.emit('content-change', { proposalId, content, userId });
  }

  sendCursorMove(proposalId: string, userId: string, position: number, cursorPosition: CursorPosition): void {
    this.socket.emit('cursor-move', { proposalId, userId, position, cursorPosition });
  }

  on(event: string, callback: (...args: any[]) => void): void {
    this.listeners.set(event, callback);
    this.socket.on(event as keyof ServerToClientEvents, callback as never);
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    const storedCallback = this.listeners.get(event);
    if (storedCallback) {
      this.socket.off(event as keyof ServerToClientEvents, storedCallback as never);
      this.listeners.delete(event);
    }
  }

  get isConnected(): boolean {
    return this.socket.connected;
  }
}

export const socketService = new SocketService();
export { SocketService };
