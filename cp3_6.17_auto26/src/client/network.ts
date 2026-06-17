export interface Card {
  id: string;
  name: string;
  attack: number;
  cost: number;
}

export interface PlayerState {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  hand: Card[];
}

export interface GameState {
  players: Record<string, PlayerState>;
  currentTurn: string;
  turnCount: number;
  discardPile: Card[];
  gameOver: boolean;
  winner: string | null;
}

export interface GameAction {
  type: 'PLAY_CARD';
  playerId: string;
  cardId: string;
  sequence: number;
  timestamp: number;
}

export interface ServerMessage {
  type: 'STATE_SYNC' | 'ACTION_ACK' | 'ACTION_ROLLBACK' | 'AI_ACTION' | 'GAME_OVER';
  sequence?: number;
  state?: GameState;
  action?: GameAction;
  winner?: string;
}

export interface NetworkStats {
  avgLatency: number;
  rollbackCount: number;
  validActions: number;
  totalActions: number;
}

type ActionCallback = (action: GameAction) => void;
type StateCallback = (state: GameState) => void;
type RollbackCallback = (sequence: number) => void;

export class NetworkClient {
  private ws: WebSocket | null = null;
  private sequenceCounter: number = 0;
  private pendingQueue: GameAction[] = [];
  private readonly MAX_QUEUE_SIZE: number = 10;
  private simulatedLatency: number = 150;
  private latencyHistory: number[] = [];
  private rollbackCount: number = 0;
  private validActions: number = 0;
  private totalActions: number = 0;
  private playerId: string;

  private onActionAck: ActionCallback | null = null;
  private onStateSync: StateCallback | null = null;
  private onRollback: RollbackCallback | null = null;
  private onGameOver: ((winner: string) => void) | null = null;
  private onConnect: (() => void) | null = null;

  constructor(playerId: string) {
    this.playerId = playerId;
  }

  setCallbacks(
    onActionAck: ActionCallback,
    onStateSync: StateCallback,
    onRollback: RollbackCallback,
    onGameOver: (winner: string) => void,
    onConnect: () => void
  ): void {
    this.onActionAck = onActionAck;
    this.onStateSync = onStateSync;
    this.onRollback = onRollback;
    this.onGameOver = onGameOver;
    this.onConnect = onConnect;
  }

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('[Network] WebSocket connected');
          if (this.onConnect) this.onConnect();
          resolve();
        };

        this.ws.onmessage = (event) => {
          const sentAt = Date.now();
          this.simulateLatency(() => {
            const latency = Date.now() - sentAt + this.simulatedLatency;
            this.recordLatency(latency);

            try {
              const message: ServerMessage = JSON.parse(event.data);
              this.handleMessage(message);
            } catch (e) {
              console.error('[Network] Parse error:', e);
            }
          });
        };

        this.ws.onerror = (error) => {
          console.error('[Network] WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[Network] WebSocket disconnected');
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  private simulateLatency(callback: () => void): void {
    const jitter = Math.random() * 100 - 50;
    const delay = Math.max(100, Math.min(300, this.simulatedLatency + jitter));
    this.simulatedLatency = 100 + Math.random() * 200;
    setTimeout(callback, delay);
  }

  private recordLatency(latency: number): void {
    this.latencyHistory.push(latency);
    if (this.latencyHistory.length > 50) {
      this.latencyHistory.shift();
    }
  }

  getCurrentLatency(): number {
    if (this.latencyHistory.length === 0) return 0;
    return Math.round(this.simulatedLatency);
  }

  getQueueSize(): number {
    return this.pendingQueue.length;
  }

  getStats(): NetworkStats {
    const avgLatency = this.latencyHistory.length > 0
      ? Math.round(this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length)
      : 0;
    const validRate = this.totalActions > 0
      ? Math.round((this.validActions / this.totalActions) * 100)
      : 0;
    return {
      avgLatency,
      rollbackCount: this.rollbackCount,
      validActions: this.validActions,
      totalActions: this.totalActions,
    };
  }

  sendAction(action: Omit<GameAction, 'sequence' | 'timestamp'>): GameAction | null {
    if (this.pendingQueue.length >= this.MAX_QUEUE_SIZE) {
      console.warn('[Network] Queue full, dropping action');
      return null;
    }

    const fullAction: GameAction = {
      ...action,
      sequence: ++this.sequenceCounter,
      timestamp: Date.now(),
    };

    this.pendingQueue.push(fullAction);
    this.totalActions++;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.simulateLatency(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(fullAction));
        }
      });
    }

    return fullAction;
  }

  private handleMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'STATE_SYNC':
        if (message.state && this.onStateSync) {
          this.onStateSync(message.state);
        }
        break;

      case 'ACTION_ACK':
        if (message.sequence !== undefined) {
          this.removeFromQueue(message.sequence);
          this.validActions++;
          if (this.onActionAck && message.action) {
            this.onActionAck(message.action);
          }
        }
        break;

      case 'ACTION_ROLLBACK':
        if (message.sequence !== undefined) {
          this.removeFromQueue(message.sequence);
          this.rollbackCount++;
          if (this.onRollback) {
            this.onRollback(message.sequence);
          }
        }
        break;

      case 'AI_ACTION':
        if (message.state && this.onStateSync) {
          this.onStateSync(message.state);
        }
        break;

      case 'GAME_OVER':
        if (message.winner && this.onGameOver) {
          this.onGameOver(message.winner);
        }
        break;
    }
  }

  private removeFromQueue(sequence: number): void {
    const idx = this.pendingQueue.findIndex(a => a.sequence === sequence);
    if (idx !== -1) {
      this.pendingQueue.splice(idx, 1);
    }
  }

  getPendingActions(): GameAction[] {
    return [...this.pendingQueue];
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
