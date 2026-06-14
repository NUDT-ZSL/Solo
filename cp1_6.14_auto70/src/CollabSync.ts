import { EditorCore, DocChange, UserCursor, CursorPosition } from './EditorCore';

export enum WsMessageType {
  EDIT_OPERATION = 'edit-operation',
  CURSOR_UPDATE = 'cursor-update',
  USER_JOIN = 'user-join',
  USER_LEAVE = 'user-leave',
  VERSION_UPDATE = 'version-update',
  SYNC_REQUEST = 'sync-request',
  SYNC_RESPONSE = 'sync-response',
  ACKNOWLEDGMENT = 'acknowledgment'
}

export interface WsEditOperation {
  type: WsMessageType.EDIT_OPERATION;
  payload: DocChange;
  version: string;
  docId: string;
}

export interface WsCursorUpdate {
  type: WsMessageType.CURSOR_UPDATE;
  payload: {
    userId: string;
    userName: string;
    color: string;
    position: CursorPosition;
  };
  docId: string;
  timestamp: number;
}

export interface WsUserJoin {
  type: WsMessageType.USER_JOIN;
  payload: {
    userId: string;
    userName: string;
    color: string;
  };
  docId: string;
  timestamp: number;
  version: string;
}

export interface WsUserLeave {
  type: WsMessageType.USER_LEAVE;
  payload: {
    userId: string;
    userName: string;
  };
  docId: string;
  timestamp: number;
}

export interface WsVersionUpdate {
  type: WsMessageType.VERSION_UPDATE;
  payload: {
    changeId: string;
    userId: string;
  };
  docId: string;
  version: string;
  timestamp: number;
}

export interface WsSyncRequest {
  type: WsMessageType.SYNC_REQUEST;
  payload: {
    userId: string;
    lastVersion?: string;
  };
  docId: string;
}

export interface WsSyncResponse {
  type: WsMessageType.SYNC_RESPONSE;
  payload: {
    content: string;
    users: Array<{
      userId: string;
      userName: string;
      color: string;
      position?: CursorPosition;
    }>;
  };
  docId: string;
  version: string;
  timestamp: number;
}

export interface WsAcknowledgment {
  type: WsMessageType.ACKNOWLEDGMENT;
  payload: {
    changeId: string;
  };
  docId: string;
  version: string;
  timestamp: number;
}

export type WsMessage =
  | WsEditOperation
  | WsCursorUpdate
  | WsUserJoin
  | WsUserLeave
  | WsVersionUpdate
  | WsSyncRequest
  | WsSyncResponse
  | WsAcknowledgment;

export type UserPresenceEvent = WsUserJoin | WsUserLeave;

type VersionChangeListener = (version: string) => void;
type UserPresenceListener = (event: UserPresenceEvent) => void;
type SyncListener = (content: string) => void;
type ConnectionListener = (connected: boolean) => void;

interface PendingOperation {
  changeId: string;
  message: WsEditOperation;
  sentAt: number;
  retryCount: number;
}

const MAX_RETRIES = 3;
const ACK_TIMEOUT_MS = 5000;
const VERSION_REGEX = /^v(\d+)\.(\d+)\.(\d+)$/;

