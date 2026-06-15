export interface Cell {
  baseX: number;
  baseY: number;
  baseHue: number;
  baseSaturation: number;
  baseLightness: number;
  size: number;
  brownianPhase: number;
  brownianSpeed: number;
  displacementPulses: DisplacementPulse[];
  colorPulses: ColorPulse[];
  isExploding: boolean;
  explodeStartTime: number;
  explodeDirectionX: number;
  explodeDirectionY: number;
  explodeDistance: number;
  cachedX: number;
  cachedY: number;
  cachedHue: number;
  cachedSaturation: number;
  cachedLightness: number;
}

export interface DisplacementPulse {
  dx: number;
  dy: number;
  startTime: number;
  duration: number;
  peakRatio: number;
}

export interface ColorPulse {
  targetHue: number;
  targetSaturation: number;
  targetLightness: number;
  startTime: number;
  riseDuration: number;
  fallDuration: number;
  startHue: number;
  startSaturation: number;
  startLightness: number;
}

export interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
  saturation: number;
  lightness: number;
  birthTime: number;
  lifetime: number;
  size: number;
}

export interface InteractionData {
  type: 'move' | 'down' | 'up';
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  speed: number;
  timestamp: number;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  strength: number;
  startTime: number;
  active: boolean;
  triggered: Set<number>;
}

export interface ColorBurst {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  active: boolean;
}
