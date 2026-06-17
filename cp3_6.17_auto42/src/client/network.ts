export interface Card {
  id: string;
  value: number;
  suit: string;
  attack: number;
}

export interface GameState {
  gameId: string;
  currentTurn: 'player' | 'ai';
  turnCount: number;
  isGameOver: boolean;
  winner: string | null;
  lastPlayedCard: Card | null;
  discardPileSize: number;
  yourHealth: number;
  yourMaxHealth: number;
  yourHand: Card[];
  opponentHealth: number;
  opponentMaxHealth: number;
  opponentHandSize: number;
}

export interface QueuedOperation {
  sequence: number;
  type: 'play_card';
  payload: any;
  timestamp: number;
  card: Card;
}

export interface NetworkStats {
  currentLatency: number;
  avgLatency: number;
  queueSize: number;
  rollbackCount: number;
  totalPlays: number;
  validPlays: number;
}

type StateUpdateCallback = (state: GameState, playedCard?: Card, damage?: number, fromAi?: boolean) => void;
type AckCallback = (sequence: number, payload?: any) => void;
type RollbackCallback = (sequence: number, state: GameState, reason?: string) => void;
type GameStartCallback = (state: GameState) => void;

export class NetworkManager {
  private ws: WebSocket | null = null;
  private sequence: number = 0;
  private operationQueue: QueuedOperation[] = [];
  private maxQueueSize: number = 10;
  private baseLatency: number = 200;
  private latencyVariation: number = 100;
  
  private stats: NetworkStats = {
    currentLatency: 0,
    avgLatency: 0,
    queueSize: 0,
    rollbackCount: 0,
    totalPlays: 0,
    validPlays: 0,
  };
  
  private latencyHistory: number[] = [];
  private maxLatencyHistory: number = 20;
  
  private onStateUpdate: StateUpdateCallback | null = null;
  private onAck: AckCallback | null = null;
  private onRollback: RollbackCallback | null = null;
  private onGameStart: GameStartCallback | null = null;
  
  private pendingOperations: Map<number, QueuedOperation> = new Map();
  private lastKnownState: GameState | null = null;

  constructor() {}

