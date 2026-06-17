import { GameAction, ServerMessage, GameStats } from '../shared/types';

type ActionCallback = (action: GameAction) => void;
type StateCallback = (state: any) => void;
type RollbackCallback = (sequence: number, reason: string) => void;
type AckCallback = (sequence: number) => void;

export class NetworkManager {
  private ws: WebSocket | null = null;
  private actionQueue: GameAction[] = [];
  private maxQueueSize = 10;
  private sequenceCounter = 0;
  private pendingActions: Map<number, GameAction> = new Map();
  
  private simulatedLatency = 150;
  private minLatency = 100;
  private maxLatency = 300;
  
  private onActionAck: AckCallback | null = null;
  private onActionRollback: RollbackCallback | null = null;
  private onStateUpdate: StateCallback | null = null;
  private onGameStart: StateCallback | null = null;
  private onGameOver: ((winner: string) => void) | null = null;
  
  private stats: GameStats = {
    totalLatency: 0,
    latencySamples: 0,
    rollbackCount: 0,
    totalPlays: 0,
    successfulPlays: 0,
  };
  
  private playerId: string = 'player_' + Math.random().toString(36).substr(2, 9);
  private latencyUpdateCallback: ((latency: number, queueSize: number) => void) | null = null;
  
  constructor() {
    this.updateLatency();
  }
  
  getPlayerId(): string {
    return this.playerId;
  }
  
  getStats(): GameStats {
    return { ...this.stats };
  }
  
  resetStats(): void {
    this.stats = {
      totalLatency: 0,
      latencySamples: 0,
      rollbackCount: 0,
      totalPlays: 0,
      successfulPlays: 0,
    };
  }
  
  getSimulatedLatency(): number {
    return this.simulatedLatency;
  }
  
  getQueueSize(): number {
    return this.actionQueue.length;
  }
  
  setLatencyUpdateCallback(callback: (latency: number, queueSize: number) => void): void {
    this.latencyUpdateCallback = callback;
  }
  
  setOnActionAck(callback: AckCallback): void {
    this.onActionAck = callback;
  }
  
  setOnActionRollback(callback: RollbackCallback): void {
    this.onActionRollback = callback;
  }
  
  setOnStateUpdate(callback: StateCallback): void {
    this.onStateUpdate = callback;
  }
  
  setOnGameStart(callback: StateCallback): void {
    this.onGameStart = callback;
  }
  
  setOnGameOver(callback: (winner: string) => void): void {
    this.onGameOver = callback;
  }
  
  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
        
        this.ws.onopen = () => {
          console.log('[Network] WebSocket connected');
          this.sendJoinMessage();
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          const message: ServerMessage = JSON.parse(event.data);
          this.handleServerMessage(message);
        };
        
        this.ws.onerror = (error) => {
          console.error('[Network] WebSocket error:', error);
          reject(error);
        };
        
        this.ws.onclose = () => {
          console.log('[Network] WebSocket closed');
        };
      } catch (error) {
        reject(error);
      }
    });
  }
  
  private sendJoinMessage(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'join',
        playerId: this.playerId,
        playerName: '玩家',
      }));
    }
  }
  
  sendAction(actionType: string, data?: any): number {
    const sequence = ++this.sequenceCounter;
    const action: GameAction = {
      type: actionType as any,
      playerId: this.playerId,
      sequence,
      timestamp: Date.now(),
      ...data,
    };
    
    if (this.actionQueue.length >= this.maxQueueSize) {
      console.warn('[Network] Queue is full, dropping oldest action');
      this.actionQueue.shift();
    }
    
    this.actionQueue.push(action);
    this.pendingActions.set(sequence, action);
    
    if (actionType === 'play_card') {
      this.stats.totalPlays++;
    }
    
    this.updateLatencyDisplay();
    
    this.sendWithDelay(action);
    
    return sequence;
  }
  
  private sendWithDelay(action: GameAction): void {
    const latency = this.getRandomLatency();
    this.simulatedLatency = latency;
    this.stats.totalLatency += latency;
    this.stats.latencySamples++;
    
    this.updateLatencyDisplay();
    
    setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(action));
      }
    }, latency);
  }
  
  private handleServerMessage(message: ServerMessage): void {
    const serverLatency = this.getRandomLatency();
    
    setTimeout(() => {
      this.processServerMessage(message);
    }, serverLatency);
  }
  
  private processServerMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'ack':
        this.handleAck(message.sequence!);
        break;
      case 'rollback':
        this.handleRollback(message.sequence!, message.reason || '');
        break;
      case 'state_update':
        if (this.onStateUpdate && message.state) {
          this.onStateUpdate(message.state);
        }
        break;
      case 'game_start':
        if (this.onGameStart && message.state) {
          this.onGameStart(message.state);
        }
        break;
      case 'game_over':
        if (this.onGameOver && message.winner) {
          this.onGameOver(message.winner);
        }
        break;
    }
  }
  
  private handleAck(sequence: number): void {
    const action = this.pendingActions.get(sequence);
    if (action) {
      this.pendingActions.delete(sequence);
      
      const queueIndex = this.actionQueue.findIndex(a => a.sequence === sequence);
      if (queueIndex !== -1) {
        this.actionQueue.splice(queueIndex, 1);
      }
      
      if (action.type === 'play_card') {
        this.stats.successfulPlays++;
      }
      
      if (this.onActionAck) {
        this.onActionAck(sequence);
      }
      
      this.updateLatencyDisplay();
    }
  }
  
  private handleRollback(sequence: number, reason: string): void {
    const action = this.pendingActions.get(sequence);
    if (action) {
      this.pendingActions.delete(sequence);
      
      const queueIndex = this.actionQueue.findIndex(a => a.sequence === sequence);
      if (queueIndex !== -1) {
        this.actionQueue.splice(queueIndex, 1);
      }
      
      this.stats.rollbackCount++;
      
      if (this.onActionRollback) {
        this.onActionRollback(sequence, reason);
      }
      
      this.updateLatencyDisplay();
    }
  }
  
  private updateLatency(): void {
    setInterval(() => {
      this.simulatedLatency = this.getRandomLatency();
      this.updateLatencyDisplay();
    }, 2000);
  }
  
  private getRandomLatency(): number {
    return Math.floor(Math.random() * (this.maxLatency - this.minLatency + 1)) + this.minLatency;
  }
  
  private updateLatencyDisplay(): void {
    if (this.latencyUpdateCallback) {
      this.latencyUpdateCallback(this.simulatedLatency, this.actionQueue.length);
    }
  }
  
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
