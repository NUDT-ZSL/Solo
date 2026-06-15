// 游戏全局类型定义

export enum CellType {
  WALL = 'WALL',
  PATH = 'PATH'
}

export enum PistilType {
  RED_SPEED = 'RED_SPEED',
  GREEN_PIERCE = 'GREEN_PIERCE',
  BLUE_MIRROR = 'BLUE_MIRROR'
}

export enum GameStatus {
  PLAYING = 'PLAYING',
  WON = 'WON',
  LOST = 'LOST'
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export interface Cell {
  x: number;
  y: number;
  type: CellType;
  hasLightPoint: boolean;
  pistilType: PistilType | null;
  isStart: boolean;
  isEnd: boolean;
}

export interface MazeData {
  cells: Cell[][];
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  width: number;
  height: number;
}

export interface AbilityState {
  speedBoost: boolean;
  speedBoostTime: number;
  wallPierce: boolean;
  hasMirror: boolean;
  mirrorTime: number;
}

export interface Firefly {
  gridX: number;
  gridY: number;
  lightEnergy: number;
  visualX: number;
  visualY: number;
  lowLight: boolean;
  lowLightTimer: number;
  abilities: AbilityState;
}

export interface MirrorFirefly {
  gridX: number;
  gridY: number;
  visualX: number;
  visualY: number;
  remainTime: number;
}

export interface GameState {
  status: GameStatus;
  loseReason: string | null;
  maze: MazeData;
  firefly: Firefly;
  mirror: MirrorFirefly | null;
  globalTime: number;
  lastMoveDirection: Direction | null;
  moveCooldown: number;
  edgeFlashColor: string | null;
  edgeFlashAlpha: number;
  seedActivated: boolean;
  seedBurstProgress: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  initialSize: number;
}

export interface PulseEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface AfterImage {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
}
