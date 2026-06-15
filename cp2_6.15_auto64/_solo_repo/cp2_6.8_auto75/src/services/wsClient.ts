import type { WSMessageType, WSMessage } from '../types';

type Listener = (payload: any) => void;

export interface WSClient {
  on: <T = unknown>(type: WSMessageType, listener: (payload: T) => void) => void;
  off: <T = unknown>(type: WSMessageType, listener: (payload: T) => void) => void;
  send: <T = unknown>(type: WSMessageType, payload: T) => void;
  close: () => void;
}

const WS_URL = (() => {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
})();

export function createWSClient(): WSClient {
  const listeners = new Map<WSMessageType, Set<Listener>>();
  let ws: WebSocket;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingMessages: WSMessage[] = [];

  const connect = () => {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      while (pendingMessages.length > 0) {
        const msg = pendingMessages.shift()!;
        ws.send(JSON.stringify(msg));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        const set = listeners.get(msg.type);
        if (set) {
          set.forEach((fn) => fn(msg.payload));
        }
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };

    ws.onclose = () => {
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, 2000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  };

  connect();

  return {
    on(type, listener) {
      if (!listeners.has(type)) {
        listeners.set(type, new Set());
      }
      listeners.get(type)!.add(listener);
    },
    off(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    send(type, payload) {
      const msg: WSMessage = { type, payload };
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      } else {
        pendingMessages.push(msg);
      }
    },
    close() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      ws.close();
    },
  };
}
