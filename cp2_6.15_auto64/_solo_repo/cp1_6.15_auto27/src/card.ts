export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type CardState = 'inHand' | 'inBattle' | 'attacking' | 'dead';
export type EffectType = 'attack' | 'heal' | 'shield' | 'charge' | 'taunt';

export interface CardData {
  id: string;
  name: string;
  cost: number;
  attack: number;
  health: number;
  emoji: string;
  rarity: Rarity;
  effect: EffectType;
  effectValue: number;
  description: string;
}

export interface CardPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Card {
  data: CardData;
  position: CardPosition;
  state: CardState;
  owner: number;
  currentHealth: number;
  currentAttack: number;
  hasAttacked: boolean;
  battlefieldSlot: { row: number; col: number } | null;

  private static cardPool: CardData[] = [
    { id: 'c1', name: '小兵', cost: 1, attack: 2, health: 2, emoji: '👤', rarity: 'common', effect: 'attack', effectValue: 0, description: '普通士兵' },
    { id: 'c2', name: '弓箭手', cost: 2, attack: 3, health: 2, emoji: '🏹', rarity: 'common', effect: 'attack', effectValue: 0, description: '远程攻击' },
    { id: 'c3', name: '骑士', cost: 3, attack: 3, health: 4, emoji: '🛡️', rarity: 'rare', effect: 'shield', effectValue: 2, description: '护盾+2' },
    { id: 'c4', name: '法师', cost: 4, attack: 4, health: 3, emoji: '🧙', rarity: 'rare', effect: 'attack', effectValue: 2, description: '法术强化' },
    { id: 'c5', name: '牧师', cost: 3, attack: 2, health: 3, emoji: '⛪', rarity: 'rare', effect: 'heal', effectValue: 3, description: '治疗3点' },
    { id: 'c6', name: '狂战士', cost: 5, attack: 6, health: 4, emoji: '⚔️', rarity: 'epic', effect: 'charge', effectValue: 0, description: '冲锋入场' },
    { id: 'c7', name: '守卫', cost: 4, attack: 2, health: 7, emoji: '🏰', rarity: 'epic', effect: 'taunt', effectValue: 0, description: '嘲讽' },
    { id: 'c8', name: '龙骑士', cost: 6, attack: 7, health: 7, emoji: '🐉', rarity: 'legendary', effect: 'attack', effectValue: 3, description: '传说巨龙' },
    { id: 'c9', name: '刺客', cost: 2, attack: 4, health: 1, emoji: '🗡️', rarity: 'rare', effect: 'attack', effectValue: 0, description: '高攻低防' },
    { id: 'c10', name: '治疗师', cost: 2, attack: 1, health: 4, emoji: '💚', rarity: 'common', effect: 'heal', effectValue: 2, description: '治疗2点' },
    { id: 'c11', name: '巨人', cost: 7, attack: 8, health: 8, emoji: '👹', rarity: 'legendary', effect: 'attack', effectValue: 0, description: '远古巨人' },
    { id: 'c12', name: '精灵', cost: 1, attack: 1, health: 3, emoji: '🧝', rarity: 'common', effect: 'shield', effectValue: 1, description: '灵巧闪避' },
  ];

  constructor(data: CardData, owner: number) {
    this.data = { ...data };
    this.position = { x: 0, y: 0, width: 100, height: 140 };
    this.state = 'inHand';
    this.owner = owner;
    this.currentHealth = data.health;
    this.currentAttack = data.attack;
    this.hasAttacked = false;
    this.battlefieldSlot = null;
  }

  static generateRandomCard(owner: number): Card {
    const idx = Math.floor(Math.random() * Card.cardPool.length);
    return new Card(Card.cardPool[idx], owner);
  }

  static generateInitialHand(owner: number, count: number): Card[] {
    const hand: Card[] = [];
    for (let i = 0; i < count; i++) {
      hand.push(Card.generateRandomCard(owner));
    }
    return hand;
  }

  static getRarityColor(rarity: Rarity): string {
    switch (rarity) {
      case 'common': return '#ffffff';
      case 'rare': return '#4a90e2';
      case 'epic': return '#a855f7';
      case 'legendary': return '#f59e0b';
    }
  }

  static getEffectIcon(effect: EffectType): string {
    switch (effect) {
      case 'attack': return '⚔️';
      case 'heal': return '💚';
      case 'shield': return '🛡️';
      case 'charge': return '⚡';
      case 'taunt': return '🎯';
    }
  }

  containsPoint(px: number, py: number): boolean {
    return (
      px >= this.position.x &&
      px <= this.position.x + this.position.width &&
      py >= this.position.y &&
      py <= this.position.y + this.position.height
    );
  }

  takeDamage(amount: number): void {
    this.currentHealth -= amount;
    if (this.currentHealth <= 0) {
      this.currentHealth = 0;
      this.state = 'dead';
    }
  }

  resetAttack(): void {
    this.state = 'inBattle';
  }
}
