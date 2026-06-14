import { EditorCore, Change, Position } from './EditorCore';

export interface UserJoinEvent {
  type: 'user-join';
  userId: string;
  userName: string;
  timestamp: number;
}

export interface UserLeaveEvent {
  type: 'user-leave';
  userId: string;
  userName: string;
  timestamp: number;
}

export interface VersionUpdateEvent {
  type: 'version-update';
  version: string;
  timestamp: number;
}

export interface SyncEvent {
  type: 'sync';
  content: string;
  version: string;
  users: Array<{ userId: string; userName: string; color: string }>;
}

export type CollabEvent = Change | Position | UserJoinEvent | UserLeaveEvent | VersionUpdateEvent | SyncEvent;

type UserPresenceListener = (event: UserJoinEvent | UserLeaveEvent) => void;
type VersionListener = (version: string) => void;
type SyncListener = (content: string) => void;
type ConnectionListener = (connected: boolean) => void;

export class CollabSync {
  private ws: WebSocket | null = null;
  private editorCore: EditorCore;
  private docId: string;
  private serverUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private pendingChanges: Change[] = [];
  private pendingPositions: Position[] = [];
  private flushInterval: number | null = null;
  private lastSentPosition: number = -1;
  private positionThrottleMs = 50;
  private lastPositionSendTime = 0;

  private userPresenceListeners: UserPresenceListener[] = [];
  private versionListeners: VersionListener[] = [];
  private syncListeners: SyncListener[] = [];
  private connectionListeners: ConnectionListener[] = [];

  private unsubLocalChange: (() => void) | null = null;
  private unsubPositionChange: (() => void) | null = null;

  constructor(editorCore: EditorCore, docId: string, serverUrl: string) {
    this.editorCore = editorCore;
    this.docId = docId;
    this.serverUrl = serverUrl;
  }

  connect(): void {
    try {
      const wsUrl = `${this.serverUrl}?docId=${this.docId}&userId=${this.editorCore.getUserId()}&userName=${encodeURIComponent(this.editorCore.getUserName())}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyConnectionListeners(true);
        this.flushPending();
        this.startPositionFlush();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notifyConnectionListeners(false);
        this.stopPositionFlush();
        this.scheduleReconnect();
      };

      this.unsubLocalChange = this.editorCore.onLocalChange((change) => {
        this.sendChange(change);
      });

      this.unsubPositionChange = this.editorCore.onPositionChange((position) => {
        this.throttleSendPosition(position);
      });

    } catch (e) {
      console.error('Failed to connect:', e);
      this.scheduleReconnect();
    }
  }

  private handleMessage(data: CollabEvent): void {
    if (!('type' in data)) {
      if ('insert' in data && 'from' in data) {
        const change = data as Change;
        if (change.userId !== this.editorCore.getUserId()) {
          this.editorCore.applyRemoteChange(change);
        }
      } else if ('pos' in data) {
        const position = data as Position;
        if (position.userId !== this.editorCore.getUserId()) {
          this.handleRemotePosition(position);
        }
      }
      return;
    }

    switch (data.type) {
      case 'user-join':
      case 'user-leave':
        this.notifyUserPresenceListeners(data);
        break;
      case 'version-update':
        this.notifyVersionListeners(data.version);
        break;
      case 'sync':
        this.handleSync(data);
        break;
    }
  }

  private handleRemotePosition(position: Position): void {
    const event = new CustomEvent('remote-cursor', { detail: position });
    window.dispatchEvent(event);
  }

  private handleSync(data: SyncEvent): void {
    this.editorCore.setContent(data.content);
    this.notifySyncListeners(data.content);
    this.notifyVersionListeners(data.version);
  }

  private sendChange(change: Change): void {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(change));
    } else {
      this.pendingChanges.push(change);
    }
  }

  private throttleSendPosition(position: Position): void {
    const now = Date.now();
    if (now - this.lastPositionSendTime < this.positionThrottleMs) {
      this.pendingPositions = this.pendingPositions.filter(p => p.userId !== position.userId);
      this.pendingPositions.push(position);
      return;
    }

    this.lastPositionSendTime = now;
    this.sendPosition(position);
  }

  private sendPosition(position: Position): void {
    if (position.pos === this.lastSentPosition) return;
    this.lastSentPosition = position.pos;

    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(position));
    } else {
      this.pendingPositions.push(position);
    }
  }

  private startPositionFlush(): void {
    this.flushInterval = window.setInterval(() => {
      if (this.pendingPositions.length > 0 && this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        const latestPositions = new Map<string, Position>();
        this.pendingPositions.forEach(p => latestPositions.set(p.userId, p));
        latestPositions.forEach(p => this.ws?.send(JSON.stringify(p)));
        this.pendingPositions = [];
      }
    }, 100);
  }

  private stopPositionFlush(): void {
    if (this.flushInterval !== null) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  private flushPending(): void {
    while (this.pendingChanges.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const change = this.pendingChanges.shift();
      if (change) {
        this.ws.send(JSON.stringify(change));
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    setTimeout(() => {
      console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
      this.connect();
    }, delay);
  }

  disconnect(): void {
    this.stopPositionFlush();
    
    if (this.unsubLocalChange) {
      this.unsubLocalChange();
      this.unsubLocalChange = null;
    }
    if (this.unsubPositionChange) {
      this.unsubPositionChange();
      this.unsubPositionChange = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.pendingChanges = [];
    this.pendingPositions = [];
  }

  getWebSocket(): WebSocket | null {
    return this.ws;
  }

  isWsConnected(): boolean {
    return this.isConnected;
  }

  onUserPresence(listener: UserPresenceListener): () => void {
    this.userPresenceListeners.push(listener);
    return () => {
      this.userPresenceListeners = this.userPresenceListeners.filter(l => l !== listener);
    };
  }

  onVersionUpdate(listener: VersionListener): () => void {
    this.versionListeners.push(listener);
    return () => {
      this.versionListeners = this.versionListeners.filter(l => l !== listener);
    };
  }

  onSync(listener: SyncListener): () => void {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.push(listener);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
    };
  }

  private notifyUserPresenceListeners(event: UserJoinEvent | UserLeaveEvent): void {
    this.userPresenceListeners.forEach(listener => listener(event));
  }

  private notifyVersionListeners(version: string): void {
    this.versionListeners.forEach(listener => listener(version));
  }

  private notifySyncListeners(content: string): void {
    this.syncListeners.forEach(listener => listener(content));
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(listener => listener(connected));
  }
}
