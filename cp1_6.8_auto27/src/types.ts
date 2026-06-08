export enum RuneType {
  Attack = 'attack',
  Defense = 'defense',
  Heal = 'heal',
  Disrupt = 'disrupt',
}

export enum ElementType {
  Fire = 'fire',
  Water = 'water',
  Wind = 'wind',
  Earth = 'earth',
}

export type CardCategory = 'rune' | 'element';

export interface Card {
  id: string;
  name: string;
  category: CardCategory;
  runeType?: RuneType;
  elementType?: ElementType;
  cost: number;
  power: number;
  description: string;
  inkColor: string;
}

export interface Deck {
  id: string;
  name: string;
  runeCardIds: string[];
  elementCardIds: string[];
}

export interface Buff {
  id: string;
  name: string;
  duration: number;
  remainingTurns: number;
  effectType: BuffEffectType;
  value: number;
  sourceCardId: string;
  element?: ElementType;
}

export enum BuffEffectType {
  DamageOverTime = 'dot',
  Shield = 'shield',
  PowerBoost = 'powerBoost',
  PowerReduce = 'powerReduce',
  HealOverTime = 'hot',
  EnergyDrain = 'energyDrain',
  Stun = 'stun',
}

export interface PlayerState {
  hp: number;
  maxHp: number;
  hand: Card[];
  deck: Card[];
  graveyard: Card[];
  buffs: Buff[];
  energy: number;
  maxEnergy: number;
  shield: number;
  isStunned: boolean;
}

export interface EnergyPool {
  playerEnergy: number;
  enemyEnergy: number;
  maxEnergy: number;
}

export enum GamePhase {
  Menu = 'menu',
  DeckBuilder = 'deckBuilder',
  Playing = 'playing',
  GameOver = 'gameOver',
}

export enum TurnPhase {
  Draw = 'draw',
  Play = 'play',
  Resolve = 'resolve',
  EnemyTurn = 'enemyTurn',
}

export interface ComboResult {
  comboName: string;
  bonusDamage: number;
  bonusHeal: number;
  bonusShield: number;
  specialEffect?: string;
  element?: ElementType;
}

export interface FinishingMove {
  name: string;
  description: string;
  baseDamage: number;
  element: ElementType;
  inkColor: string;
}

export interface GameEffect {
  type: 'cardPlay' | 'combo' | 'finishingMove' | 'buffApply' | 'damage' | 'heal' | 'shield';
  position: { x: number; y: number };
  duration: number;
  intensity: number;
  element?: ElementType;
  color: string;
}

export interface GameState {
  phase: GamePhase;
  turnPhase: TurnPhase;
  turn: number;
  player: PlayerState;
  enemy: PlayerState;
  energyPool: EnergyPool;
  lastCombo: ComboResult | null;
  effects: GameEffect[];
  battleLog: string[];
  winner: 'player' | 'enemy' | null;
  isShaking: boolean;
  showFinishingMove: boolean;
  finishingMoveTarget: 'player' | 'enemy' | null;
}

export interface ComboRule {
  name: string;
  runeTypes: RuneType[];
  elements: ElementType[];
  result: Omit<ComboResult, 'element'>;
  description: string;
}

export const MAX_HAND_SIZE = 7;
export const INITIAL_HAND_SIZE = 4;
export const MAX_ENERGY_POOL = 10;
export const PLAYER_MAX_HP = 30;
export const PLAYER_MAX_ENERGY = 5;
export const ENERGY_PER_TURN = 1;
