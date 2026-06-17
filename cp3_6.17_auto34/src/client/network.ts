import { PlayerAction, ServerMessage, GameState, NetworkStats } from '../types';

class NetworkClient {
  private ws: WebSocket | null = null;
  private actionQueue: PlayerAction[] = [];
  private readonly maxQueueSize = 10;
  private sequence = 0;
  private pendingActions: Map<number, PlayerAction> = new Map();
  private latencySamples: number[] = [];
  private rollbackCount = 0;
  private totalActions = 0;
  private confirmedActions = 0;

  onStateUpdate: ((state: GameState) => void) | null = null;
  onRollback: ((action: PlayerAction, reason: string) => void) | null = null;
  onStatsUpdate: ((stats: NetworkStats) => void) | null = null;

  connect(url: string): void {
    this.ws = new WebSocket(url);
    this.ws.onopen = () => console.log('Connected');
    this.ws.onmessage = (event) => this.handleMessage(JSON.parse(event.data));
    this.ws.onclose = () => console.log('Disconnected');
    this.ws.onerror = (error) => console.error('WebSocket error:', error);
  }

  sendAction(action: Omit<PlayerAction, 'sequence' | 'timestamp'>): void {
    const fullAction: PlayerAction = {
      ...action,
      sequence: this.sequence++,
      timestamp: Date.now(),
    };

    if (this.actionQueue.length >= this.maxQueueSize) {
      this.actionQueue.shift();
    }
    this.actionQueue.push(fullAction);
    this.pendingActions.set(fullAction.sequence, fullAction);
    this.totalActions++;

    const latency = 100 + Math.random() * 200;
    setTimeout(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(fullAction));
      }
    }, latency);

    this.updateStats();
  }

  private handleMessage(message: ServerMessage): void {
    const latency = Date.now() - (message.action?.timestamp || 0);
    if (latency > 0) {
      this.latencySamples.push(latency);
      if (this.latencySamples.length > 50) {
        this.latencySamples.shift();
      }
    }

    if (message.type === 'confirm' && message.action) {
      this.pendingActions.delete(message.sequence);
      this.confirmedActions++;
    } else if (message.type === 'rollback' && message.action) {
      this.rollbackCount++;
      this.pendingActions.delete(message.sequence);
      if (this.onRollback) {
        this.onRollback(message.action, message.rollbackReason || 'Unknown');
      }
    } else if (message.type === 'state' && message.state) {
      if (this.onStateUpdate) {
        this.onStateUpdate(message.state);
      }
    }

    this.updateStats();
  }

  private updateStats(): void {
    const avgLatency = this.latencySamples.length
      ? this.latencySamples.reduce((a, b) => a + b, 0) / this.latencySamples.length
      : 0;
    const successRate = this.totalActions
      ? this.confirmedActions / this.totalActions
      : 1;

    if (this.onStatsUpdate) {
      this.onStatsUpdate({
        avgLatency,
        rollbackCount: this.rollbackCount,
        totalActions: this.totalActions,
        successRate,
      });
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.actionQueue = [];
    this.pendingActions.clear();
  }
}

export const networkClient = new NetworkClient();
