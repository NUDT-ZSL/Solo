import type { Card, GameStateData } from '../shared/types';
import { NetworkManager } from './network';
import { CardGame } from './cardGame';

export class AIPlayer {
  private network: NetworkManager;
  private cardGame: CardGame;
  private aiPlayerId = 'ai-player';
  private currentState: GameStateData | null = null;
  private actionTimer: number | null = null;

  constructor(network: NetworkManager, cardGame: CardGame) {
    this.network = network;
    this.cardGame = cardGame;
  }

  public updateState(state: GameStateData): void {
    this.currentState = state;

    if (state.currentTurn === this.aiPlayerId && !state.gameOver) {
      this.scheduleAction();
    }
  }

  private scheduleAction(): void {
    if (this.actionTimer) {
      clearTimeout(this.actionTimer);
    }

    const latency = 100 + Math.floor(Math.random() * 200);
    this.actionTimer = window.setTimeout(() => {
      this.takeTurn();
    }, latency + 400);
  }

  private takeTurn(): void {
    if (!this.currentState || this.currentState.gameOver) return;
    if (this.currentState.currentTurn !== this.aiPlayerId) return;

    const aiState = this.currentState.players[this.aiPlayerId];
    if (!aiState || aiState.hand.length === 0) return;

    const bestCard = this.chooseBestCard(aiState.hand, this.currentState);

    if (bestCard) {
      this.cardGame.showAICardPlay(bestCard);

      setTimeout(() => {
        this.network.sendAIAction(bestCard.id);
      }, 200);
    }
  }

  private chooseBestCard(hand: Card[], state: GameStateData): Card | null {
    if (hand.length === 0) return null;

    const opponentId = Object.keys(state.players).find((id) => id !== this.aiPlayerId);
    if (!opponentId) return hand[0];

    const opponent = state.players[opponentId];
    const aiSelf = state.players[this.aiPlayerId];

    const sortedHand = [...hand].sort((a, b) => {
      let scoreA = a.value;
      let scoreB = b.value;

      if (opponent && opponent.health <= aiSelf.maxHealth * 0.3) {
        scoreA *= 1.5;
        scoreB *= 1.5;
      }

      if (aiSelf.health <= aiSelf.maxHealth * 0.3) {
        scoreA *= 0.8;
        scoreB *= 0.8;
      }

      if (state.discardPile.length > 10) {
        scoreA += 1;
        scoreB += 1;
      }

      return scoreB - scoreA;
    });

    return sortedHand[0];
  }

  public destroy(): void {
    if (this.actionTimer) {
      clearTimeout(this.actionTimer);
      this.actionTimer = null;
    }
  }
}
