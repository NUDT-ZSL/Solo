import axios from 'axios';

export type Emotion = 'happy' | 'sad' | 'calm' | 'wild';

export interface Relay {
  id: string;
  content: string;
  emotion: Emotion;
  createdAt: number;
}

export interface Bottle {
  id: string;
  content: string;
  emotion: Emotion;
  relays: Relay[];
  createdAt: number;
}

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('[API Error]', error.message);
    return Promise.reject(error);
  }
);

export const api = {
  async getBottles(): Promise<Bottle[]> {
    return apiClient.get('/bottles');
  },

  async getBottle(id: string): Promise<Bottle> {
    return apiClient.get(`/bottles/${id}`);
  },

  async createBottle(content: string, emotion: Emotion): Promise<Bottle> {
    return apiClient.post('/bottles', { content, emotion });
  },

  async addRelay(bottleId: string, content: string, emotion: Emotion): Promise<Bottle> {
    return apiClient.post(`/bottles/${bottleId}/relays`, { content, emotion });
  },

  async searchBottles(query?: string, emotion?: Emotion): Promise<Bottle[]> {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (emotion) params.set('emotion', emotion);
    return apiClient.get(`/bottles/search?${params.toString()}`);
  },
};

type WsMessage =
  | { type: 'NEW_BOTTLE'; payload: Bottle }
  | { type: 'NEW_RELAY'; payload: { bottleId: string; relay: Relay } };

class WsManager {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(msg: any) => void>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;
  private pendingMessages: WsMessage[] = [];

  connect() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const url = `${protocol}//${host}/ws`;

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        while (this.pendingMessages.length > 0) {
          const msg = this.pendingMessages.shift()!;
          this.send(msg);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);
          this.emit(msg.type, msg.payload);
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[WS] Error:', err);
      };

      this.ws.onclose = () => {
        console.log('[WS] Disconnected');
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };
    } catch (e) {
      console.error('[WS] Failed to connect:', e);
      if (this.shouldReconnect) this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 3000);
  }

  send(msg: WsMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.pendingMessages.push(msg);
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.connect();
      }
    }
  }

  onNewBottle(cb: (bottle: Bottle) => void): () => void {
    return this.on('NEW_BOTTLE', cb);
  }

  onNewRelay(cb: (data: { bottleId: string; relay: Relay }) => void): () => void {
    return this.on('NEW_RELAY', cb);
  }

  private on(event: string, cb: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(cb);
    return () => {
      this.listeners.get(event)?.delete(cb);
    };
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.error('[WS] Listener error:', e);
      }
    });
  }

  broadcastNewBottle(bottle: Bottle) {
    this.send({ type: 'NEW_BOTTLE', payload: bottle });
  }

  broadcastNewRelay(bottleId: string, relay: Relay) {
    this.send({ type: 'NEW_RELAY', payload: { bottleId, relay } });
  }

  destroy() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.listeners.clear();
  }
}

export const wsManager = new WsManager();

if (typeof window !== 'undefined') {
  setTimeout(() => wsManager.connect(), 500);
}
