export interface Position {
  x: number;
  y: number;
}

export interface HeroStats {
  name: string;
  emoji: string;
  cost: number;
  baseAtk: number;
  baseHp: number;
  range: number;
  speed: number;
  isEnemy?: boolean;
}

export type GamePhase = 'prepare' | 'battle' | 'roundEnd' | 'gameOver';

export interface GameState {
  gold: number;
  round: number;
  winStreak: number;
  phase: GamePhase;
  heroes: HeroData[];
  enemies: HeroData[];
  boardHeroes: (HeroData | null)[][];
  selectedHeroId: string | null;
  resultMessage: string | null;
  isVictory: boolean | null;
  boardHeroCount: number;
}

export interface HeroData {
  id: string;
  name: string;
  emoji: string;
  star: number;
  atk: number;
  hp: number;
  maxHp: number;
  range: number;
  speed: number;
  pos: Position | null;
  isEnemy: boolean;
  cost: number;
}
