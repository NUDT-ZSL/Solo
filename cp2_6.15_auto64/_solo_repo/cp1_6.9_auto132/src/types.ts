export type ModuleType = 'harvester' | 'tower' | 'portal' | 'shield';

export interface HexCoord {
  q: number;
  r: number;
}

export interface EnergyFlowRecord {
  timestamp: number;
  value: number;
}

export interface GameModule {
  id: string;
  type: ModuleType;
  level: number;
  coord: HexCoord;
  storedEnergy: number;
  inputEnergy: EnergyFlowRecord[];
  outputEnergy: EnergyFlowRecord[];
  placementTime: number;
  pulsePhase: number;
  rotationPhase: number;
  isWarning: boolean;
  warningStartTime: number | null;
  energy: number;
}

export interface HexCell {
  coord: HexCoord;
  module: GameModule | null;
  isShadow: boolean;
  shadowBrightness: number;
  shadowTransitionStart: number | null;
  isShieldProtected: boolean;
  isCore: boolean;
}

export interface Particle {
  id: string;
  fromCoord: HexCoord;
  toCoord: HexCoord;
  progress: number;
  speed: number;
  color: string;
  opacity: number;
  energyValue: number;
  priority: number;
}

export interface ConnectionLine {
  from: HexCoord;
  to: HexCoord;
  isActive: boolean;
  color: string;
}

export interface ShadowBlock {
  id: string;
  cells: HexCoord[];
  startTime: number;
  direction: { dq: number; dr: number };
  lastSpreadTime: number;
}

export interface ShieldPulse {
  coord: HexCoord;
  startTime: number;
  duration: number;
  maxRadius: number;
}

export interface WarningGlow {
  startTime: number;
  duration: number;
}

export interface GameState {
  grid: Map<string, HexCell>;
  modules: Map<string, GameModule>;
  particles: Particle[];
  shadowBlocks: ShadowBlock[];
  shieldPulses: ShieldPulse[];
  warningGlows: WarningGlow[];
  energy: number;
  moduleCredits: number;
  currentLevel: number;
  survivalTime: number;
  invasionsRepelled: number;
  isGameOver: boolean;
  lastShadowSpawnTime: number;
  coreCoveredStartTime: number | null;
  totalShadowCells: number;
  selectedCell: HexCoord | null;
  hoveredModule: GameModule | null;
  hexSize: number;
  canvasWidth: number;
  canvasHeight: number;
  lastHarvestTime: number;
  lastTowerUpgradeTime: number;
  energyLoopCheckTime: number;
  animations: Map<string, { startTime: number; duration: number; type: string }>;
}

export interface GameConfig {
  gridWidth: number;
  gridHeight: number;
  hexSize: number;
  initialEnergy: number;
  initialCredits: number;
  harvestInterval: number;
  harvestAmount: number;
  towerUpgradeInterval: number;
  towerUpgradeCost: number;
  towerMaxLevel: number;
  moduleMaxLevel: number;
  moduleUpgradeCost: number;
  shadowSpawnInterval: number;
  shadowSpreadInterval: number;
  coreCoverLimit: number;
  halfGridThreshold: number;
  particleSpeedLow: number;
  particleSpeedMid: number;
  particleSpeedHigh: number;
  maxParticles: number;
  warningFrequency: number;
  loopThreshold: number;
  repelEnergyReward: number;
  repelCreditReward: number;
}

export const MODULE_COLORS: Record<ModuleType, string> = {
  harvester: '#FFA500',
  tower: '#FF00FF',
  portal: '#00FFFF',
  shield: '#87CEEB'
};

export const CONNECTION_COLORS: Record<string, string> = {
  'harvester-tower': '#FFA500',
  'tower-harvester': '#FFA500',
  'tower-portal': '#FF00FF',
  'portal-tower': '#FF00FF',
  'portal-shield': '#00FFFF',
  'shield-portal': '#00FFFF',
  'harvester-harvester': '#FFD700',
  'tower-tower': '#DA70D6',
  'portal-portal': '#00CED1',
  'shield-shield': '#ADD8E6',
  'harvester-portal': '#ADFF2F',
  'portal-harvester': '#ADFF2F',
  'harvester-shield': '#FFDEAD',
  'shield-harvester': '#FFDEAD',
  'tower-shield': '#E6E6FA',
  'shield-tower': '#E6E6FA'
};

export const DEFAULT_CONFIG: GameConfig = {
  gridWidth: 10,
  gridHeight: 10,
  hexSize: 30,
  initialEnergy: 10,
  initialCredits: 2,
  harvestInterval: 1500,
  harvestAmount: 1,
  towerUpgradeInterval: 2000,
  towerUpgradeCost: 1,
  towerMaxLevel: 10,
  moduleMaxLevel: 5,
  moduleUpgradeCost: 3,
  shadowSpawnInterval: 8000,
  shadowSpreadInterval: 3000,
  coreCoverLimit: 5000,
  halfGridThreshold: 50,
  particleSpeedLow: 200,
  particleSpeedMid: 400,
  particleSpeedHigh: 600,
  maxParticles: 200,
  warningFrequency: 2,
  loopThreshold: 3000,
  repelEnergyReward: 5,
  repelCreditReward: 1
};
