export type DrawPoint = {
  x: number;
  y: number;
};

export type StrokeData = {
  id: string;
  userId: string;
  color: string;
  lineWidth: number;
  points: DrawPoint[];
  tool: 'brush' | 'eraser';
};

export type WSMessage =
  | { type: 'stroke_start'; stroke: StrokeData }
  | { type: 'stroke_move'; strokeId: string; point: DrawPoint; color: string }
  | { type: 'stroke_end'; strokeId: string }
  | { type: 'clear' }
  | { type: 'user_count'; count: number }
  | { type: 'history'; strokes: StrokeData[] }
  | { type: 'note_event'; color: string; x: number; y: number; frequency: number; strokeId: string; action: 'start' | 'move' | 'end' };

type HubCallbacks = {
  onStrokeStart?: (stroke: StrokeData) => void;
  onStrokeMove?: (strokeId: string, point: DrawPoint, color: string) => void;
  onStrokeEnd?: (strokeId: string) => void;
  onClear?: () => void;
  onUserCount?: (count: number) => void;
  onHistory?: (strokes: StrokeData[]) => void;
  onNoteEvent?: (event: WSMessage & { type: 'note_event' }) => void;
  onConnectionChange?: (connected: boolean) => void;
};

class CollaborationHub {
  private ws: WebSocket | null = null;
  private callbacks: HubCallbacks = {};
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private userId: string;
  private connected = false;
  private serverUrl: string;

  constructor(serverUrl?: string) {
    this.userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.serverUrl = serverUrl || this.getDefaultServerUrl();
  }

  private getDefaultServerUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.hostname}:8000/ws`;
  }

  getUserId(): string {
    return this.userId;
  }

  isConnected(): boolean {
    return this.connected;
  }

  on(callbacks: HubCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  off(callbacks: Partial<HubCallbacks>) {
    for (const key of Object.keys(callbacks)) {
      delete (this.callbacks as any)[key];
    }
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(`${this.serverUrl}?userId=${this.userId}`);

      this.ws.onopen = () => {
        this.connected = true;
        this.callbacks.onConnectionChange?.(true);
        this.requestHistory();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch {}
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.callbacks.onConnectionChange?.(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.connected = false;
        this.callbacks.onConnectionChange?.(false);
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private handleMessage(msg: WSMessage) {
    switch (msg.type) {
      case 'stroke_start':
        this.callbacks.onStrokeStart?.(msg.stroke);
        break;
      case 'stroke_move':
        this.callbacks.onStrokeMove?.(msg.strokeId, msg.point, msg.color);
        break;
      case 'stroke_end':
        this.callbacks.onStrokeEnd?.(msg.strokeId);
        break;
      case 'clear':
        this.callbacks.onClear?.();
        break;
      case 'user_count':
        this.callbacks.onUserCount?.(msg.count);
        break;
      case 'history':
        this.callbacks.onHistory?.(msg.strokes);
        break;
      case 'note_event':
        this.callbacks.onNoteEvent?.(msg as WSMessage & { type: 'note_event' });
        break;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 2000);
  }

  private send(msg: WSMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendStrokeStart(stroke: StrokeData) {
    this.send({ type: 'stroke_start', stroke });
  }

  sendStrokeMove(strokeId: string, point: DrawPoint, color: string) {
    this.send({ type: 'stroke_move', strokeId, point, color });
  }

  sendStrokeEnd(strokeId: string) {
    this.send({ type: 'stroke_end', strokeId });
  }

  sendClear() {
    this.send({ type: 'clear' });
  }

  sendNoteEvent(color: string, x: number, y: number, frequency: number, strokeId: string, action: 'start' | 'move' | 'end') {
    this.send({ type: 'note_event', color, x, y, frequency, strokeId, action });
  }

  requestHistory() {
    this.send({ type: 'history', strokes: [] });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
}

export default CollaborationHub;
