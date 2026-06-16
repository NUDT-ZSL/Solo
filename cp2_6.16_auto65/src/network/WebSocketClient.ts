import type { Template, LightSculpture } from '@/types';

interface WSMessage {
  event: string;
  data: unknown;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts: number = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private url: string = 'ws://localhost:3001';

  public onTemplateCreated: ((template: Template) => void) | null = null;
  public onTemplateDeleted: ((id: string) => void) | null = null;
  public onSyncState: ((sculpture: LightSculpture) => void) | null = null;
  public onConnectionChange: ((connected: boolean) => void) | null = null;

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.onConnectionChange?.(true);
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.onConnectionChange?.(false);
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message: WSMessage = JSON.parse(event.data as string);
        this.handleMessage(message);
      } catch {
        // ignore malformed messages
      }
    };
  }

  disconnect(): void {
    this.clearReconnectTimer();
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.onConnectionChange?.(false);
  }

  sendSculptureUpdate(sculpture: LightSculpture): void {
    this.send('sculpture:update', sculpture);
  }

  sendTemplateSave(template: Template): void {
    this.send('template:save', template);
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private send(event: string, data: unknown): void {
    if (!this.isConnected()) return;
    const message: WSMessage = { event, data };
    this.ws!.send(JSON.stringify(message));
  }

  private handleMessage(message: WSMessage): void {
    switch (message.event) {
      case 'template:created':
        this.onTemplateCreated?.(message.data as Template);
        break;
      case 'template:deleted':
        this.onTemplateDeleted?.(message.data as string);
        break;
      case 'sync:state':
        this.onSyncState?.(message.data as LightSculpture);
        break;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send('ping', null);
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
