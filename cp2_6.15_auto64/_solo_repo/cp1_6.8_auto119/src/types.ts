export interface Vec2 {
  x: number;
  y: number;
}

export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type MechanismType = 'lightGate' | 'elevator' | 'teleporter';

export interface Mechanism {
  id: number;
  x: number;
  y: number;
  radius: number;
  type: MechanismType;
  activated: boolean;
  activationAnim: number;
}

export interface PatrolPoint {
  x: number;
  y: number;
}

export interface GuardDef {
  x: number;
  y: number;
  patrol: PatrolPoint[];
}

export interface LevelData {
  walls: Wall[];
  mechanisms: Mechanism[];
  guards: GuardDef[];
  playerStart: Vec2;
  exitPos: Vec2;
  exitRadius: number;
}

export interface GameState {
  level: number;
  energy: number;
  maxEnergy: number;
  detected: boolean;
  mechanismsTotal: number;
  mechanismsActivated: number;
  guards: { x: number; y: number; angle: number; state: string }[];
  playerPos: Vec2;
  levelWalls: Wall[];
  exitPos: Vec2;
  exitRadius: number;
  gameStatus: 'playing' | 'won' | 'lost' | 'levelComplete';
}

export const TILE = 40;
export const WORLD_W = 1200;
export const WORLD_H = 800;
