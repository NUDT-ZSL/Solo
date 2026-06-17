import { Card, GameStateData, PlayerState } from '../shared/types';

export type AIPlayCallback = (cardId: string) => void;

export class AIPlayer {
  private aiPlayerId: string;
  private localPlayerId: string;
  private playCallback: AIPlayCallback;
  private lastState: GameStateData | null = null;
  private isThinking = false;

  constructor(aiPlayerId: string, localPlayerId: string, playCallback: AIPlayCallback) {
    this.aiPlayerId = aiPlayerId;
    this.localPlayerId = localPlayerId;
    this.playCallback = playCallback;
  }

  updateState(state: GameStateData): void {
    this.lastState = state;
    if (state.currentTurn === this.aiPlayerId && !state.gameOver && !this.isThinking) {
      this.schedulePlay();
    }
  }

  private schedulePlay(): void {
    if (!this.lastState) return;
    this.isThinking = true;

    const delay = 100 + Math.random() * 200;

    setTimeout(() => {
      if (!this.lastState || this.lastState.gameOver || this.lastState.currentTurn !== this.aiPlayerId) {
        this.isThinking = false;
        return;
      }

      const cardId = this.chooseBestCard();
      if (cardId) {
        this.playCallback(cardId);
      }
      this.isThinking = false;
    }, delay);
  }

  private chooseBestCard(): string | null {
    if (!this.lastState) return null;

    const aiPlayer = this.lastState.players[this.aiPlayerId];
    const localPlayer = this.lastState.players[this.localPlayerId];
    if (!aiPlayer || !localPlayer || aiPlayer.hand.length === 0) return null;

    let bestCard: Card | null = null;
    let bestScore = -Infinity;

    for (const card of aiPlayer.hand) {
      let score = 0;

      if (card.type === 'attack') {
        score = card.attack * 2;
        if (localPlayer.hp <= card.attack) score += 10;
        if (localPlayer.hp <= localPlayer.maxHp * 0.3) score += 3;
      } else if (card.type === 'heal') {
        const missingHp = aiPlayer.maxHp - aiPlayer.hp;
        const healAmount = Math.abs(card.attack);
        score = Math.min(missingHp, healAmount) * 1.5;
        if (aiPlayer.hp <= aiPlayer.maxHp * 0.3) score += 5;
      } else if (card.type === 'defense') {
        score = localPlayer.hand.length * 0.5;
        if (aiPlayer.hp <= aiPlayer.maxHp * 0.5) score += 2;
      }

      score += Math.random() * 0.5;

      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    }

    return bestCard ? bestCard.id : null;
  }

  reset(): void {
    this.lastState = null;
    this.isThinking = false;
  }
}
