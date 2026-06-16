import { ClientMessage, GameState, ServerAck } from '../shared/types';
import { GameStateManager } from './gameState';

interface QueuedMessage {
  message: ClientMessage;
  resolve: (result: ServerAck) => void;
}

export class QueueHandler {
  private queue: QueuedMessage[] = [];
  private gameStateManager: GameStateManager;
  private lastProcessedSequence: number = -1;
  private isProcessing: boolean = false;

  constructor(gameStateManager: GameStateManager) {
    this.gameStateManager = gameStateManager;
  }

  async enqueue(message: ClientMessage): Promise<ServerAck> {
    return new Promise((resolve) => {
      this.queue.push({ message, resolve });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      this.queue.sort((a, b) => a.message.sequence - b.message.sequence);
      
      const next = this.queue.shift();
      if (!next) break;

      const { message, resolve } = next;

      if (message.sequence <= this.lastProcessedSequence) {
        resolve({
          type: 'ACK',
          sequence: message.sequence,
          status: 'rollback',
          reason: '序列号重复',
          gameState: this.gameStateManager.getState()
        });
        continue;
      }

      const validation = this.gameStateManager.validatePlay(message.playerId, message.cardId);
      
      if (validation.valid) {
        const newState = this.gameStateManager.playCard(message.playerId, message.cardId);
        this.lastProcessedSequence = message.sequence;
        resolve({
          type: 'ACK',
          sequence: message.sequence,
          status: 'success',
          gameState: newState
        });
      } else {
        resolve({
          type: 'ACK',
          sequence: message.sequence,
          status: 'rollback',
          reason: validation.reason,
          gameState: this.gameStateManager.getState()
        });
      }

      await new Promise(r => setTimeout(r, 10));
    }

    this.isProcessing = false;
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  reset(): void {
    this.queue = [];
    this.lastProcessedSequence = -1;
    this.isProcessing = false;
  }
}
