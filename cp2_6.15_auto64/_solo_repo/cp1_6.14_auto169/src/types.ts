export type PlayerId = 'player1' | 'player2' | 'player3' | 'player4' | 'neutral';

export type BuildingType = 'resource' | 'tower' | 'barracks';

export type UnitType = 'infantry';

export interface Building {
  id: string;
  type: BuildingType;
  owner: PlayerId;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  lastProductionTime: number;
  productionInterval: number;
  productionAmount: number;
}

export interface Unit {
  id: string;
  owner: PlayerId;
  type: UnitType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  lastMoveTime: number;
  moveInterval: number;
  path: { x: number; y: number }[];
  targetX: number;
  targetY: number;
  trail: { x: number; y: number; alpha: number; id: string }[];
}

export interface Cell {
  x: number;
  y: number;
  owner: PlayerId;
  building: Building | null;
  unit: Unit | null;
  isResourcePoint: boolean;
}

export interface PlayerState {
  id: PlayerId;
  resources: number;
  territoryCount: number;
  color: string;
  isAI: boolean;
  name: string;
}

export interface LogEntry {
  id: string;
  time: number;
  message: string;
  type: 'info' | 'battle' | 'build' | 'capture';
}

export interface CombatEvent {
  attackerId: string;
  attackerType: 'unit' | 'building';
  defenderId: string;
  defenderType: 'unit' | 'building';
  x: number;
  y: number;
}

export interface CombatResult {
  attackerHp: number;
  defenderHp: number;
  attackerDestroyed: boolean;
  defenderDestroyed: boolean;
  territoryChanged: boolean;
  newOwner: PlayerId | null;
}

export interface GameState {
  grid: Cell[][];
  players: Record<string, PlayerState>;
  units: Map<string, Unit>;
  timeRemaining: number;
  isGameOver: boolean;
  winner: PlayerId | 'draw' | null;
  selectedCell: { x: number; y: number } | null;
  buildMenuCell: { x: number; y: number } | null;
  logs: LogEntry[];
  humanPlayerId: PlayerId;
}

export const GRID_SIZE = 10;
export const GAME_DURATION = 180;
export const HUMAN_PLAYER: PlayerId = 'player1';

export const BUILDING_COSTS: Record<BuildingType, number> = {
  resource: 0,
  tower: 5,
  barracks: 8,
};

export const BARRACKS_UPGRADE_COST = 15;
export const NEUTRAL_RESOURCE_INTERVAL = 5000;
export const NEUTRAL_RESOURCE_AMOUNT = 3;
export const PLAYER_RESOURCE_INTERVAL = 1000;
export const PLAYER_RESOURCE_AMOUNT = 1;
export const BARRACKS_PRODUCTION_INTERVAL_L1 = 10000;
export const BARRACKS_PRODUCTION_INTERVAL_L2 = 6000;
export const UNIT_MOVE_INTERVAL = 2000;
export const NEUTRAL_RESOURCE_POINT_COUNT = 6;

export const PLAYER_COLORS: Record<PlayerId, string> = {
  player1: '#3b82f6',
  player2: '#ef4444',
  player3: '#10b981',
  player4: '#f59e0b',
  neutral: 'rgba(255, 215, 0, 0.8)',
};

export const PLAYER_NAMES: Record<PlayerId, string> = {
  player1: '蓝方',
  player2: '红方',
  player3: '绿方',
  player4: '橙方',
  neutral: '中立',
};