  connect(url: string = '/ws'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        let wsUrl: string;
        if (url.startsWith('ws://') || url.startsWith('wss://')) {
          wsUrl = url;
        } else {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${protocol}//${window.location.host}${url}`;
        }
        
        console.log('连接到 WebSocket:', wsUrl);
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('WebSocket连接已建立');
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error);
          reject(error);
        };
        
        this.ws.onclose = () => {
          console.log('WebSocket连接已关闭');
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(data: string) {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'game_start':
          this.lastKnownState = message.state;
          if (this.onGameStart) {
            this.onGameStart(message.state);
          }
          break;
          
        case 'state_update':
          this.lastKnownState = message.state;
          if (this.onStateUpdate) {
            this.onStateUpdate(
              message.state,
              message.playedCard,
              message.damage,
              message.fromAi
            );
          }
          break;
          
        case 'ack':
          this.handleAck(message);
          break;
          
        case 'rollback':
          this.handleRollback(message);
          break;
      }
    } catch (error) {
      console.error('解析消息失败:', error);
    }
  }

  private handleAck(message: any) {
    const sequence = message.sequence;
    const operation = this.pendingOperations.get(sequence);
    
    if (operation) {
      const latency = Date.now() - operation.timestamp;
      this.updateLatencyStats(latency);
      
      this.pendingOperations.delete(sequence);
      this.removeFromQueue(sequence);
      
      if (this.onAck) {
        this.onAck(sequence, message.payload);
      }
      
      if (message.state) {
        this.lastKnownState = message.state;
      }
      
      this.stats.validPlays++;
    }
    
    this.updateStats();
  }

  private handleRollback(message: any) {
    const sequence = message.sequence;
    const operation = this.pendingOperations.get(sequence);
    
    if (operation) {
      const latency = Date.now() - operation.timestamp;
      this.updateLatencyStats(latency);
      
      this.pendingOperations.delete(sequence);
      this.removeFromQueue(sequence);
      
      if (message.state) {
        this.lastKnownState = message.state;
      }
      
      if (this.onRollback) {
        this.onRollback(sequence, message.state, message.reason);
      }
      
      this.stats.rollbackCount++;
    }
    
    this.updateStats();
  }

  private updateLatencyStats(latency: number) {
    this.stats.currentLatency = Math.round(latency);
    this.latencyHistory.push(latency);
    
    if (this.latencyHistory.length > this.maxLatencyHistory) {
      this.latencyHistory.shift();
    }
    
    const sum = this.latencyHistory.reduce((a, b) => a + b, 0);
    this.stats.avgLatency = Math.round(sum / this.latencyHistory.length);
  }

  private removeFromQueue(sequence: number) {
    const index = this.operationQueue.findIndex((op) => op.sequence === sequence);
    if (index !== -1) {
      this.operationQueue.splice(index, 1);
    }
    this.stats.queueSize = this.operationQueue.length;
  }

  playCard(card: Card): number {
    this.sequence++;
    const sequence = this.sequence;
    
    const operation: QueuedOperation = {
      sequence,
      type: 'play_card',
      payload: { cardId: card.id },
      timestamp: Date.now(),
      card,
    };
    
    if (this.operationQueue.length >= this.maxQueueSize) {
      this.operationQueue.shift();
    }
    
    this.operationQueue.push(operation);
    this.pendingOperations.set(sequence, operation);
    this.stats.totalPlays++;
    this.stats.queueSize = this.operationQueue.length;
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'play_card',
          sequence,
          payload: { cardId: card.id },
        })
      );
    }
    
    this.updateStats();
    return sequence;
  }

  private updateStats() {
    const latencyEl = document.getElementById('latency-value');
    const queueEl = document.getElementById('queue-count');
    
    if (latencyEl) {
      latencyEl.textContent = `${this.stats.currentLatency} ms`;
      latencyEl.className = 'latency-value';
      
      if (this.stats.currentLatency > 200) {
        latencyEl.classList.add('high');
      } else if (this.stats.currentLatency > 100) {
        latencyEl.classList.add('medium');
      }
    }
    
    if (queueEl) {
      queueEl.textContent = this.stats.queueSize.toString();
      queueEl.className = 'latency-value';
      
      if (this.stats.queueSize > 5) {
        queueEl.classList.add('high');
      } else if (this.stats.queueSize > 2) {
        queueEl.classList.add('medium');
      }
    }
  }

  getStats(): NetworkStats {
    return { ...this.stats };
  }

  getLastKnownState(): GameState | null {
    return this.lastKnownState;
  }

  getPendingOperation(sequence: number): QueuedOperation | undefined {
    return this.pendingOperations.get(sequence);
  }

  setOnStateUpdate(callback: StateUpdateCallback) {
    this.onStateUpdate = callback;
  }

  setOnAck(callback: AckCallback) {
    this.onAck = callback;
  }

  setOnRollback(callback: RollbackCallback) {
    this.onRollback = callback;
  }

  setOnGameStart(callback: GameStartCallback) {
    this.onGameStart = callback;
  }

  setSimulatedLatency(base: number, variation: number) {
    this.baseLatency = base;
    this.latencyVariation = variation;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  restartGame(): Promise<GameState> {
    return new Promise((resolve, reject) => {
      fetch('/api/restart', { method: 'POST' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            this.sequence = 0;
            this.operationQueue = [];
            this.pendingOperations.clear();
            this.stats.rollbackCount = 0;
            this.stats.totalPlays = 0;
            this.stats.validPlays = 0;
            this.lastKnownState = data.state;
            resolve(data.state);
          } else {
            reject(new Error('重启失败'));
          }
        })
        .catch(reject);
    });
  }
}
