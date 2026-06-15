export type PlayerId = 'red' | 'blue';

export type UnitType = 'attack_tower' | 'ice_tower' | 'fast_unit' | 'heavy_unit';

export type GameStatus = 'waiting' | 'playing' | 'ended';

export interface HexCoord {
  q: number;
  r: number;
}

export interface Base {
  owner: PlayerId;
  position: HexCoord;
  hp: number;
  maxHp: number;
}

export interface Crystal {
  owner: 'neutral' | PlayerId;
  position: HexCoord;
  captureProgress: number;
  capturingPlayer: PlayerId | null;
  captureStartTime: number | null;
}

export interface UnitStats {
  maxHp: number;
  attack: number;
  speed: number;
  range: number;
  attackCooldown: number;
  slowEffect?: number;
  slowDuration?: number;
}

export interface Unit {
  id: string;
  type: UnitType;
  owner: PlayerId;
  position: HexCoord;
  pixelX: number;
  pixelY: number;
  hp: number;
  maxHp: number;
  stats: UnitStats;
  target: string | null;
  path: HexCoord[];
  attackTimer: number;
  isAttacking: boolean;
  attackFlashTimer: number;
  slowTimer: number;
  slowAmount: number;
  spawnAnimTimer: number;
  trail: { x: number; y: number; life: number }[];
}

export interface Tower {
  id: string;
  type: 'attack_tower' | 'ice_tower';
  owner: PlayerId;
  position: HexCoord;
  hp: number;
  maxHp: number;
  stats: UnitStats;
  target: string | null;
  attackTimer: number;
  attackFlashTimer: number;
  spawnAnimTimer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  gridSize: number;
  crystal: Crystal;
  bases: Record<PlayerId, Base>;
  units: Unit[];
  towers: Tower[];
  particles: Particle[];
  timeRemaining: number;
  scores: Record<PlayerId, number>;
  status: GameStatus;
  winner: PlayerId | 'draw' | null;
  tick: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  wins: number;
  losses: number;
  winRate: number;
}

export type ClientMessage =
  | { type: 'join_game'; gameId: string; playerName: string; playerId: PlayerId }
  | { type: 'build_unit'; playerId: PlayerId; unitType: UnitType }
  | { type: 'surrender'; playerId: PlayerId };

export type ServerMessage =
  | { type: 'game_state'; state: GameState }
  | { type: 'game_over'; winner: PlayerId | 'draw'; stats: LeaderboardEntry[] }
  | { type: 'unit_spawned'; unit: Unit }
  | { type: 'unit_died'; unitId: string };

export interface MatchQueueResponse {
  queueId: string;
  status: 'waiting' | 'matched' | 'failed';
  gameId?: string;
  playerId?: PlayerId;
}

export interface MatchResultRequest {
  gameId: string;
  playerName: string;
  won: boolean;
  duration: number;
}
