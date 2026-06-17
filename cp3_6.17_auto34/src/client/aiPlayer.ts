import { Card, GameState, PlayerAction } from '../types';
import { networkClient } from './network';

export interface AIPlayerCallbacks {
  onSimulatedPlay: (card: Card) => void;
  onStatusChange: (status: string) => void;
}

export class AIPlayer {
  private gameState: GameState | null = null;
  private callbacks: AIPlayerCallbacks | null = null;
  private isPlaying: boolean = false;
  private pendingTimeout: NodeJS.Timeout | null = null;
  private readonly aiPlayerId = 'ai';

  init(callbacks: AIPlayerCallbacks): void {
    this.callbacks = callbacks;
    networkClient.onStateUpdate = this.handleStateUpdate.bind(this);
  }

  private handleStateUpdate(state: GameState): void {
    this.gameState = state;
    if (state.playerHealth <= 0 || state.aiHealth <= 0) {
      this.stop();
      return;
    }
    if (state.currentTurn === 'ai' && !this.isPlaying) {
      this.startTurn();
    }
  }

  private startTurn(): void {
    if (!this.gameState || !this.callbacks) return;
    this.isPlaying = true;
    this.callbacks.onStatusChange('思考中...');
    const bestCard = this.calculateBestPlay();
    if (bestCard) {
      this.simulatePlay(bestCard);
    }
  }

  calculateBestPlay(): Card | null {
    if (!this.gameState || this.gameState.aiHand.length === 0) {
      return null;
    }
    const hand = this.gameState.aiHand;
    const playerHealth = this.gameState.playerHealth;
    let bestCard: Card | null = null;
    let bestScore = -Infinity;
    for (const card of hand) {
      const score = this.evaluateCard(card, playerHealth);
      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    }
    return bestCard;
  }

  private evaluateCard(card: Card, targetHealth: number): number {
    let score = card.value * 10;
    if (card.value >= 10) {
      score += 50;
    }
    if (card.value >= targetHealth) {
      score += 100;
    }
    if (targetHealth <= 30) {
      score += 30;
    }
    if (card.suit === '♠' || card.suit === '♥') {
      score += 10;
    }
    return score;
  }

  simulatePlay(card: Card): void {
    if (!this.callbacks) return;
    const latency = 100 + Math.random() * 200;
    this.callbacks.onStatusChange(`出牌中 (${Math.round(latency)}ms)`);
    this.pendingTimeout = setTimeout(() => {
      if (this.callbacks) {
        networkClient.sendAction({
          type: 'play',
          cardId: card.id,
          playerId: this.aiPlayerId,
        });
        this.callbacks.onSimulatedPlay(card);
        this.callbacks.onStatusChange('等待中');
        this.isPlaying = false;
      }
    }, latency);
  }

  stop(): void {
    this.isPlaying = false;
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }
    if (this.callbacks) {
      this.callbacks.onStatusChange('游戏结束');
    }
  }

  reset(): void {
    this.stop();
    this.gameState = null;
  }
}
