export interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  breathPhase: number;
  breathSpeed: number;
  constellationId: number | null;
}

export interface Constellation {
  id: number;
  name: string;
  zodiac: string;
  starIds: number[];
}

export interface FortuneAspect {
  icon: string;
  label: string;
  level: string;
  color: string;
}

export interface DivinationResult {
  id: number;
  constellationId: number;
  constellationName: string;
  zodiac: string;
  text: string;
  weather: string;
  date: string;
  timestamp: number;
  fortunes: FortuneAspect[];
  auspicious: string[];
  inauspicious: string[];
}

export interface LogEntry {
  date: string;
  constellationName: string;
  result: string;
}

export interface Firefly {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  vx: number;
  vy: number;
  blinkTimer: number;
  blinkInterval: number;
  isBlinking: boolean;
}

export interface Nebula {
  id: number;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  driftSpeed: number;
  angle: number;
}

export interface BurstParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  color: string;
}
