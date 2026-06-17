import { ClientAction, ServerMessage, GameStateData, GameStats } from '../shared/types';

export type NetworkCallback = {
  onStateUpdate: (state: GameStateData) => void;
  onAck: (sequence: number, state: GameStateData) => void;
  onRollback: (sequence: number, state: GameStateData, reason?: string) => void;
  onGameOver: (state: GameStateData, stats: GameStats) => void;
  onQueueChange: (queueSize: number) => void;
  onLatencyChange: (latency: number) => void;
};

type PendingAction = {
  action: ClientAction;
  sentAt: number;
  simulatedDelay: number;
};

export class NetworkManager {
  private ws: WebSocket | null = null;
  private sequence = 0;
  private pendingQueue: PendingAction[] = [];
  private readonly MAX_QUEUE = 10;
  private callbacks: NetworkCallback;
  private currentLatency = 150;
  private latencyHistory: number[] = [];
  private rollbackCount = 0;
  private validPlays = 0;
  private totalPlays = 0;

  constructor(callbacks: NetworkCallback) {
    this.callbacks = callbacks;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let host = window.location.host;
      if (!host || host.startsWith('file') || window.location.port === '' || window.location.protocol === 'file:') {
        host = 'localhost:3001';
      }
      const wsUrl = `${protocol}//${host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);

      this.ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (err) {
          console.error('Failed to parse server message:', err);
        }
      };
    });
  }

  private handleServerMessage(msg: ServerMessage) {
    if (msg.sequence !== undefined) {
      const pending = this.pendingQueue.find(p => p.action.sequence === msg.sequence);
      if (pending) {
        const actualLatency = Date.now() - pending.sentAt;
        this.recordLatency(actualLatency);
        this.pendingQueue = this.pendingQueue.filter(p => p.action.sequence !== msg.sequence);
        this.callbacks.onQueueChange(this.pendingQueue.length);
      }
    }

    switch (msg.type) {
      case 'STATE_UPDATE':
        if (msg.state) this.callbacks.onStateUpdate(msg.state);
        break;
      case 'ACK':
        if (msg.sequence !== undefined && msg.state) {
          this.validPlays++;
          this.totalPlays++;
          this.callbacks.onAck(msg.sequence, msg.state);
        }
        break;
      case 'ROLLBACK':
        if (msg.sequence !== undefined && msg.state) {
          this.rollbackCount++;
          this.totalPlays++;
          this.callbacks.onRollback(msg.sequence, msg.state, msg.reason);
        }
        break;
      case 'GAME_OVER':
        if (msg.state) {
          const stats: GameStats = {
            avgLatency: this.getAverageLatency(),
            rollbackCount: this.rollbackCount,
            validPlays: this.validPlays,
            totalPlays: this.totalPlays,
          };
          this.callbacks.onGameOver(msg.state, stats);
        }
        break;
    }
  }

  private recordLatency(latency: number) {
    this.latencyHistory.push(latency);
    if (this.latencyHistory.length > 50) {
      this.latencyHistory.shift();
    }
    this.currentLatency = this.getAverageLatency();
    this.callbacks.onLatencyChange(this.currentLatency);
  }

  getAverageLatency(): number {
    if (this.latencyHistory.length === 0) return 0;
    return Math.round(
      this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length
    );
  }

  getCurrentLatency(): number {
    return this.currentLatency;
  }

  getRollbackCount(): number {
    return this.rollbackCount;
  }

  sendPlayCard(playerId: string, cardId: string): number {
    this.sequence++;
    const action: ClientAction = {
      type: 'PLAY_CARD',
      playerId,
      cardId,
      sequence: this.sequence,
      timestamp: Date.now(),
    };

    if (this.pendingQueue.length >= this.MAX_QUEUE) {
      this.pendingQueue.shift();
    }

    const simulatedDelay = 100 + Math.random() * 200;
    this.pendingQueue.push({
      action,
      sentAt: Date.now(),
      simulatedDelay,
    });
    this.callbacks.onQueueChange(this.pendingQueue.length);

    if (this.ws && this.ws.readyState === 1) {
      setTimeout(() => {
        if (this.ws && this.ws.readyState === 1) {
          this.ws.send(JSON.stringify(action));
        }
      }, simulatedDelay);
    }

    return this.sequence;
  }

  getQueueSize(): number {
    return this.pendingQueue.length;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
