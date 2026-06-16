import { Card, GameState } from '../shared/types';
import { NetworkManager } from './network';

export class AIPlayer {
  private network: NetworkManager;
  private isThinking: boolean = false;
  private aiId: string = 'ai';
  private onAIPlayCallback: ((card: Card) => void) | null = null;

  constructor(network: NetworkManager) {
    this.network = network;
  }

  onAIPlay(callback: (card: Card) => void): void {
    this.onAIPlayCallback = callback;
  }

  handleStateUpdate(gameState: GameState): void {
    if (gameState.gameOver) return;
    if (gameState.currentPlayerId !== this.aiId) return;
    if (this.isThinking) return;

    const aiPlayer = gameState.players[this.aiId];
    if (!aiPlayer || aiPlayer.hand.length === 0) return;

    this.isThinking = true;

    const bestCard = this.selectBestCard(aiPlayer.hand, gameState);
    if (!bestCard) {
      this.isThinking = false;
      return;
    }

    const delay = Math.floor(Math.random() * 200) + 100;

    setTimeout(() => {
      if (this.onAIPlayCallback) {
        this.onAIPlayCallback(bestCard);
      }

      this.network.sendAIPlay(this.aiId, bestCard.id);
      this.isThinking = false;
    }, delay);
  }

  private selectBestCard(hand: Card[], gameState: GameState): Card | null {
    if (hand.length === 0) return null;

    const opponent = gameState.players['player'];
    if (!opponent) return hand[0];

    let bestCard = hand[0];
    let bestScore = -Infinity;

    for (const card of hand) {
      let score = 0;
      
      if (card.type === 'attack') {
        score = card.attack * 2;
        if (card.attack >= opponent.hp) {
          score += 1000;
        }
        if (opponent.hp <= 10) {
          score += 20;
        }
      } else if (card.type === 'defense') {
        const aiHp = gameState.players[this.aiId]?.hp || 0;
        const aiMaxHp = gameState.players[this.aiId]?.maxHp || 30;
        if (aiHp < aiMaxHp * 0.3) {
          score = 15;
        } else {
          score = 3;
        }
      } else {
        score = 5 + Math.random() * 3;
      }

      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    }

    return bestCard;
  }

  isAITurn(gameState: GameState): boolean {
    return gameState.currentPlayerId === this.aiId;
  }
}
