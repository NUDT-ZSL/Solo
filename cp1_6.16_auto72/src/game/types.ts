export enum CellType {
  EMPTY = 0,
  WALL = 1,
  TRAP_SPIKE = 2,
  TRAP_ROCK = 3,
  TRAP_POISON = 4,
  EXIT = 5,
}

export enum Direction {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
}

export interface Position {
  x: number;
  y: number;
}

export interface TrapInfo {
  position: Position;
  type: CellType.TRAP_SPIKE | CellType.TRAP_ROCK | CellType.TRAP_POISON;
  revealed: boolean;
  highlightUntil: number;
}

export interface MapData {
  grid: CellType[][];
  width: number;
  height: number;
  exitPosition: Position;
  traps: TrapInfo[];
  walls: Position[];
}

export interface PlayerState {
  position: Position;
  direction: Direction;
  health: number;
  maxHealth: number;
  steps: number;
  flashbangs: number;
  maxFlashbangs: number;
  echoScans: number;
  maxEchoScans: number;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export type VisibilityLevel = 'hidden' | 'permanent' | 'flash' | 'echo';

export interface CellVisibility {
  level: VisibilityLevel;
  flashUntil: number;
  echoUntil: number;
}

export interface PerceptionResult {
  cells: Position[];
  traps: Position[];
  walls: Position[];
}

export interface PlayerStatus {
  health: number;
  maxHealth: number;
  flashbangs: number;
  maxFlashbangs: number;
  echoScans: number;
  maxEchoScans: number;
  flashCooldown: number;
  echoCooldown: number;
}

export interface RenderData {
  player: PlayerState;
  map: MapData;
  visibility: CellVisibility[][];
  status: GameStatus;
  screenShakeUntil: number;
  trapHighlightPositions: Position[];
  activeEffects: {
    flashCells: Position[];
    echoCells: Position[];
    flashExpireAt: number;
    echoExpireAt: number;
  };
}

export interface SaveRecord {
  id: string;
  playerName: string;
  steps: number;
  level: number;
  timestamp: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  steps: number;
  level: number;
  timestamp: number;
}
