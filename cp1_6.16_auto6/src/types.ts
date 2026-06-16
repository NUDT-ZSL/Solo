export type EffectType = 'DAMAGE_ALL' | 'HEAL_SELF' | 'BUFF_ATK' | 'DRAW_CARD';

export interface Card {
  id: string;
  name: string;
  cost: number;
  attack: number;
  health: number;
  effectType: EffectType;
  effectValue: number;
  effectName: string;
  description: string;
}

export interface BattleUnit extends Card {
  instanceId: string;
  currentHealth: number;
  currentAttack: number;
  hasAttacked: boolean;
  owner: 'player' | 'ai';
}

export interface Deck {
  id: string;
  name: string;
  cardIds: string[];
  createdAt: number;
}

export interface BattleLogEntry {
  turn: number;
  actor: 'player' | 'ai';
  action: string;
  details: string;
  timestamp: number;
}

export interface BattleRecord {
  id: string;
  playerDeckId: string;
  aiDeckId: string;
  winner: 'player' | 'ai';
  turns: number;
  logs: BattleLogEntry[];
  createdAt: number;
}

export type GamePhase = 'MAIN' | 'COMBAT' | 'END' | 'GAME_OVER';

export type TurnPhase = 'DRAW' | 'MAIN' | 'COMBAT' | 'END';

export interface BattleState {
  turn: number;
  currentPlayer: 'player' | 'ai';
  phase: TurnPhase;
  playerHealth: number;
  aiHealth: number;
  playerMana: number;
  playerMaxMana: number;
  aiMana: number;
  aiMaxMana: number;
  playerHand: Card[];
  aiHand: Card[];
  playerDeck: Card[];
  aiDeck: Card[];
  playerField: BattleUnit[];
  aiField: BattleUnit[];
  selectedHandCard: Card | null;
  selectedFieldUnit: BattleUnit | null;
  pendingEffect: { name: string } | null;
  gameOver: boolean;
  winner: 'player' | 'ai' | null;
  logs: BattleLogEntry[];
}

export type NavigationView = 'deck' | 'battle' | 'history';
