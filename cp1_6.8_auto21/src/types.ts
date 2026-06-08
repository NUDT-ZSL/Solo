export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerState {
  pos: Vec2;
  radius: number;
  speed: number;
}

export interface Fragment {
  id: string;
  pos: Vec2;
  symbol: RuneSymbol;
  collected: boolean;
  scale: number;
  glowPhase: number;
}

export type RuneSymbol =
  | 'triangle'
  | 'circle'
  | 'diamond'
  | 'hexagon'
  | 'star'
  | 'crescent'
  | 'spiral'
  | 'cross';

export interface RuneCombo {
  symbols: RuneSymbol[];
  name: string;
}

export interface DarkEnergySphere {
  id: string;
  pos: Vec2;
  radius: number;
  velocity: Vec2;
  trail: Vec2[];
  pulsePhase: number;
}

export interface PortalState {
  pos: Vec2;
  radius: number;
  rotation: number;
  glowIntensity: number;
  isOpen: boolean;
  openProgress: number;
  beamHeight: number;
}

export interface LevelConfig {
  level: number;
  fragmentCount: number;
  darkEnergyCount: number;
  darkEnergySpeed: number;
  playerEnergy: number;
  combo: RuneCombo;
  terrainVertices: Vec2[];
}

export type GameStatus = 'playing' | 'paused' | 'victory' | 'defeat' | 'levelComplete';

export interface GameUIData {
  energy: number;
  maxEnergy: number;
  collectedFragments: number;
  totalFragments: number;
  currentLevel: number;
  maxLevel: number;
  comboMatched: boolean;
  status: GameStatus;
  comboName: string;
}
