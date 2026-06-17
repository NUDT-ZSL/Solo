import { GameStateData, playCard, aiChooseCard, getPublicState } from './gameState';

export interface QueuedMessage {
  sequence: number;
  playerId: string;
  type: 'play_card' | 'ping';
  payload: any;
  timestamp: number;
}

export interface ServerResponse {
  type: 'ack' | 'rollback' | 'state_update' | 'game_start';
  sequence?: number;
  playerId?: string;
  payload?: any;
  state?: any;
  reason?: string;
}

export class MessageQueue {
  private queue: QueuedMessage[] = [];
  private nextSequence: number = 1;
  private lastProcessedSequence: { [playerId: string]: number } = {
    player: 0,
    ai: 0,
  };
  private gameState: GameStateData;
  private onStateUpdate: (state: any) => void;
  private onAiTurn: () => void;

  constructor(
    initialState: GameStateData,
    onStateUpdate: (state: any) => void,
    onAiTurn: () => void
  ) {
    this.gameState = initialState;
    this.onStateUpdate = onStateUpdate;
    this.onAiTurn = onAiTurn;
  }

  addMessage(message: Omit<QueuedMessage, 'timestamp'>): ServerResponse[] {
    const queuedMessage: QueuedMessage = {
      ...message,
      timestamp: Date.now(),
    };

    this.queue.push(queuedMessage);
    this.queue.sort((a, b) => a.sequence - b.sequence);

    return this.processQueue();
  }

  private processQueue(): ServerResponse[] {
    const responses: ServerResponse[] = [];

    while (this.queue.length > 0) {
      const nextMsg = this.queue[0];
      const expectedSequence = this.lastProcessedSequence[nextMsg.playerId] + 1;

      if (nextMsg.sequence !== expectedSequence) {
        if (nextMsg.sequence < expectedSequence) {
          this.queue.shift();
          continue;
        }
        break;
      }

      const response = this.processMessage(nextMsg);
      responses.push(response);

      this.lastProcessedSequence[nextMsg.playerId] = nextMsg.sequence;
      this.queue.shift();
    }

    return responses;
  }

  private processMessage(message: QueuedMessage): ServerResponse {
    if (message.type === 'ping') {
      return {
        type: 'ack',
        sequence: message.sequence,
        playerId: message.playerId,
        payload: { pong: true },
      };
    }

    if (message.type === 'play_card') {
      const result = playCard(
        this.gameState,
        message.playerId,
        message.payload.cardId
      );

      if (!result.valid) {
        return {
          type: 'rollback',
          sequence: message.sequence,
          playerId: message.playerId,
          reason: result.reason,
          state: getPublicState(this.gameState, message.playerId),
        };
      }

      this.gameState = result.state;

      const playerState = getPublicState(this.gameState, message.playerId);
      const opponentId = message.playerId === 'player' ? 'ai' : 'player';
      const opponentState = getPublicState(this.gameState, opponentId);

      this.onStateUpdate({
        playerId: opponentId,
        state: opponentState,
        playedCard: result.playedCard,
        damage: result.damage,
      });

      if (this.gameState.currentTurn === 'ai' && !this.gameState.isGameOver) {
        setTimeout(() => {
          this.onAiTurn();
        }, 0);
      }

      return {
        type: 'ack',
        sequence: message.sequence,
        playerId: message.playerId,
        payload: {
          playedCard: result.playedCard,
          damage: result.damage,
        },
        state: playerState,
      };
    }

    return {
      type: 'ack',
      sequence: message.sequence,
      playerId: message.playerId,
    };
  }

  getGameState(): GameStateData {
    return this.gameState;
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getNextSequence(playerId: string): number {
    return this.lastProcessedSequence[playerId] + 1;
  }

  reset(newState: GameStateData): void {
    this.queue = [];
    this.nextSequence = 1;
    this.lastProcessedSequence = {
      player: 0,
      ai: 0,
    };
    this.gameState = newState;
  }
}

export function simulateAiPlay(
  queue: MessageQueue,
  gameState: GameStateData
): ServerResponse[] | null {
  const card = aiChooseCard(gameState);
  if (!card) return null;

  const aiSequence = queue.getNextSequence('ai');
  
  return queue.addMessage({
    sequence: aiSequence,
    playerId: 'ai',
    type: 'play_card',
    payload: { cardId: card.id },
  });
}
