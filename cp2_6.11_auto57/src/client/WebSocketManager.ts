import { v4 as uuidv4 } from 'uuid';
import {
  Operation,
  WSMessage,
  Player,
  CellType,
  Hint,
} from '../types';

type MessageHandler = (message: WSMessage) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private url: string = '';
  private roomId: string = '';
  private playerId: string = '';

  connect(roomId: string, playerId?: string): Promise<{
    grid: CellType[][];
    players: Player[];
    hints: Hint[];
    history: Operation[];
    currentPlayer: Player;
  }> {
    this.roomId = roomId;
    this.playerId = playerId || this.playerId || localStorage.getItem('maze_player_id') || uuidv4();
    if (!playerId) {
      localStorage.setItem('maze_player_id', this.playerId);
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.url = `${protocol}//${host}/ws?room=${encodeURIComponent(roomId)}&playerId=${encodeURIComponent(this.playerId)}`;

    return new Promise((resolve, reject) => {
      this.attemptConnect(resolve, reject);
    });
  }

  private attemptConnect(
    resolve: (value: any) => void,
    reject: (reason?: any) => void
  ) {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          
          if (message.type === 'init') {
            resolve(message.data);
          }

          this.handlers.forEach((handler) => handler(message));
        } catch (e) {
          console.error('消息解析错误:', e);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        if (this.reconnectAttempts === 0) {
          reject(error);
        }
      };

      this.ws.onclose = () => {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          this.reconnectDelay *= 2;
          setTimeout(() => {
            this.attemptConnect(resolve, reject);
          }, this.reconnectDelay);
        }
      };
    } catch (e) {
      reject(e);
    }
  }

  send(operation: Omit<Operation, 'id' | 'playerId' | 'timestamp'>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket未连接');
      return;
    }

    const message: WSMessage = {
      type: 'operation',
      data: {
        ...operation,
        id: uuidv4(),
      },
      roomId: this.roomId,
      playerId: this.playerId,
    };

    this.ws.send(JSON.stringify(message));
  }

  requestStateSync(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message: WSMessage = {
      type: 'state_sync',
      data: {},
      roomId: this.roomId,
      playerId: this.playerId,
    };

    this.ws.send(JSON.stringify(message));
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  getPlayerId(): string {
    return this.playerId;
  }

  getRoomId(): string {
    return this.roomId;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers.clear();
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const wsManager = new WebSocketManager();
export default wsManager;
