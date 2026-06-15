type WSHandler = (data: any) => void;

class WSManager {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<WSHandler>> = new Map();
  private reconnectTimer: any = null;
  private url: string = '';

  connect(url: string = '/ws') {
    this.url = url;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const fullUrl = `${proto}//${host}${url}`;

    try {
      this.ws = new WebSocket(fullUrl);
    } catch (e) {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[WS] connected');
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const { type, data } = msg;
        const set = this.handlers.get(type);
        if (set) set.forEach((h) => h(data));
      } catch (err) {
        console.error('[WS] parse error', err);
      }
    };

    this.ws.onclose = () => {
      console.log('[WS] closed');
      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.error('[WS] error', err);
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.url);
    }, 3000);
  }

  on(type: string, handler: WSHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  close() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
    this.ws = null;
  }
}

export const ws = new WSManager();
