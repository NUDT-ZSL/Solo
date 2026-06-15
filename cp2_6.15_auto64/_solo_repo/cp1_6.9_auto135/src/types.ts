export interface Vector2 {
  x: number;
  y: number;
}

export enum Player {
  PLAYER1 = 1,
  PLAYER2 = 2,
}

export enum GamePhase {
  WAITING = 'WAITING',
  LAUNCHING = 'LAUNCHING',
  SCORING = 'SCORING',
  REPLAY = 'REPLAY',
  GAME_OVER = 'GAME_OVER',
}

export interface Probe {
  id: string;
  player: Player;
  position: Vector2;
  velocity: Vector2;
  initialPosition: Vector2;
  radius: number;
  isMoving: boolean;
  inVortex: boolean;
  currentVortexId: string | null;
}

export interface IceFloe {
  id: string;
  position: Vector2;
  size: number;
  rotation: number;
  vertices: Vector2[];
  colorStart: string;
  colorEnd: string;
}

export interface Vortex {
  id: string;
  position: Vector2;
  radius: number;
  rotationSpeed: number;
  rotationAngle: number;
  pullStrength: number;
}

export interface Particle {
  position: Vector2;
  velocity: Vector2;
  life: number;
  maxLife: number;
  size: number;
  maxSize: number;
  color: string;
  opacity: number;
  type: 'trail' | 'collision' | 'vortex' | 'score';
}

export interface ScoreAnimationState {
  player: Player;
  score: number;
  elapsed: number;
  duration: number;
  pulsePhase: number;
  position: Vector2;
  displayedScore: number;
}

export interface VictoryAnimationState {
  winner: Player;
  finalScore1: number;
  finalScore2: number;
  elapsed: number;
  duration: number;
  hueShift: number;
  textProgress: number;
  maskOpacity: number;
}

export interface ReplayFrame {
  probePosition: Vector2;
  probeVelocity: Vector2;
  isMoving: boolean;
  particlesSnapshot: Array<{
    position: Vector2;
    opacity: number;
    size: number;
    color: string;
    life: number;
    maxLife: number;
  }>;
  vortexAngles: Record<string, number>;
}

export interface LaunchSnapshot {
  player: Player;
  probePosition: Vector2;
  scoreBefore: { p1: number; p2: number };
}

export interface AimParams {
  isAiming: boolean;
  startPos: Vector2 | null;
  currentPos: Vector2 | null;
  power: number;
  angle: number;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  boardRadius: number;
  boardCenter: Vector2;
  frictionCoeff: number;
  restitution: number;
  vortexRadius: number;
  probeRadius: number;
  minStopSpeed: number;
  maxAimLength: number;
  maxLaunchSpeed: number;
  scoreZones: Array<{ radius: number; points: number; color: string; alpha: number }>;
  winScore: number;
  iceFloeCount: [number, number];
  vortexCount: [number, number];
}

export interface GameState {
  phase: GamePhase;
  currentPlayer: Player;
  scores: { p1: number; p2: number };
  round: number;
  probes: Probe[];
  currentProbe: Probe | null;
  iceFloes: IceFloe[];
  vortices: Vortex[];
  particles: Particle[];
  trailParticlePool: Particle[];
  collisionParticlePool: Particle[];
  scoreAnimation: ScoreAnimationState | null;
  victoryAnimation: VictoryAnimationState | null;
  aimParams: AimParams;
  replayFrames: ReplayFrame[];
  isReplaying: boolean;
  replayFrameIndex: number;
  replaySpeed: number;
  lastLaunchSnapshot: LaunchSnapshot | null;
  canUndo: boolean;
  lastReplayFrames: ReplayFrame[];
}
