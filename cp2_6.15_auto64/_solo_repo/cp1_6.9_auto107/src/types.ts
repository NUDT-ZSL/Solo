export interface Vec2 {
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  time: number;
  width: number;
  color: string;
}

export interface Car {
  x: number;
  y: number;
  angle: number;
  speed: number;
  targetSpeed: number;
  trailIndex: number;
  lives: number;
  isBlinking: boolean;
  blinkTime: number;
  combo: number;
}

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  direction: 1 | -1;
  hit: boolean;
  hitTime: number;
  pulse: number;
}

export interface ScoreZone {
  id: number;
  x: number;
  y: number;
  radius: number;
  activated: boolean;
  activationTime: number;
  pulse: number;
}

export interface AudioManager {
  ctx: AudioContext | null;
  engineOsc: OscillatorNode | null;
  engineGain: GainNode | null;
}

export type GameStatus = 'start' | 'playing' | 'paused' | 'gameover';

export interface GameState {
  status: GameStatus;
  canvasWidth: number;
  canvasHeight: number;
  trackX1: number;
  trackX2: number;
  car: Car;
  trail: TrailPoint[];
  particles: Particle[];
  obstacles: Obstacle[];
  scoreZones: ScoreZone[];
  score: number;
  elapsedTime: number;
  bgColorStart: [number, number, number];
  bgColorEnd: [number, number, number];
  obstacleSpawnTimer: number;
  obstacleSpawnInterval: number;
  mousePos: Vec2;
  isDrawing: boolean;
  obstacleIdCounter: number;
  zoneIdCounter: number;
  audio: AudioManager;
}
