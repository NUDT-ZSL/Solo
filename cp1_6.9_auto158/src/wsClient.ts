import { OpPacket, WSMessage, WSMessageType, User } from './types';

type MessageHandler = (payload: any) => void;

const HEARTBEAT_INTERVAL = 15000;
const HEARTBEAT_TIMEOUT = 30000;
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT = 5;
const WS_URL = '/ws';

export class WSClient {
  private ws: WebSocket | null = null;
  private selfId = '';
  private selfUser: User | null = null;
  private reconnectAttempts = 0;
  private heartbeatTimer: any = null;
  private heartbeatCheckTimer: any = null;
  private lastPong = 0;
  private handlers = new Map<WSMessageType, Set<MessageHandler>>();
  private connectPromise: Promise<User> | null = null;

  constructor() {
    this.connect();
  }

  getSelfId() { return this.selfId; }
  getSelfUser() { return this.selfUser; }

  on(type: WSMessageType, handler: MessageHandler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  private emit(type: WSMessageType, payload: any) {
    this.handlers.get(type)?.forEach(h => { try { h(payload); } catch (e) { console.error(e); }});
  }

  private send(msg: WSMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendOp(op: OpPacket) {
    this.send({ type: 'op', payload: op });
  }

  sendCursor(x: number, y: number) {
    this.send({ type: 'cursor_move', payload: { x, y } });
  }

  recoverTo(snapshotId: string) {
    this.send({ type: 'recover_to', payload: { snapshotId } });
  }

  resolveConflict(nodeId: string, chosenUserId: string) {
    this.send({ type: 'conflict_resolve', payload: { nodeId, chosenUserId } });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.lastPong = Date.now();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping', payload: { t: Date.now() } });
    }, HEARTBEAT_INTERVAL);
    this.heartbeatCheckTimer = setInterval(() => {
      if (Date.now() - this.lastPong > HEARTBEAT_TIMEOUT) {
        console.warn('[ws] heartbeat timeout, reconnecting...');
        this.ws?.close();
      }
    }, HEARTBEAT_TIMEOUT / 2);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    if (this.heartbeatCheckTimer) { clearInterval(this.heartbeatCheckTimer); this.heartbeatCheckTimer = null; }
  }

  connect(): Promise<User> {
    if (this.connectPromise) return this.connectPromise;
    this.connectPromise = new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}${WS_URL}`;
      try { this.ws = new WebSocket(url); } catch (e) { reject(e); return; }
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.send({ type: 'hello', payload: {} });
      };
      const onUserJoined = (payload: any) => {
        this.selfId = payload.self.id;
        this.selfUser = payload.self;
        this.startHeartbeat();
        resolve(payload.self);
        this.offTemp();
      };
      const offHandlers: Function[] = [];
      const offTemp = () => offHandlers.forEach(fn => fn());
      (this as any).offTemp = offTemp;
      offHandlers.push(this.on('user_joined', onUserJoined));
      this.ws.onmessage = (ev) => {
        let msg: WSMessage;
        try { msg = JSON.parse(ev.data); } catch { return; }
        if (msg.type === 'pong') { this.lastPong = Date.now(); return; }
        if (msg.type === 'ping') { this.send({ type: 'pong', payload: { t: Date.now() } }); return; }
        this.emit(msg.type, msg.payload);
      };
      this.ws.onclose = () => {
        this.stopHeartbeat();
        offTemp();
        this.connectPromise = null;
        if (this.reconnectAttempts < MAX_RECONNECT) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), RECONNECT_DELAY);
        }
      };
      this.ws.onerror = () => { reject(new Error('ws error')); };
    });
    return this.connectPromise;
  }
}
