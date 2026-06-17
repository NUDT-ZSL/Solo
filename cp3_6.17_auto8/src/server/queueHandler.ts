import { GameAction, ServerMessage } from '../shared/types';

interface QueuedMessage {
  action: GameAction;
  timestamp: number;
  ws: any;
}

export class QueueHandler {
  private messageQueue: QueuedMessage[] = [];
  private lastProcessedSequence: Record<string, number> = {};
  private isProcessing: boolean = false;
  
  private onProcessAction: ((action: GameAction) => { valid: boolean; reason?: string; state?: any }) | null = null;
  private onStateChange: ((state: any) => void) | null = null;
  
  constructor() {}
  
  setOnProcessAction(callback: (action: GameAction) => { valid: boolean; reason?: string; state?: any }): void {
    this.onProcessAction = callback;
  }
  
  setOnStateChange(callback: (state: any) => void): void {
    this.onStateChange = callback;
  }
  
  enqueue(action: GameAction, ws: any): void {
    const message: QueuedMessage = {
      action,
      timestamp: Date.now(),
      ws,
    };
    
    this.messageQueue.push(message);
    this.messageQueue.sort((a, b) => a.action.sequence - b.action.sequence);
    
    this.processQueue();
  }
  
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    if (this.messageQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.processMessage(message);
    }
    
    this.isProcessing = false;
  }
  
  private processMessage(message: QueuedMessage): void {
    const { action, ws } = message;
    const playerId = action.playerId;
    
    const lastSeq = this.lastProcessedSequence[playerId] || 0;
    
    if (action.sequence <= lastSeq) {
      console.log(`[QueueHandler] Duplicate or out-of-order message: seq=${action.sequence}, last=${lastSeq}`);
      this.sendRollback(ws, action.sequence, '消息序列号重复');
      return;
    }
    
    if (this.onProcessAction) {
      const result = this.onProcessAction(action);
      
      if (result.valid) {
        this.lastProcessedSequence[playerId] = action.sequence;
        this.sendAck(ws, action.sequence);
        
        if (result.state && this.onStateChange) {
          this.onStateChange(result.state);
        }
      } else {
        this.sendRollback(ws, action.sequence, result.reason || '操作无效');
      }
    } else {
      this.lastProcessedSequence[playerId] = action.sequence;
      this.sendAck(ws, action.sequence);
    }
  }
  
  private sendAck(ws: any, sequence: number): void {
    const message: ServerMessage = {
      type: 'ack',
      sequence,
    };
    
    this.sendMessage(ws, message);
  }
  
  private sendRollback(ws: any, sequence: number, reason: string): void {
    const message: ServerMessage = {
      type: 'rollback',
      sequence,
      reason,
    };
    
    this.sendMessage(ws, message);
  }
  
  private sendMessage(ws: any, message: ServerMessage): void {
    if (ws && ws.readyState === 1) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('[QueueHandler] Failed to send message:', error);
      }
    }
  }
  
  getQueueSize(): number {
    return this.messageQueue.length;
  }
  
  getLastProcessedSequence(playerId: string): number {
    return this.lastProcessedSequence[playerId] || 0;
  }
  
  reset(): void {
    this.messageQueue = [];
    this.lastProcessedSequence = {};
    this.isProcessing = false;
  }
  
  resetPlayer(playerId: string): void {
    delete this.lastProcessedSequence[playerId];
    this.messageQueue = this.messageQueue.filter(m => m.action.playerId !== playerId);
  }
}
