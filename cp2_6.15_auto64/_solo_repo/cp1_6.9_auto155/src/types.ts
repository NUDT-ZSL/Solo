export interface HexCoord {
  q: number;
  r: number;
}

export type HexKey = string;

export const HEX_SIZE = 30;

export const SEAL_COLORS = [
  '#FF4444',
  '#FF8844',
  '#FFCC44',
  '#44FF44',
  '#4444FF',
  '#CC44FF',
] as const;

export type SealColor = (typeof SEAL_COLORS)[number];

export interface HexCell {
  coord: HexCoord;
  walls: [boolean, boolean, boolean, boolean, boolean, boolean];
  sealColor: SealColor | null;
  activated: boolean;
  activatedColor: SealColor | null;
  isExit: boolean;
}

export interface SealPosition {
  coord: HexCoord;
  color: SealColor;
  collected: boolean;
}

export interface MazeData {
  cells: HexCell[];
  radius: number;
  center: HexCoord;
  seals: SealPosition[];
  exitCoord: HexCoord | null;
}

export interface PlayerState {
  coord: HexCoord;
  prevCoord: HexCoord;
  moveProgress: number;
  energy: number;
  stepsUsed: number;
  stepsSinceRotate: number;
}

export type GameScene = 'menu' | 'playing' | 'winning' | 'losing';

export interface Particle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface Ripple {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface CollectBeam {
  id: number;
  x: number;
  y: number;
  angle: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface AnimationState {
  rotating: boolean;
  rotationStartAngle: number;
  rotationTargetAngle: number;
  rotationProgress: number;
  rotationDuration: number;
  currentRotation: number;
  beams: CollectBeam[];
  ripples: Ripple[];
  winRipplesTriggered: boolean;
  winFade: number;
  exitFlashPhase: number;
  sealFlash: boolean;
}
