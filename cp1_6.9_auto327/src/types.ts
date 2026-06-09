export interface Point {
  x: number;
  y: number;
}

export interface Fragment {
  id: number;
  vertices: Point[];
  centroid: Point;
  baseColor: HSL;
  currentColor: HSL;
  opacity: number;
  targetOpacity: number;
  hueOffset: number;
  targetHueOffset: number;
  raiseOffset: number;
  targetRaiseOffset: number;
  isHovered: boolean;
  normal: Point;
  area: number;
  neighbors: number[];
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface StainedGlass {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fragments: Fragment[];
  breathPhase: number;
  breathScale: number;
  isMobile: boolean;
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: HSL;
  life: number;
  maxLife: number;
  size: number;
}

export interface Star {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  minOpacity: number;
  maxOpacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

export interface LightPulse {
  glassId: number;
  fragmentId: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  color: HSL;
  active: boolean;
  affectedFragments: Set<number>;
}
