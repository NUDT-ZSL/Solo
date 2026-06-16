import { ClientMessage, ServerMessage, GameState, QueuedOperation, NetworkStats } from '../shared/types';

export type OnStateUpdate = (state: GameState) => void;
export type OnAck = (sequence: number, status: 'success' | 'rollback', reason?: string) => void;
export type OnStatsUpdate = (stats: NetworkStats) => void;
export type OnGameOver = (winner: string, stats: any) => void;

export class NetworkManager {
  private ws: WebSocket | null = null;
  private sequenceCounter: number = 0;
  private operationQueue: QueuedOperation[] = [];
  private readonly MAX_QUEUE_SIZE = 10;
  private onStateUpdateCallback: OnStateUpdate | null = null;
  private onAckCallback: OnAck | null = null;
  private onStatsUpdateCallback: OnStatsUpdate | null = null;
  private onGameOverCallback: OnGameOver | null = null;
  
  private stats: NetworkStats = {
    currentLatency: 0,
    queueSize: 0,
    avgLatency: 0,
    rollbackCount: 0,
    totalPlays: 0,
    validPlays: 0
  };
  private latencyHistory: number[] = [];
  private pendingTimestamps: Map<number, number> = new Map();

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('Connected to server');
        this.startLatencySimulation();
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onmessage = (event) => {
        const message: ServerMessage = JSON.parse(event.data);
        this.handleServerMessage(message);
      };

      this.ws.onclose = () => {
        console.log('Disconnected from server');
      };
    });
  }

  private startLatencySimulation(): void {
    setInterval(() => {
      this.stats.currentLatency = Math.floor(Math.random() * 200) + 100;
      this.stats.queueSize = this.operationQueue.length;
      this.emitStats();
    }, 500);
  }

  private handleServerMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'ACK':
        this.handleAck(message.sequence, message.status, message.reason);
        break;
      case 'STATE_UPDATE':
        if (this.onStateUpdateCallback) {
          this.onStateUpdateCallback(message.gameState);
        }
        break;
      case 'GAME_OVER':
        if (this.onGameOverCallback) {
          this.onGameOverCallback(message.winner, message.stats);
        }
        break;
    }
  }

  private handleAck(sequence: number, status: 'success' | 'rollback', reason?: string): void {
    const sendTime = this.pendingTimestamps.get(sequence);
    if (sendTime) {
      const latency = Date.now() - sendTime;
      this.latencyHistory.push(latency);
      if (this.latencyHistory.length > 50) {
        this.latencyHistory.shift();
      }
      this.stats.avgLatency = this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;
      this.pendingTimestamps.delete(sequence);
    }

    this.stats.totalPlays++;
    if (status === 'success') {
      this.stats.validPlays++;
    } else {
      this.stats.rollbackCount++;
    }
    this.emitStats();

    this.operationQueue = this.operationQueue.filter(op => op.sequence !== sequence);
    this.stats.queueSize = this.operationQueue.length;

    if (this.onAckCallback) {
      this.onAckCallback(sequence, status, reason);
    }
  }

  sendPlayCard(playerId: string, cardId: string, originalIndex: number): number | null {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return null;
    }

    if (this.operationQueue.length >= this.MAX_QUEUE_SIZE) {
      console.warn('Operation queue full, dropping request');
      return null;
    }

    const sequence = this.sequenceCounter++;
    const timestamp = Date.now();

    const message: ClientMessage = {
      type: 'PLAY_CARD',
      sequence,
      timestamp,
      playerId,
      cardId
    };

    this.operationQueue.push({
      sequence,
      timestamp,
      playerId,
      cardId,
      originalIndex,
      type: 'local'
    });

    this.pendingTimestamps.set(sequence, timestamp);
    this.stats.queueSize = this.operationQueue.length;
    this.emitStats();

    const simulatedDelay = Math.floor(Math.random() * 200) + 100;
    setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      }
    }, simulatedDelay);

    return sequence;
  }

  sendAIPlay(playerId: string, cardId: string): number | null {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return null;
    }

    const sequence = this.sequenceCounter++;
    const timestamp = Date.now();

    const message: ClientMessage = {
      type: 'AI_PLAY',
      sequence,
      timestamp,
      playerId,
      cardId
    };

    const simulatedDelay = Math.floor(Math.random() * 200) + 100;
    setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      }
    }, simulatedDelay);

    return sequence;
  }

  onStateUpdate(callback: OnStateUpdate): void {
    this.onStateUpdateCallback = callback;
  }

  onAck(callback: OnAck): void {
    this.onAckCallback = callback;
  }

  onStatsUpdate(callback: OnStatsUpdate): void {
    this.onStatsUpdateCallback = callback;
  }

  onGameOver(callback: OnGameOver): void {
    this.onGameOverCallback = callback;
  }

  private emitStats(): void {
    if (this.onStatsUpdateCallback) {
      this.onStatsUpdateCallback({ ...this.stats });
    }
  }

  getOperationQueue(): QueuedOperation[] {
    return [...this.operationQueue];
  }

  getStats(): NetworkStats {
    return { ...this.stats };
  }

  getValidPlayRate(): number {
    if (this.stats.totalPlays === 0) return 1;
    return this.stats.validPlays / this.stats.totalPlays;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
