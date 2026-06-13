export type CardType = 'attack' | 'defense' | 'summon';

export interface Card {
  id: string;
  type: CardType;
  name: string;
  description: string;
  value: number;
  value2?: number;
  cost: number;
}

export interface Unit {
  id: string;
  owner: 'player' | 'ai';
  attack: number;
  health: number;
  maxHealth: number;
  hasAttacked: boolean;
}

export interface Hero {
  health: number;
  maxHealth: number;
  shield: number;
}

export interface PlayerState {
  hero: Hero;
  hand: Card[];
  deck: Card[];
  field: Unit[];
}

export interface GameState {
  turn: number;
  currentPlayer: 'player' | 'ai';
  phase: 'start' | 'playing' | 'end';
  player: PlayerState;
  ai: PlayerState;
  battleLog: LogEntry[];
  winner: 'player' | 'ai' | null;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  actor: 'player' | 'ai';
  message: string;
}

export interface GameRecord {
  _id?: string;
  startTime: string;
  endTime: string;
  winner: 'player' | 'ai';
  playerRemainingHealth: number;
  aiRemainingHealth: number;
  totalTurns: number;
  playerStats: {
    totalDamage: number;
    totalShield: number;
    unitsKilled: number;
  };
}

export interface AIConfig {
  thinkTimeMs: number;
  attackUnitPriority: number;
  lowHealthThreshold: number;
  defenseUrgencyWeight: number;
  summonWhenNoUnitBonus: number;
}

export interface GameStats {
  totalDamage: number;
  totalShield: number;
  unitsKilled: number;
  totalTurns: number;
}

export interface Action {
  card: Card;
  targetId?: string;
  targetType: 'hero' | 'unit';
}

export type Target = {
  type: 'hero' | 'unit';
  owner: 'player' | 'ai';
  id?: string;
};
