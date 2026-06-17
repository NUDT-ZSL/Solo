import { ClientAction, ServerMessage, QueuedMessage, GameStateData } from '../shared/types';
import { GameState } from './gameState';

export class QueueHandler {
  private queue: QueuedMessage[] = [];
  private gameState: GameState;
  private lastProcessedSequence = 0;
  private broadcastCallback: (msg: ServerMessage) => void;

  constructor(gameState: GameState, broadcastCallback: (msg: ServerMessage) => void) {
    this.gameState = gameState;
    this.broadcastCallback = broadcastCallback;
  }

  enqueue(action: ClientAction): void {
    this.queue.push({
      action,
      receivedAt: Date.now(),
    });
    this.processQueue();
  }

  private processQueue(): void {
    this.queue.sort((a, b) => a.action.sequence - b.action.sequence);

    while (this.queue.length > 0) {
      const next = this.queue[0];
      const expectedSeq = this.lastProcessedSequence + 1;

      if (next.action.sequence > expectedSeq) {
        break;
      }

      if (next.action.sequence < expectedSeq) {
        this.queue.shift();
        continue;
      }

      this.queue.shift();
      this.processMessage(next);
    }
  }

  private processMessage(queued: QueuedMessage): void {
    const { action } = queued;
    const validation = this.gameState.validateAction(action);

    if (!validation.valid) {
      const rollbackMsg: ServerMessage = {
        type: 'ROLLBACK',
        sequence: action.sequence,
        reason: validation.reason,
        state: this.gameState.getState(),
      };
      this.broadcastCallback(rollbackMsg);
      this.lastProcessedSequence = action.sequence;
      return;
    }

    const newState = this.gameState.applyAction(action);
    this.lastProcessedSequence = action.sequence;

    const ackMsg: ServerMessage = {
      type: 'ACK',
      sequence: action.sequence,
      state: newState,
    };
    this.broadcastCallback(ackMsg);

    if (newState.gameOver) {
      const gameOverMsg: ServerMessage = {
        type: 'GAME_OVER',
        state: newState,
      };
      this.broadcastCallback(gameOverMsg);
    } else {
      const stateUpdate: ServerMessage = {
        type: 'STATE_UPDATE',
        state: newState,
      };
      this.broadcastCallback(stateUpdate);
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getLastProcessedSequence(): number {
    return this.lastProcessedSequence;
  }
}
