export type Faction = 'blue' | 'red';

export interface GridCoord {
  q: number;
  r: number;
}

export type TurnPhase = 'select' | 'move' | 'attack' | 'ai_thinking' | 'resolving';

export interface Piece {
  id: string;
  faction: Faction;
  position: GridCoord;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  moveRange: number;
  attackRange: number;
  skillCooldown: number;
  isMoving: boolean;
  movePath: GridCoord[];
  moveProgress: number;
  moveStartTime: number;
  attackTargetId: string | null;
  attackPulsePhase: number;
  flowPhase: number;
  hasMoved: boolean;
  hasAttacked: boolean;
}

export interface Afterimage {
  id: string;
  faction: Faction;
  gridQ: number;
  gridR: number;
  worldX: number;
  worldY: number;
  targetPieceId: string | null;
  velocityX: number;
  velocityY: number;
  lifetime: number;
  bouncesLeft: number;
  opacity: number;
}

export interface Fragment {
  id: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  lifetime: number;
  maxLifetime: number;
  opacity: number;
  lastHitTime: number;
}

export interface LightParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifetime: number;
  maxLifetime: number;
  color: string;
  size: number;
}

export interface GameState {
  turnNumber: number;
  currentFaction: Faction;
  phase: TurnPhase;
  selectedPieceId: string | null;
  pieces: Piece[];
  afterimages: Afterimage[];
  fragments: Fragment[];
  particles: LightParticle[];
  validMoves: GridCoord[];
  validAttacks: string[];
  winner: Faction | null;
  showSurrenderModal: boolean;
  modalShakePhase: number;
  hoveredPieceId: string | null;
  time: number;
}

export interface Viewport {
  width: number;
  height: number;
  dpr: number;
  isMobile: boolean;
  scale: number;
  boardCenterX: number;
  boardCenterY: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const GRID_SIZE = 13;
export const RHOMBUS_SIZE = 32;
export const RHOMBUS_SPACING = 4;
export const RHOMBUS_STEP = RHOMBUS_SIZE + RHOMBUS_SPACING;
export const MAX_FRAGMENTS = 300;
export const MAX_AFTERIMAGES = 60;

export const COLORS = {
  deepPurple: '#1B0A2E',
  mirrorSilver: '#2A2D34',
  techBlue: '#4A90D9',
  warningRed: '#D94A4A',
  energyGreen: '#00FF88',
  white: '#FFFFFF',
  gridLine: 'rgba(255,255,255,0.25)',
  gridGlow: 'rgba(74,144,217,0.4)'
} as const;

export const HEX_DIRECTIONS: GridCoord[] = [
  { q: 1, r: 0 },
  { q: -1, r: 0 },
  { q: 0, r: 1 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
  { q: -1, r: 1 },
];

export function gridDistance(a: GridCoord, b: GridCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
}

export function coordKey(c: GridCoord): string {
  return `${c.q},${c.r}`;
}

export function isInBoard(c: GridCoord): boolean {
  return c.q >= 0 && c.q < GRID_SIZE && c.r >= 0 && c.r < GRID_SIZE;
}
