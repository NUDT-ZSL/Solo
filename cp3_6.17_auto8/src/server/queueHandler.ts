import type { GameAction } from '../shared/types';
import { GameStateManager } from './gameState';

interface QueuedMessage {
  action: GameAction;
  ws: any;
  broadcast: (action: GameAction) => void;
}

export class QueueHandler {
  private queue: QueuedMessage[] = [];
  private lastProcessedSequence: Record<string, number> = {};
  private gameState: GameStateManager;
  private processing = false;

  constructor(gameState: GameStateManager) {
    this.gameState = gameState;
  }

  public enqueue(message: QueuedMessage): void {
    this.queue.push(message);
    this.queue.sort((a, b) => {
      if (a.action.playerId === b.action.playerId) {
        return a.action.sequence - b.action.sequence;
      }
      return a.action.timestamp - b.action.timestamp;
    });
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const msg = this.queue[0];

      const lastSeq = this.lastProcessedSequence[msg.action.playerId] ?? -1;
      if (msg.action.sequence !== lastSeq + 1) {
        if (msg.action.sequence <= lastSeq) {
          this.queue.shift();
          continue;
        }
        break;
      }

      this.queue.shift();
      this.lastProcessedSequence[msg.action.playerId] = msg.action.sequence;
      this.processMessage(msg);
    }

    this.processing = false;
  }

  private processMessage(msg: QueuedMessage): void {
    const { action, ws, broadcast } = msg;

    switch (action.type) {
      case 'HELLO':
        this.handleHello(action, ws);
        break;
      case 'PLAY_CARD':
        this.handlePlayCard(action, ws, broadcast);
        break;
    }
  }

  private handleHello(action: GameAction, ws: any): void {
    const state = this.gameState.getPublicState();
    const syncAction: GameAction = {
      type: 'SYNC_STATE',
      sequence: action.sequence,
      playerId: 'server',
      timestamp: Date.now(),
      payload: { state },
    };
    ws.send(JSON.stringify(syncAction));
  }

  private handlePlayCard(action: GameAction, ws: any, broadcast: (action: GameAction) => void): void {
    const cardId = action.payload?.cardId;
    if (!cardId) {
      this.sendRollback(action, ws, '缺少卡牌ID');
      return;
    }

    const validation = this.gameState.validatePlay(action.playerId, cardId);
    if (!validation.valid) {
      this.sendRollback(action, ws, validation.reason || '操作无效');
      return;
    }

    const newState = this.gameState.applyPlay(action.playerId, cardId);

    const ackAction: GameAction = {
      type: 'ACK',
      sequence: action.sequence,
      playerId: 'server',
      timestamp: Date.now(),
      payload: { state: newState },
    };
    ws.send(JSON.stringify(ackAction));

    const syncAction: GameAction = {
      type: 'SYNC_STATE',
      sequence: action.sequence,
      playerId: 'server',
      timestamp: Date.now(),
      payload: { state: newState },
    };
    broadcast(syncAction);

    if (newState.gameOver) {
      const gameOverAction: GameAction = {
        type: 'GAME_OVER',
        sequence: action.sequence + 1,
        playerId: 'server',
        timestamp: Date.now(),
        payload: { state: newState },
      };
      broadcast(gameOverAction);
    }
  }

  private sendRollback(action: GameAction, ws: any, reason: string): void {
    const rollbackAction: GameAction = {
      type: 'ROLLBACK',
      sequence: action.sequence,
      playerId: 'server',
      timestamp: Date.now(),
      payload: { reason },
    };
    ws.send(JSON.stringify(rollbackAction));
  }

  public reset(): void {
    this.queue = [];
    this.lastProcessedSequence = {};
    this.processing = false;
  }
}
