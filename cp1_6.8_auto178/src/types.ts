export interface Vec2 {
  x: number;
  y: number;
}

export type LightColor = 'white' | 'red' | 'green' | 'blue';

export interface Mirror {
  id: string;
  center: Vec2;
  length: number;
  thickness: number;
  angle: number;
  targetAngle: number;
  angularVelocity: number;
  colorFilter?: LightColor;
  isAutoRotating: boolean;
  autoRotateSpeed: number;
  isDragging: boolean;
  isHighlighted: boolean;
  glowIntensity: number;
  vertices: Vec2[];
}

export interface LightSource {
  position: Vec2;
  direction: number;
  color: LightColor;
}

export interface Core {
  id: string;
  position: Vec2;
  radius: number;
  requiredColor: LightColor;
  isActivated: boolean;
  activationTime: number;
  pulsePhase: number;
}

export interface Wall {
  start: Vec2;
  end: Vec2;
}

export interface LightSegment {
  start: Vec2;
  end: Vec2;
  color: LightColor;
  intensity: number;
}

export interface Particle {
  position: Vec2;
  velocity: Vec2;
  alpha: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  isConverging: boolean;
  target?: Vec2;
}

export interface LightWave {
  center: Vec2;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export interface Level {
  id: number;
  name: string;
  lightSource: LightSource;
  mirrors: Mirror[];
  cores: Core[];
  walls: Wall[];
  par: number;
  hintMirrorId: string;
}

export interface GameState {
  currentLevelIndex: number;
  steps: number;
  isLevelComplete: boolean;
  isGameComplete: boolean;
  isShowingHint: boolean;
  lightSegments: LightSegment[];
  particles: Particle[];
  lightWaves: LightWave[];
  time: number;
  levelCompleteTime: number;
  score: number[];
}

export const GAME_WIDTH = 1200;
export const GAME_HEIGHT = 800;

export const COLOR_MAP: Record<LightColor, string> = {
  white: '#e0e8ff',
  red: '#ff3366',
  green: '#33ff99',
  blue: '#3399ff',
};

export const COLOR_GLOW: Record<LightColor, string> = {
  white: '#88aaff',
  red: '#ff1144',
  green: '#11ff66',
  blue: '#1166ff',
};

export const MIRROR_SURFACE_COLOR = 'rgba(100, 200, 255, 0.25)';
export const MIRROR_EDGE_COLOR = 'rgba(100, 200, 255, 0.8)';
