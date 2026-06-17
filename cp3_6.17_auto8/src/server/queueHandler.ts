import { PlayerAction, ServerAck, GameState } from '../shared/types';
import { validateAction, applyAction } from './gameState';
import { EventEmitter } from 'events';

interface QueuedMessage {
  action: PlayerAction;
  resolve: (ack: ServerAck) => void;
  receivedAt: number;
}

export interface ProcessResult {
  ack: ServerAck;
  newState?: GameState;
  playedCard?: {
    card: any;
    playerId: string;
  };
}

export class QueueHandler extends EventEmitter {
  private queue: QueuedMessage[] = [];
  private nextExpectedSequence: number = 0;
  private processing: boolean = false;
  private maxQueueSize = 50;

  constructor() {
    super();
  }

  public enqueue(action: PlayerAction): Promise<ProcessResult> {
    return new Promise((resolve) => {
      if (this.queue.length >= this.maxQueueSize) {
        const oldest = this.queue.shift();
        if (oldest) {
          oldest.resolve({
            type: 'rollback',
            sequence: oldest.action.sequence,
            actionType: oldest.action.type,
            message: '队列已满，消息被丢弃',
            cardId: oldest.action.cardId,
          });
        }
      }

      const msg: QueuedMessage = {
        action,
        resolve: (ack) => {
          resolve({ ack });
        },
        receivedAt: Date.now(),
      };

      this.queue.push(msg);
      this.sortQueue();
      this.processQueue().catch((e) => console.error('处理队列错误:', e));
    });
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => a.action.sequence - b.action.sequence);
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const front = this.queue[0];

        if (front.action.sequence > this.nextExpectedSequence) {
          break;
        }

        this.queue.shift();

        const result: ProcessResult = await this.processAction(front.action);
        front.resolve(result.ack);

        if (result.newState && result.playedCard) {
          this.emit('state_changed', {
            newState: result.newState,
            playedCard: result.playedCard,
          });
        }

        if (front.action.sequence === this.nextExpectedSequence) {
          this.nextExpectedSequence++;
        } else if (front.action.sequence < this.nextExpectedSequence) {
          // 重复或过期消息
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private processAction(action: PlayerAction): Promise<ProcessResult> {
    return new Promise((resolve) => {
      this.emit('get_state', (state: GameState) => {
        const validation = validateAction(state, action);

        if (!validation.valid || !validation.card) {
          resolve({
            ack: {
              type: 'rollback',
              sequence: action.sequence,
              actionType: action.type,
              message: validation.reason || '操作无效',
              cardId: action.cardId,
            },
          });
          return;
        }

        const { newState, playedCard, damaged } = applyAction(state, action);

        resolve({
          ack: {
            type: 'ack',
            sequence: action.sequence,
            actionType: action.type,
            cardId: action.cardId,
          },
          newState,
          playedCard: playedCard
            ? { card: playedCard, playerId: action.playerId }
            : undefined,
        });
      });
    });
  }

  public getQueueSize(): number {
    return this.queue.length;
  }

  public getNextExpectedSequence(): number {
    return this.nextExpectedSequence;
  }

  public reset(): void {
    this.queue = [];
    this.nextExpectedSequence = 0;
    this.processing = false;
  }
}
