import { Card } from '../api/configApi';

export type Turn = 'player' | 'ai';

export interface PlayerState {
  hp: number;
  maxHp: number;
  shield: number;
  energy: number;
  maxEnergy: number;
  hand: Card[];
  deck: Card[];
  discard: Card[];
}

export interface GameState {
  player: PlayerState;
  ai: PlayerState;
  turn: Turn;
  turnCount: number;
  gameOver: boolean;
  winner: Turn | null;
  lastPlayedCard: { card: Card; by: Turn } | null;
}

const MAX_HP = 50;
const INITIAL_ENERGY = 3;
const MAX_ENERGY = 10;
const INITIAL_HAND_SIZE = 5;
const MAX_HAND_SIZE = 10;

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function assignInstanceIds(cards: Card[]): Card[] {
  return cards.map(card => ({ ...card, instanceId: generateId() }));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class GameEngine {
  state: GameState;
  private listeners: Set<() => void> = new Set();

  constructor(fullDeck: Card[]) {
    this.state = this.createInitialState(fullDeck);
  }

  private createInitialState(fullDeck: Card[]): GameState {
    const pDeck = shuffle(assignInstanceIds(fullDeck));
    const aDeck = shuffle(assignInstanceIds(fullDeck));

    const pHand = pDeck.splice(0, INITIAL_HAND_SIZE);
    const aHand = aDeck.splice(0, INITIAL_HAND_SIZE);

    return {
      player: {
        hp: MAX_HP,
        maxHp: MAX_HP,
        shield: 0,
        energy: INITIAL_ENERGY,
        maxEnergy: INITIAL_ENERGY,
        hand: pHand,
        deck: pDeck,
        discard: []
      },
      ai: {
        hp: MAX_HP,
        maxHp: MAX_HP,
        shield: 0,
        energy: INITIAL_ENERGY,
        maxEnergy: INITIAL_ENERGY,
        hand: aHand,
        deck: aDeck,
        discard: []
      },
      turn: 'player',
      turnCount: 1,
      gameOver: false,
      winner: null,
      lastPlayedCard: null
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(l => l());
  }

  private drawCards(who: Turn, count: number): void {
    const s = this.state[who];
    for (let i = 0; i < count; i++) {
      if (s.hand.length >= MAX_HAND_SIZE) break;
      if (s.deck.length === 0) {
        if (s.discard.length === 0) break;
        s.deck = shuffle(s.discard);
        s.discard = [];
      }
      const card = s.deck.shift();
      if (card) s.hand.push(card);
    }
  }

  playCard(who: Turn, instanceId: string): Card | null {
    if (this.state.gameOver || this.state.turn !== who) return null;
    const attacker = this.state[who];
    const defender = this.state[who === 'player' ? 'ai' : 'player'];
    const idx = attacker.hand.findIndex(c => c.instanceId === instanceId);
    if (idx === -1) return null;
    const card = attacker.hand[idx];
    if (card.cost > attacker.energy) return null;

    attacker.energy -= card.cost;
    attacker.hand.splice(idx, 1);
    attacker.discard.push(card);

    if (card.damage > 0) {
      let dmg = card.damage;
      if (defender.shield > 0) {
        const absorbed = Math.min(defender.shield, dmg);
        defender.shield -= absorbed;
        dmg -= absorbed;
      }
      defender.hp = Math.max(0, defender.hp - dmg);
    }
    if (card.defense > 0) {
      attacker.shield += card.defense;
    }
    if (card.energy > 0) {
      attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + card.energy);
    }

    this.state.lastPlayedCard = { card, by: who };
    this.checkGameOver();
    this.notify();
    return card;
  }

  endTurn(): void {
    if (this.state.gameOver) return;
    this.state.turn = this.state.turn === 'player' ? 'ai' : 'player';
    if (this.state.turn === 'player') {
      this.state.turnCount++;
    }
    const cur = this.state[this.state.turn];
    cur.maxEnergy = Math.min(MAX_ENERGY, cur.maxEnergy + 1);
    cur.energy = cur.maxEnergy;
    this.drawCards(this.state.turn, 1);
    this.notify();
  }

  private checkGameOver(): void {
    if (this.state.player.hp <= 0) {
      this.state.gameOver = true;
      this.state.winner = 'ai';
    } else if (this.state.ai.hp <= 0) {
      this.state.gameOver = true;
      this.state.winner = 'player';
    }
  }

  canPlayCard(who: Turn, instanceId: string): boolean {
    if (this.state.gameOver || this.state.turn !== who) return false;
    const card = this.state[who].hand.find(c => c.instanceId === instanceId);
    return !!card && card.cost <= this.state[who].energy;
  }
}
