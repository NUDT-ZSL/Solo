import { GameStateManager, GameAction, GameStateData, ValidationResult } from './gameState';

export interface QueuedMessage {
  action: GameAction;
  receivedAt: number;
}

export interface ProcessResult {
  type: 'ACK' | 'ROLLBACK';
  sequence: number;
  state?: GameStateData;
  playedCardId?: string;
  reason?: string;
}

type AckCallback = (result: ProcessResult) => void;
type BroadcastCallback = (state: GameStateData) => void;
type GameOverCallback = (winner: string) => void;

export class QueueHandler {
  private queue: QueuedMessage[] = [];
  private expectedSequence: number = 1;
  private gameState: GameStateManager;
  private isProcessing: boolean = false;

  private onAck: AckCallback | null = null;
  private onBroadcast: BroadcastCallback | null = null;
  private onGameOver: GameOverCallback | null = null;

  constructor(gameState: GameStateManager) {
    this.gameState = gameState;
  }

  setCallbacks(
    onAck: AckCallback,
    onBroadcast: BroadcastCallback,
    onGameOver: GameOverCallback
  ): void {
    this.onAck = onAck;
    this.onBroadcast = onBroadcast;
    this.onGameOver = onGameOver;
  }

  enqueue(action: GameAction): void {
    const message: QueuedMessage = {
      action,
      receivedAt: Date.now(),
    };

    const insertIndex = this.findInsertIndex(action.sequence);
    this.queue.splice(insertIndex, 0, message);

    console.log(`[Queue] Enqueued action seq=${action.sequence}, queue size=${this.queue.length}`);

    this.processQueue();
  }

  private findInsertIndex(sequence: number): number {
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].action.sequence > sequence) {
        return i;
      }
    }
    return this.queue.length;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const next = this.queue[0];

      if (next.action.sequence > this.expectedSequence) {
        console.log(`[Queue] Waiting for seq=${this.expectedSequence}, got seq=${next.action.sequence}`);
        break;
      }

      if (next.action.sequence < this.expectedSequence) {
        console.log(`[Queue] Discarding duplicate/outdated seq=${next.action.sequence}`);
        this.queue.shift();
        continue;
      }

      this.queue.shift();
      this.expectedSequence++;

      const result = this.processAction(next.action);

      if (this.onAck) {
        this.onAck(result);
      }

      if (result.type === 'ACK' && result.state) {
        if (this.onBroadcast) {
          this.onBroadcast(result.state);
        }
        if (result.state.gameOver && result.state.winner && this.onGameOver) {
          this.onGameOver(result.state.winner);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.isProcessing = false;
  }

  private processAction(action: GameAction): ProcessResult {
    const validation: ValidationResult = this.gameState.validateAction(action);

    if (!validation.valid) {
      console.log(`[Queue] Action seq=${action.sequence} ROLLBACK: ${validation.reason}`);
      return {
        type: 'ROLLBACK',
        sequence: action.sequence,
        reason: validation.reason,
      };
    }

    const applyResult = this.gameState.applyAction(action);
    if (!applyResult) {
      return {
        type: 'ROLLBACK',
        sequence: action.sequence,
        reason: '应用操作失败',
      };
    }

    console.log(`[Queue] Action seq=${action.sequence} ACK, player=${action.playerId}, card=${action.cardId}`);

    return {
      type: 'ACK',
      sequence: action.sequence,
      state: applyResult.state,
      playedCardId: applyResult.playedCard.id,
    };
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getExpectedSequence(): number {
    return this.expectedSequence;
  }

  reset(): void {
    this.queue = [];
    this.expectedSequence = 1;
    this.isProcessing = false;
  }
}
