export interface Point {
  x: number;
  y: number;
}

export interface DrawPayload {
  strokeId: string;
  userId: string;
  color: string;
  size: number;
  points: Point[];
}

export interface UndoPayload {
  userId: string;
  strokeId: string;
}

export type ClientMessage =
  | { type: 'DRAW'; payload: DrawPayload }
  | { type: 'UNDO'; payload: UndoPayload }
  | { type: 'CLEAR_CANVAS'; payload: { userId: string } };

export type ServerMessage =
  | { type: 'WELCOME'; payload: { userId: string; isAdmin: boolean; strokes: DrawPayload[] } }
  | { type: 'USER_JOINED'; payload: { userId: string; onlineCount: number } }
  | { type: 'USER_LEFT'; payload: { userId: string; onlineCount: number } }
  | { type: 'DRAW_BROADCAST'; payload: DrawPayload }
  | { type: 'UNDO_BROADCAST'; payload: UndoPayload }
  | { type: 'CLEAR_BROADCAST' }
  | { type: 'ERROR'; payload: { message: string } };

type MessageCallback = (message: ServerMessage) => void;

const getWsUrl = (): string => {
  const host = window.location.hostname;
  return `ws://${host}:3001/ws`;
};

const MAX_MESSAGE_BYTES = 10 * 1024;

class NetworkManager {
  private ws: WebSocket | null = null;
  private messageListeners: Set<MessageCallback> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;

  connect(): Promise<{ userId: string; isAdmin: boolean; strokes: DrawPayload[] }> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(getWsUrl());
      } catch (err) {
        reject(err);
        return;
      }

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        let msg: ServerMessage;
        try {
          msg = JSON.parse(event.data) as ServerMessage;
        } catch {
          return;
        }

        if (msg.type === 'WELCOME') {
          resolve({
            userId: msg.payload.userId,
            isAdmin: msg.payload.isAdmin,
            strokes: msg.payload.strokes,
          });
        }

        for (const listener of this.messageListeners) {
          try {
            listener(msg);
          } catch (err) {
            console.error('Network listener error:', err);
          }
        }
      };

      this.ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        if (this.reconnectAttempts === 0) {
          reject(new Error('WebSocket connection failed'));
        }
      };

      this.ws.onclose = () => {
        this.scheduleReconnect();
      };
    });
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => undefined);
    }, delay);
  }

  send(message: ClientMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    const data = JSON.stringify(message);
    if (Buffer.byteLength(data, 'utf8') > MAX_MESSAGE_BYTES) {
      console.warn('Message too large, not sending');
      return false;
    }
    this.ws.send(data);
    return true;
  }

  onMessage(callback: MessageCallback): () => void {
    this.messageListeners.add(callback);
    return () => {
      this.messageListeners.delete(callback);
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageListeners.clear();
  }
}

export const network = new NetworkManager();
