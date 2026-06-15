export type ParticleType = 'fiber' | 'explosion' | 'pulse' | 'star' | 'confetti';

export interface Particle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
  life: number;
  maxLife: number;
  type: ParticleType;
  pulsePhase: number;
  wobblePhase: number;
  index: number;
  pulseIntensity: number;
}

export interface BezierPoint {
  x: number;
  y: number;
}

export interface DarkMatter {
  id: number;
  x: number;
  y: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  bezierPath: BezierPoint[];
  pathProgress: number;
  speed: number;
  knockbackX: number;
  knockbackY: number;
  knockbackDecay: number;
}

export interface PulseRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  life: number;
  maxLife: number;
  hue: number;
  hitDarkMatters: Set<number>;
}

export interface QuantumNode {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  alpha: number;
  brightTimer: number;
  swingPhase: number;
  swingAmplitude: number;
  swingPeriod: number;
  pulseRings: PulseRing[];
  isTop: boolean;
}

export interface LightPulse {
  distance: number;
  speed: number;
  active: boolean;
  reachedEnd: boolean;
}

export type GameStatus = 'menu' | 'playing' | 'victory' | 'gameover';

export interface GameStateRef {
  score: number;
  lives: number;
  level: number;
  timeLeft: number;
  gameStatus: GameStatus;
  isDrawing: boolean;
  drawStartX: number;
  drawStartY: number;
  currentX: number;
  currentY: number;
  lastMouseX: number;
  lastMouseY: number;
  mouseSpeed: number;
  fiberLength: number;
  fiberParticles: Particle[];
  fiberBrokenIndex: number;
  breakTimer: number;
  breakActive: boolean;
  lightPulse: LightPulse;
  explosionParticles: Particle[];
  darkMatters: DarkMatter[];
  topNode: QuantumNode;
  bottomNode: QuantumNode;
  starParticles: Particle[];
  confettiParticles: Particle[];
  redFlashTimer: number;
  victoryTimer: number;
  width: number;
  height: number;
  mouseX: number;
  mouseY: number;
  crosshairVisible: boolean;
  hoverScore: boolean;
  hoverLives: boolean;
}

export interface GameUIState {
  score: number;
  lives: number;
  level: number;
  timeLeft: number;
  gameStatus: GameStatus;
}
