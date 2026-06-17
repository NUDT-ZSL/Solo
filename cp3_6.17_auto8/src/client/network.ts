import type { GameAction, PendingAction, GameStats } from '../shared/types';

type OnAckCallback = (sequence: number, state: any) => void;
type OnRollbackCallback = (sequence: number, reason: string) => void;
type OnStateSyncCallback = (state: any) => void;
type OnGameOverCallback = (winner: string) => void;
type OnQueueChangeCallback = (count: number) => void;
type OnLatencyChangeCallback = (latency: number) => void;

export class NetworkManager {
  private ws: WebSocket | null = null;
  private sequenceCounter = 0;
  private pendingActions: Map<number, PendingAction> = new Map();
  private maxQueueSize = 10;
  private playerId: string;

  private onAck: OnAckCallback[] = [];
  private onRollback: OnRollbackCallback[] = [];
  private onStateSync: OnStateSyncCallback[] = [];
  private onGameOver: OnGameOverCallback[] = [];
  private onQueueChange: OnQueueChangeCallback[] = [];
  private onLatencyChange: OnLatencyChangeCallback[] = [];

  private stats: GameStats = {
    totalPlays: 0,
    rollbackCount: 0,
    totalLatency: 0,
    latencySamples: 0,
  };

  private simulatedLatency = 150;
  private latencyTimer: number | null = null;

  constructor(playerId: string) {
    this.playerId = playerId;
    this.startLatencySimulation();
  }

  private startLatencySimulation(): void {
    this.latencyTimer = window.setInterval(() => {
      this.simulatedLatency = 100 + Math.floor(Math.random() * 200);
      this.onLatencyChange.forEach((cb) => cb(this.simulatedLatency));
    }, 3000);
  }

  public on(callbacks: {
    onAck?: OnAckCallback;
    onRollback?: OnRollbackCallback;
    onStateSync?: OnStateSyncCallback;
    onGameOver?: OnGameOverCallback;
    onQueueChange?: OnQueueChangeCallback;
    onLatencyChange?: OnLatencyChangeCallback;
  }): void {
    if (callbacks.onAck) this.onAck.push(callbacks.onAck);
    if (callbacks.onRollback) this.onRollback.push(callbacks.onRollback);
    if (callbacks.onStateSync) this.onStateSync.push(callbacks.onStateSync);
    if (callbacks.onGameOver) this.onGameOver.push(callbacks.onGameOver);
    if (callbacks.onQueueChange) this.onQueueChange.push(callbacks.onQueueChange);
    if (callbacks.onLatencyChange) this.onLatencyChange.push(callbacks.onLatencyChange);
  }

  public connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = url.startsWith('ws') ? url : `ws://${url}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.sendHello();
          resolve();
        };

        this.ws.onerror = (err) => {
          reject(err);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private sendHello(): void {
    const action: GameAction = {
      type: 'HELLO',
      sequence: this.sequenceCounter++,
      playerId: this.playerId,
      timestamp: Date.now(),
    };
    this.ws?.send(JSON.stringify(action));
  }

  public sendPlayCard(cardId: string, snapshot: { card: any; hand: any[] }): number {
    if (this.pendingActions.size >= this.maxQueueSize) {
      console.warn('Queue full, dropping action');
      return -1;
    }

    const sequence = this.sequenceCounter++;
    const action: GameAction = {
      type: 'PLAY_CARD',
      sequence,
      playerId: this.playerId,
      timestamp: Date.now(),
      payload: { cardId },
    };

    const pending: PendingAction = {
      action,
      cardSnapshot: snapshot.card,
      handSnapshot: snapshot.hand,
      sentAt: Date.now(),
      resolved: false,
    };

    this.pendingActions.set(sequence, pending);
    this.notifyQueueChange();

    setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(action));
      }
    }, this.simulatedLatency);

    this.stats.totalPlays++;

    return sequence;
  }

  public sendAIAction(cardId: string): number {
    if (this.pendingActions.size >= this.maxQueueSize) {
      return -1;
    }

    const sequence = this.sequenceCounter++;
    const action: GameAction = {
      type: 'PLAY_CARD',
      sequence,
      playerId: 'ai-player',
      timestamp: Date.now(),
      payload: { cardId },
    };

    const pending: PendingAction = {
      action,
      sentAt: Date.now(),
      resolved: false,
    };

    this.pendingActions.set(sequence, pending);
    this.notifyQueueChange();

    setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(action));
      }
    }, this.simulatedLatency);

    return sequence;
  }

  private handleMessage(data: string): void {
    try {
      const action: GameAction = JSON.parse(data);

      switch (action.type) {
        case 'ACK':
          this.handleAck(action);
          break;
        case 'ROLLBACK':
          this.handleRollback(action);
          break;
        case 'SYNC_STATE':
          this.handleStateSync(action);
          break;
        case 'GAME_OVER':
          this.handleGameOver(action);
          break;
      }
    } catch (err) {
      console.error('Failed to parse message:', err);
    }
  }

  private handleAck(action: GameAction): void {
    const pending = this.pendingActions.get(action.sequence);
    if (pending) {
      const latency = Date.now() - pending.sentAt;
      this.stats.totalLatency += latency;
      this.stats.latencySamples++;
      pending.resolved = true;
      this.pendingActions.delete(action.sequence);
      this.notifyQueueChange();
      this.onAck.forEach((cb) => cb(action.sequence, action.payload?.state));
    }
  }

  private handleRollback(action: GameAction): void {
    const pending = this.pendingActions.get(action.sequence);
    if (pending) {
      pending.resolved = true;
      this.pendingActions.delete(action.sequence);
      this.stats.rollbackCount++;
      this.notifyQueueChange();
      this.onRollback.forEach((cb) => cb(action.sequence, action.payload?.reason || 'Unknown reason'));
    }
  }

  private handleStateSync(action: GameAction): void {
    if (action.payload?.state) {
      this.onStateSync.forEach((cb) => cb(action.payload!.state));
    }
  }

  private handleGameOver(action: GameAction): void {
    if (action.payload?.state?.winner) {
      this.onGameOver.forEach((cb) => cb(action.payload!.state!.winner!));
    }
  }

  private notifyQueueChange(): void {
    this.onQueueChange.forEach((cb) => cb(this.pendingActions.size));
  }

  public getPendingSnapshot(sequence: number): PendingAction | undefined {
    return this.pendingActions.get(sequence);
  }

  public getStats(): GameStats {
    return { ...this.stats };
  }

  public getCurrentLatency(): number {
    return this.simulatedLatency;
  }

  public getQueueSize(): number {
    return this.pendingActions.size;
  }

  public resetStats(): void {
    this.stats = {
      totalPlays: 0,
      rollbackCount: 0,
      totalLatency: 0,
      latencySamples: 0,
    };
    this.pendingActions.clear();
    this.sequenceCounter = 0;
    this.notifyQueueChange();
  }

  public disconnect(): void {
    if (this.latencyTimer) {
      clearInterval(this.latencyTimer);
      this.latencyTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }
}
