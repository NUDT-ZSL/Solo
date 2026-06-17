import {
  PlayerAction,
  PlayerActionType,
  ServerMessage,
  ServerAck,
  GameStateUpdate,
  StatsUpdate,
  GameState,
  Card,
} from '../shared/types';

export interface QueuedAction {
  action: PlayerAction;
  card: Card;
  sentAt: number;
  originalHandIndex: number;
}

export type ACKHandler = (ack: ServerAck, card: Card, originalIndex: number) => void;
export type StateHandler = (update: GameStateUpdate) => void;
export type StatsHandler = (stats: StatsUpdate) => void;
export type ConnectHandler = () => void;

export class NetworkManager {
  private ws: WebSocket | null = null;
  private sequenceCounter: number = 0;
  private pendingQueue: QueuedAction[] = [];
  private maxQueueSize: number = 10;

  private onACK: ACKHandler;
  private onStateUpdate: StateHandler;
  private onStatsUpdate: StatsHandler;
  private onConnect: ConnectHandler;

  private stats: StatsUpdate = {
    type: 'stats',
    avgLatency: 0,
    rollbackCount: 0,
    effectivePlayRate: 100,
    currentLatency: 200,
    queueSize: 0,
  };

  constructor(handlers: {
    onACK: ACKHandler;
    onStateUpdate: StateHandler;
    onStatsUpdate: StatsHandler;
    onConnect: ConnectHandler;
  }) {
    this.onACK = handlers.onACK;
    this.onStateUpdate = handlers.onStateUpdate;
    this.onStatsUpdate = handlers.onStatsUpdate;
    this.onConnect = handlers.onConnect;
  }

  public connect(): void {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port || '3000';
    const url = `${proto}//${host}:${port}/ws`;

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.ws = new WebSocket(`ws://localhost:3001/ws`);
    }

    this.ws.onopen = () => {
      console.log('WebSocket 已连接');
      this.onConnect();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        this.handleServerMessage(msg);
      } catch (e) {
        console.error('解析服务器消息失败:', e);
      }
    };

    this.ws.onclose = () => {
      console.warn('WebSocket 断开，5秒后重连...');
      setTimeout(() => this.connect(), 5000);
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket 错误:', err);
    };
  }

  private handleServerMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case 'ack':
      case 'rollback':
        this.handleACK(msg);
        break;
      case 'state_update':
        this.onStateUpdate(msg as GameStateUpdate);
        break;
      case 'stats':
        this.stats = msg as StatsUpdate;
        this.stats.queueSize = this.pendingQueue.length;
        this.onStatsUpdate(this.stats);
        break;
    }
  }

  private handleACK(ack: ServerAck): void {
    const idx = this.pendingQueue.findIndex(
      (q) => q.action.sequence === ack.sequence
    );

    if (idx === -1) {
      return;
    }

    const queued = this.pendingQueue[idx];
    this.pendingQueue.splice(idx, 1);

    this.onACK(ack, queued.card, queued.originalHandIndex);

    this.stats.queueSize = this.pendingQueue.length;
    this.onStatsUpdate(this.stats);
  }

  public sendAction(
    type: PlayerActionType,
    playerId: string,
    card: Card,
    originalHandIndex: number
  ): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket 未连接');
      return false;
    }

    if (this.pendingQueue.length >= this.maxQueueSize) {
      console.warn('操作队列已满');
      return false;
    }

    const action: PlayerAction = {
      type,
      playerId,
      cardId: card.id,
      sequence: this.sequenceCounter++,
      timestamp: Date.now(),
    };

    this.pendingQueue.push({
      action,
      card,
      sentAt: Date.now(),
      originalHandIndex,
    });

    this.ws.send(JSON.stringify(action));

    this.stats.queueSize = this.pendingQueue.length;
    this.onStatsUpdate(this.stats);

    return true;
  }

  public getPendingQueue(): QueuedAction[] {
    return [...this.pendingQueue];
  }

  public getStats(): StatsUpdate {
    return { ...this.stats, queueSize: this.pendingQueue.length };
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
