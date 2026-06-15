import { Card } from './card';

export class Player {
  id: number;
  name: string;
  heroEmoji: string;
  maxHealth: number;
  currentHealth: number;
  healthAnimationProgress: number;
  targetHealth: number;
  hand: Card[];
  battlefield: (Card | null)[][];
  maxHandSize: number;
  isCurrentTurn: boolean;
  turnTimer: number;
  turnDuration: number;

  private static heroEmojis = ['🦸', '🧙‍♂️', '👸', '🤴', '🥷', '🧝‍♀️'];

  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
    this.heroEmoji = Player.heroEmojis[id % Player.heroEmojis.length];
    this.maxHealth = 50;
    this.currentHealth = 50;
    this.healthAnimationProgress = 1;
    this.targetHealth = 50;
    this.hand = [];
    this.battlefield = [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ];
    this.maxHandSize = 7;
    this.isCurrentTurn = false;
    this.turnTimer = 30;
    this.turnDuration = 30;
  }

  initializeHand(): void {
    this.hand = Card.generateInitialHand(this.id, 5);
  }

  drawCard(): boolean {
    if (this.hand.length < this.maxHandSize) {
      const newCard = Card.generateRandomCard(this.id);
      this.hand.push(newCard);
      return true;
    }
    return false;
  }

  takeDamage(amount: number): void {
    this.targetHealth = Math.max(0, this.targetHealth - amount);
    this.healthAnimationProgress = 0;
  }

  heal(amount: number): void {
    this.targetHealth = Math.min(this.maxHealth, this.targetHealth + amount);
    this.healthAnimationProgress = 0;
  }

  updateHealthAnimation(deltaTime: number): void {
    if (this.healthAnimationProgress < 1) {
      this.healthAnimationProgress = Math.min(
        this.healthAnimationProgress + deltaTime / 0.4,
        1
      );
      const smoothProgress = this.easeOutCubic(this.healthAnimationProgress);
      this.currentHealth =
        this.currentHealth +
        (this.targetHealth - this.currentHealth) * smoothProgress;
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  isDead(): boolean {
    return this.targetHealth <= 0;
  }

  playCardToBattlefield(card: Card, row: number, col: number): boolean {
    if (this.battlefield[row][col] !== null) {
      return false;
    }
    const handIndex = this.hand.findIndex((c) => c === card);
    if (handIndex === -1) {
      return false;
    }
    this.hand.splice(handIndex, 1);
    card.state = 'inBattle';
    card.battlefieldSlot = { row, col };
    this.battlefield[row][col] = card;
    this.applyCardEffect(card);
    return true;
  }

  private applyCardEffect(card: Card): void {
    switch (card.data.effect) {
      case 'heal':
        this.heal(card.data.effectValue);
        break;
      case 'shield':
        card.currentHealth += card.data.effectValue;
        break;
      case 'charge':
        card.hasAttacked = false;
        break;
    }
  }

  removeDeadCards(): Card[] {
    const deadCards: Card[] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const card = this.battlefield[row][col];
        if (card && card.state === 'dead') {
          deadCards.push(card);
          this.battlefield[row][col] = null;
        }
      }
    }
    return deadCards;
  }

  getAllBattlefieldCards(): Card[] {
    const cards: Card[] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const card = this.battlefield[row][col];
        if (card) {
          cards.push(card);
        }
      }
    }
    return cards;
  }

  getAvailableBattlefieldSlot(): { row: number; col: number } | null {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (this.battlefield[row][col] === null) {
          return { row, col };
        }
      }
    }
    return null;
  }

  resetTurnState(): void {
    const cards = this.getAllBattlefieldCards();
    cards.forEach((card) => {
      card.hasAttacked = false;
      card.resetAttack();
    });
  }

  startTurn(): void {
    this.isCurrentTurn = true;
    this.turnTimer = this.turnDuration;
    this.resetTurnState();
    this.drawCard();
  }

  endTurn(): void {
    this.isCurrentTurn = false;
  }

  updateTurnTimer(deltaTime: number): void {
    if (this.isCurrentTurn) {
      this.turnTimer -= deltaTime;
    }
  }

  isTurnTimeOut(): boolean {
    return this.turnTimer <= 0;
  }
}
