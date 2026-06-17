import { GameState, Card } from '../shared/types';

export type PlayCardCallback = (card: Card) => void;

export class AIPlayer {
  private playerId: string = 'player_ai';
  private onPlayCard: PlayCardCallback;
  private currentState: GameState | null = null;
  private isThinking: boolean = false;
  private thinkTimer: number | null = null;

  constructor(onPlayCard: PlayCardCallback) {
    this.onPlayCard = onPlayCard;
  }

  public updateState(state: GameState): void {
    this.currentState = state;

    if (
      state.status === 'playing' &&
      state.currentTurnIndex === 1 &&
      !this.isThinking
    ) {
      this.schedulePlay();
    }
  }

  private schedulePlay(): void {
    if (!this.currentState || this.currentState.status !== 'playing') return;

    this.isThinking = true;
    const delay = 100 + Math.random() * 200;

    if (this.thinkTimer) {
      window.clearTimeout(this.thinkTimer);
    }

    this.thinkTimer = window.setTimeout(() => {
      this.playBestCard();
    }, delay);
  }

  private playBestCard(): void {
    if (!this.currentState || this.currentState.status !== 'playing') {
      this.isThinking = false;
      return;
    }

    if (this.currentState.currentTurnIndex !== 1) {
      this.isThinking = false;
      return;
    }

    const aiPlayer = this.currentState.players[1];
    const localPlayer = this.currentState.players[0];

    if (aiPlayer.hand.length === 0) {
      this.isThinking = false;
      return;
    }

    let bestCard: Card | null = null;
    let bestScore = -Infinity;

    for (const card of aiPlayer.hand) {
      let score = card.attack * 2;

      if (localPlayer.hp <= card.attack) {
        score += 1000;
      }

      if (localPlayer.hp <= localPlayer.maxHp * 0.3) {
        score += card.attack * 2;
      }

      if (localPlayer.hp <= localPlayer.maxHp * 0.6) {
        score += card.attack * 0.5;
      }

      score += (this.currentState.discardPile.length) * 0.1;

      score -= card.cost * 0.3;

      score += Math.random() * 2;

      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    }

    if (bestCard) {
      this.onPlayCard(bestCard);
    }

    this.isThinking = false;
  }

  public cancelThinking(): void {
    if (this.thinkTimer) {
      window.clearTimeout(this.thinkTimer);
      this.thinkTimer = null;
    }
    this.isThinking = false;
  }

  public reset(): void {
    this.cancelThinking();
    this.currentState = null;
  }
}