function parseVersion(v: string): [number, number, number] | null {
  const m = v.match(VERSION_REGEX);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return 0;
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

function incrementVersion(v: string): string {
  const p = parseVersion(v);
  if (!p) return v;
  let [major, minor, patch] = p;
  patch++;
  if (patch >= 100) { patch = 0; minor++; }
  if (minor >= 10) { minor = 0; major++; }
  return `v${major}.${minor}.${patch}`;
}

export class CollabSync {
  private ws: WebSocket | null = null;
  private editorCore: EditorCore;
  private docId: string;
  private serverUrl: string;
  private currentVersion: string = 'v1.0.0';
  private confirmedVersion: string = 'v1.0.0';

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;

  private pendingEditOperations: WsEditOperation[] = [];
  private pendingCursorUpdates: WsCursorUpdate[] = [];
  private flushInterval: number | null = null;

  private unacknowledgedOps: Map<string, PendingOperation> = new Map();
  private ackCheckInterval: number | null = null;

  private lastSentPosition: number = -1;
  private positionThrottleMs = 50;
  private lastPositionSendTime = 0;

  private versionChangeListeners: VersionChangeListener[] = [];
  private userPresenceListeners: UserPresenceListener[] = [];
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
      const params = new URLSearchParams({
        docId: this.docId,
        userId: this.editorCore.getUserId(),
        userName: encodeURIComponent(this.editorCore.getUserName()),
        userColor: this.editorCore.getUserColor()
      });
      const wsUrl = `${this.serverUrl}?${params.toString()}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyConnectionListeners(true);
        this.sendSyncRequest();
        this.flushPending();
        this.startPositionFlush();
        this.startAckCheck();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WsMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (e) {
          console.error('[CollabSync] 解析 WebSocket 消息失败:', e);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[CollabSync] WebSocket 错误:', error);
      };

      this.ws.onclose = (event) => {
        console.log('[CollabSync] WebSocket 连接关闭, code:', event.code);
        this.isConnected = false;
        this.notifyConnectionListeners(false);
        this.stopPositionFlush();
        this.stopAckCheck();
        this.scheduleReconnect();
      };

      this.unsubLocalChange = this.editorCore.onLocalChange((change: DocChange) => {
        this.sendEditOperation(change);
      });

      this.unsubPositionChange = this.editorCore.onPositionChange((cursor: UserCursor) => {
        this.throttleSendCursor(cursor);
      });

    } catch (e) {
      console.error('[CollabSync] 建立连接失败:', e);
      this.scheduleReconnect();
    }
  }

  private handleMessage(message: WsMessage): void {
    switch (message.type) {
      case WsMessageType.EDIT_OPERATION:
        this.handleEditOperation(message);
        break;
      case WsMessageType.CURSOR_UPDATE:
        this.handleCursorUpdate(message);
        break;
      case WsMessageType.USER_JOIN:
      case WsMessageType.USER_LEAVE:
        this.handleUserPresence(message);
        break;
      case WsMessageType.VERSION_UPDATE:
        this.handleVersionUpdate(message);
        break;
      case WsMessageType.SYNC_RESPONSE:
        this.handleSyncResponse(message);
        break;
      case WsMessageType.ACKNOWLEDGMENT:
        this.handleAcknowledgment(message);
        break;
      default:
        console.log('[CollabSync] 收到未知类型消息:', (message as any).type);
    }
  }

  private handleEditOperation(message: WsEditOperation): void {
    if (message.payload.userId === this.editorCore.getUserId()) {
      return;
    }

    if (message.version) {
      const cmp = compareVersions(message.version, this.currentVersion);
      if (cmp > 0) {
        this.updateVersion(message.version);
      } else if (cmp < 0) {
        console.warn(
          `[CollabSync] 收到旧版本操作: ${message.version}, 当前: ${this.currentVersion}, 忽略`
        );
        return;
      }
    }

    this.editorCore.updateContent(message.payload);
  }

  private handleCursorUpdate(message: WsCursorUpdate): void {
    if (message.payload.userId === this.editorCore.getUserId()) {
      return;
    }

    const userCursor: UserCursor = {
      userId: message.payload.userId,
      userName: message.payload.userName,
      color: message.payload.color,
      position: message.payload.position
    };

    const event = new CustomEvent('remote-cursor', { detail: userCursor });
    window.dispatchEvent(event);
  }

  private handleUserPresence(event: UserPresenceEvent): void {
    if (event.type === WsMessageType.USER_JOIN && event.version) {
      const cmp = compareVersions(event.version, this.currentVersion);
      if (cmp > 0) {
        this.updateVersion(event.version);
      }
    }
    this.notifyUserPresenceListeners(event);
  }

  private handleVersionUpdate(message: WsVersionUpdate): void {
    const cmp = compareVersions(message.version, this.currentVersion);
    if (cmp > 0) {
      this.updateVersion(message.version);
    } else if (cmp < 0) {
      console.warn(
        `[CollabSync] 收到旧版本更新: ${message.version}, 当前: ${this.currentVersion}`
      );
    }
  }

  private handleSyncResponse(message: WsSyncResponse): void {
    if (message.payload.content !== undefined) {
      this.editorCore.setFullContent(message.payload.content);
      this.notifySyncListeners(message.payload.content);
    }
    if (message.version) {
      this.updateVersion(message.version);
      this.confirmedVersion = message.version;
    }
    this.unacknowledgedOps.clear();

    message.payload.users.forEach(user => {
      if (user.userId !== this.editorCore.getUserId() && user.position) {
        const userCursor: UserCursor = {
          userId: user.userId,
          userName: user.userName,
          color: user.color,
          position: user.position
        };
        const event = new CustomEvent('remote-cursor', { detail: userCursor });
        window.dispatchEvent(event);
      }
    });
  }

  private handleAcknowledgment(message: WsAcknowledgment): void {
    const changeId = message.payload.changeId;
    const pending = this.unacknowledgedOps.get(changeId);

    if (pending) {
      this.unacknowledgedOps.delete(changeId);
    }

    if (message.version) {
      const cmp = compareVersions(message.version, this.confirmedVersion);
      if (cmp > 0) {
        this.confirmedVersion = message.version;
      }
      this.updateVersion(message.version);
    }
  }

  private startAckCheck(): void {
    this.ackCheckInterval = window.setInterval(() => {
      const now = Date.now();
      const toRetry: PendingOperation[] = [];

      this.unacknowledgedOps.forEach((op, changeId) => {
        if (now - op.sentAt > ACK_TIMEOUT_MS) {
          if (op.retryCount < MAX_RETRIES) {
            toRetry.push(op);
          } else {
            console.error(
              `[CollabSync] 操作 ${changeId} 超过最大重试次数, 丢弃`
            );
            this.unacknowledgedOps.delete(changeId);
          }
        }
      });

      toRetry.forEach(op => {
        this.unacknowledgedOps.delete(op.changeId);
        op.retryCount++;
        op.sentAt = Date.now();
        this.unacknowledgedOps.set(op.changeId, op);

        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(op.message));
          console.log(
            `[CollabSync] 重试操作 ${op.changeId}, 第 ${op.retryCount} 次`
          );
        }
      });
    }, 2000);
  }

  private stopAckCheck(): void {
    if (this.ackCheckInterval !== null) {
      clearInterval(this.ackCheckInterval);
      this.ackCheckInterval = null;
    }
  }

  private sendSyncRequest(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message: WsSyncRequest = {
      type: WsMessageType.SYNC_REQUEST,
      payload: {
        userId: this.editorCore.getUserId(),
        lastVersion: this.confirmedVersion
      },
      docId: this.docId
    };

    this.ws.send(JSON.stringify(message));
  }

  private sendEditOperation(change: DocChange): void {
    const message: WsEditOperation = {
      type: WsMessageType.EDIT_OPERATION,
      payload: change,
      version: this.currentVersion,
      docId: this.docId
    };

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));

      this.unacknowledgedOps.set(change.id, {
        changeId: change.id,
        message,
        sentAt: Date.now(),
        retryCount: 0
      });

      this.currentVersion = incrementVersion(this.currentVersion);
      this.notifyVersionChangeListeners(this.currentVersion);
    } else {
      this.pendingEditOperations.push(message);
    }
  }

  private throttleSendCursor(cursor: UserCursor): void {
    const now = Date.now();
    if (now - this.lastPositionSendTime < this.positionThrottleMs) {
      this.pendingCursorUpdates = this.pendingCursorUpdates.filter(
        p => p.payload.userId !== cursor.userId
      );
      this.pendingCursorUpdates.push(this.createCursorUpdateMessage(cursor));
      return;
    }

    this.lastPositionSendTime = now;
    this.sendCursorUpdate(cursor);
  }

  private createCursorUpdateMessage(cursor: UserCursor): WsCursorUpdate {
    return {
      type: WsMessageType.CURSOR_UPDATE,
      payload: {
        userId: cursor.userId,
        userName: cursor.userName,
        color: cursor.color,
        position: cursor.position
      },
      docId: this.docId,
      timestamp: Date.now()
    };
  }

  private sendCursorUpdate(cursor: UserCursor): void {
    if (cursor.position.pos === this.lastSentPosition) return;
    this.lastSentPosition = cursor.position.pos;

    const message = this.createCursorUpdateMessage(cursor);

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.pendingCursorUpdates.push(message);
    }
  }

  private startPositionFlush(): void {
    this.flushInterval = window.setInterval(() => {
      if (this.pendingCursorUpdates.length > 0 && this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        const latestPositions = new Map<string, WsCursorUpdate>();
        this.pendingCursorUpdates.forEach(p => latestPositions.set(p.payload.userId, p));
        latestPositions.forEach(p => this.ws?.send(JSON.stringify(p)));
        this.pendingCursorUpdates = [];
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
    while (this.pendingEditOperations.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const op = this.pendingEditOperations.shift();
      if (op) {
        this.ws.send(JSON.stringify(op));
        this.unacknowledgedOps.set(op.payload.id, {
          changeId: op.payload.id,
          message: op,
          sentAt: Date.now(),
          retryCount: 0
        });
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[CollabSync] 已达到最大重连次数');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    setTimeout(() => {
      console.log(`[CollabSync] 尝试重连... 第 ${this.reconnectAttempts} 次`);
      this.connect();
    }, delay);
  }

  disconnect(): void {
    this.stopPositionFlush();
    this.stopAckCheck();

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
    this.pendingEditOperations = [];
    this.pendingCursorUpdates = [];
    this.unacknowledgedOps.clear();
  }

  private updateVersion(newVersion: string): void {
    if (newVersion !== this.currentVersion) {
      const cmp = compareVersions(newVersion, this.currentVersion);
      if (cmp > 0) {
        this.currentVersion = newVersion;
        this.notifyVersionChangeListeners(this.currentVersion);
      }
    }
  }

  getVersion(): string {
    return this.currentVersion;
  }

  getConfirmedVersion(): string {
    return this.confirmedVersion;
  }

  getPendingOpCount(): number {
    return this.unacknowledgedOps.size;
  }

  getWebSocket(): WebSocket | null {
    return this.ws;
  }

  isWsConnected(): boolean {
    return this.isConnected;
  }

  getDocId(): string {
    return this.docId;
  }

  onVersionChange(listener: VersionChangeListener): () => void {
    this.versionChangeListeners.push(listener);
    listener(this.currentVersion);
    return () => {
      this.versionChangeListeners = this.versionChangeListeners.filter(l => l !== listener);
    };
  }

  onUserPresence(listener: UserPresenceListener): () => void {
    this.userPresenceListeners.push(listener);
    return () => {
      this.userPresenceListeners = this.userPresenceListeners.filter(l => l !== listener);
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

  private notifyVersionChangeListeners(version: string): void {
    this.versionChangeListeners.forEach(listener => listener(version));
  }

  private notifyUserPresenceListeners(event: UserPresenceEvent): void {
    this.userPresenceListeners.forEach(listener => listener(event));
  }

  private notifySyncListeners(content: string): void {
    this.syncListeners.forEach(listener => listener(content));
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(listener => listener(connected));
  }
}
