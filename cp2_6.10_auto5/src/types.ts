export interface TrailPoint {
  x: number;
  y: number;
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
  birthTime: number;
  lifetime: number;
}

export interface Cell {
  baseX: number;
  baseY: number;
  currentX: number;
  currentY: number;
  velocityX: number;
  velocityY: number;
  baseHue: number;
  targetHue: number;
  currentHue: number;
  baseSaturation: number;
  targetSaturation: number;
  currentSaturation: number;
  baseLightness: number;
  targetLightness: number;
  currentLightness: number;
  hueTransitionStart: number;
  hueTransitionEnd: number;
  satTransitionStart: number;
  satTransitionEnd: number;
  lightTransitionStart: number;
  lightTransitionEnd: number;
  size: number;
  brownianPhase: number;
  brownianSpeed: number;
  trail: TrailPoint[];
  isExploding: boolean;
  explodeStartTime: number;
  explodeDirectionX: number;
  explodeDirectionY: number;
  explodeDistance: number;
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
}

export interface ColorBurst {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  active: boolean;
}
