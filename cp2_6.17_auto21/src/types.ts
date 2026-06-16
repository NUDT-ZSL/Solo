export interface Submarine {
  x: number;
  y: number;
  angle: number;
  speed: number;
}

export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Mineral {
  x: number;
  y: number;
  radius: number;
  color: string;
  pulsePhase: number;
  pulseSpeed: number;
  collected: boolean;
  collectProgress: number;
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
  active: boolean;
}

export interface SonarPulse {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  opacity: number;
  reflections: SonarReflection[];
  startTime: number;
  active: boolean;
}

export interface SonarReflection {
  x: number;
  y: number;
  radius: number;
  dx: number;
  dy: number;
  normalX: number;
  normalY: number;
  hasReturned: boolean;
  active: boolean;
  collidedWallIndex: number;
  travelDistance: number;
}

export interface GameState {
  submarine: Submarine;
  score: number;
  depth: number;
}

export interface Keys {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  space: boolean;
}
