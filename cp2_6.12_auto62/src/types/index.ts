import { CardData } from '../data/cards';

export interface PlayerProgress {
  unlockedCards: string[];
  fragments: Record<string, number>;
  totalBattles: number;
  totalWins: number;
  totalGalleryViews: number;
  experience: number;
  level: number;
  dailyTasks: DailyTask[];
  lastLoginDate: string;
  consecutiveLogins: number;
}

export interface DailyTask {
  id: string;
  name: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  reward: { type: 'fragment'; cardId?: string; amount: number };
}

export interface BattleState {
  playerCard: CardData;
  enemyCard: CardData;
  playerHp: number;
  enemyHp: number;
  playerMaxHp: number;
  enemyMaxHp: number;
  turn: 'player' | 'enemy';
  phase: 'select' | 'battle' | 'result';
  result?: 'win' | 'lose' | 'draw';
  log: BattleLogEntry[];
}

export interface BattleLogEntry {
  turn: number;
  attacker: string;
  defender: string;
  damage: number;
  isCritical: boolean;
}

export interface AnimatedNumber {
  current: number;
  target: number;
  startTime: number;
  duration: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface Projectile {
  x: number;
  y: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  cp1x: number;
  cp1y: number;
  cp2x: number;
  cp2y: number;
  progress: number;
  duration: number;
  color: string;
  size: number;
}

export type ScreenShake = {
  active: boolean;
  intensity: number;
  duration: number;
  startTime: number;
};
