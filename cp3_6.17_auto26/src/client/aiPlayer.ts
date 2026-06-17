import { Card, GameState } from './network';

type PlayCardCallback = (cardId: string) => void;

export class AIPlayer {
  private aiId: string;
  private onPlayCard: PlayCardCallback | null = null;
  private isThinking: boolean = false;
  private gameState: GameState | null = null;

  constructor(aiId: string) {
    this.aiId = aiId;
  }

  setCallback(onPlayCard: PlayCardCallback): void {
    this.onPlayCard = onPlayCard;
  }

  updateState(state: GameState): void {
    this.gameState = state;

    if (state.currentTurn === this.aiId && !state.gameOver && !this.isThinking) {
      this.thinkAndPlay();
    }
  }

  private thinkAndPlay(): void {
    if (!this.gameState) return;

    const aiState = this.gameState.players[this.aiId];
    if (!aiState || aiState.hand.length === 0) return;

    this.isThinking = true;

    const baseDelay = 100 + Math.random() * 200;
    const thinkTime = 300 + Math.random() * 500;

    setTimeout(() => {
      if (!this.gameState) {
        this.isThinking = false;
        return;
      }

      if (this.gameState.currentTurn !== this.aiId || this.gameState.gameOver) {
        this.isThinking = false;
        return;
      }

      const bestCard = this.selectBestCard();
      if (bestCard && this.onPlayCard) {
        this.onPlayCard(bestCard.id);
      }

      this.isThinking = false;
    }, baseDelay + thinkTime);
  }

  private selectBestCard(): Card | null {
    if (!this.gameState) return null;

    const aiState = this.gameState.players[this.aiId];
    const opponentId = Object.keys(this.gameState.players).find(id => id !== this.aiId);
    if (!aiState || !opponentId || aiState.hand.length === 0) return null;

    const opponentState = this.gameState.players[opponentId];
    const opponentHp = opponentState?.hp ?? 30;
    const opponentHandCount = opponentState?.hand.length ?? 0;
    const discardSize = this.gameState.discardPile.length;

    let bestCard: Card | null = null;
    let bestScore = -Infinity;

    for (const card of aiState.hand) {
      const score = this.evaluateCard(card, opponentHp, opponentHandCount, discardSize);
      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    }

    return bestCard;
  }

  private evaluateCard(
    card: Card,
    opponentHp: number,
    opponentHandCount: number,
    discardSize: number
  ): number {
    let score = 0;

    score += card.attack * 2;

    if (opponentHp <= 10) {
      score += card.attack * 3;
    }

    score -= card.cost * 0.5;

    if (opponentHandCount <= 2) {
      score += 5;
    }

    if (discardSize > 15) {
      score += 2;
    }

    return score;
  }

  getIsThinking(): boolean {
    return this.isThinking;
  }
}
