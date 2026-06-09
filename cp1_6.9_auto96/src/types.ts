export interface Vector2 {
  x: number;
  y: number;
}

export interface TreeNode {
  id: string;
  position: Vector2;
  depth: number;
  connections: string[];
  width: number;
  explored: boolean;
  isRoot?: boolean;
  isTip?: boolean;
}

export interface TreeBranch {
  id: string;
  from: string;
  to: string;
  thickness: number;
  curvePoints: Vector2[];
  shrinkFactor: number;
  isActive: boolean;
}

export interface MemoryCrystal {
  id: string;
  position: Vector2;
  radius: number;
  color: string;
  collected: boolean;
  collectProgress: number;
  attachedNodeId: string | null;
  rotation: number;
}

export interface Particle {
  id: string;
  position: Vector2;
  velocity: Vector2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'collect' | 'trail' | 'storm' | 'ambient';
}

export interface PlayerState {
  position: Vector2;
  velocity: Vector2;
  facing: Vector2;
  speed: number;
  trail: { position: Vector2; life: number }[];
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  touchStart: Vector2 | null;
  touchCurrent: Vector2 | null;
}

export interface GameState {
  phase: 'playing' | 'storm' | 'dreamscape' | 'transition';
  crystalsCollected: number;
  totalCrystalsCollected: number;
  nodesExplored: number;
  stormTimer: number;
  dreamscapeTimer: number;
  transitionTimer: number;
  dreamscapeTreeClicks: number;
  redFlashTimer: number;
}

export type CrystalColor = '#FFB347' | '#9B59B6' | '#3498DB';

export const CRYSTAL_COLORS: CrystalColor[] = ['#FFB347', '#9B59B6', '#3498DB'];

export interface RenderData {
  nodes: TreeNode[];
  branches: TreeBranch[];
  crystals: MemoryCrystal[];
  particles: Particle[];
  player: PlayerState;
  gameState: GameState;
  cameraY: number;
  canvasWidth: number;
  canvasHeight: number;
  time: number;
}
