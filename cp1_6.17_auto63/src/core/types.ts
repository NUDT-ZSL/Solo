export enum StarStage {
  PROTOSTAR = 'protostar',
  MAIN_SEQUENCE = 'mainSequence',
  RED_GIANT = 'redGiant',
  SUPERGIANT = 'supergiant',
  SUPERNOVA = 'supernova',
  PLANETARY_NEBULA = 'planetaryNebula',
  WHITE_DWARF = 'whiteDwarf',
  NEUTRON_STAR = 'neutronStar',
  BLACK_HOLE = 'blackHole',
}

export interface StarParams {
  mass: number;
  radius: number;
  temperature: number;
  luminosity: number;
  stage: StarStage;
  age: number;
  color: string;
  scale: number;
}

export interface StageData {
  stage: StarStage;
  duration: number;
  startRadius: number;
  endRadius: number;
  startTemp: number;
  endTemp: number;
  startLuminosity: number;
  endLuminosity: number;
  color: string;
  scale: number;
}

export interface StarPreset {
  mass: number;
  name: string;
  stages: StageData[];
  remnant: StarStage.WHITE_DWARF | StarStage.NEUTRON_STAR | StarStage.BLACK_HOLE;
  explosionType: StarStage.SUPERNOVA | StarStage.PLANETARY_NEBULA;
}

export interface ComparisonStar {
  mass: number;
  temperature: number;
  luminosity: number;
  name: string;
  color: string;
}

export interface ParticleData {
  position: Float32Array;
  velocity: Float32Array;
  color: Float32Array;
  life: Float32Array;
  maxLife: number;
}

export type EngineEvent = 'paramsUpdate' | 'explosion' | 'stageChange' | 'click';

export interface StarEngineEvents {
  paramsUpdate: (params: StarParams) => void;
  explosion: (type: StarStage.SUPERNOVA | StarStage.PLANETARY_NEBULA) => void;
  stageChange: (stage: StarStage, stageName: string) => void;
  click: () => void;
}

export const STAGE_NAMES: Record<StarStage, string> = {
  [StarStage.PROTOSTAR]: '原恒星',
  [StarStage.MAIN_SEQUENCE]: '主序星',
  [StarStage.RED_GIANT]: '红巨星',
  [StarStage.SUPERGIANT]: '超巨星',
  [StarStage.SUPERNOVA]: '超新星',
  [StarStage.PLANETARY_NEBULA]: '行星状星云',
  [StarStage.WHITE_DWARF]: '白矮星',
  [StarStage.NEUTRON_STAR]: '中子星',
  [StarStage.BLACK_HOLE]: '黑洞',
};

export const REMNANT_COLORS: Record<StarStage, string> = {
  [StarStage.PROTOSTAR]: '#FFD700',
  [StarStage.MAIN_SEQUENCE]: '#FFD700',
  [StarStage.RED_GIANT]: '#FF6347',
  [StarStage.SUPERGIANT]: '#FF4500',
  [StarStage.SUPERNOVA]: '#FFA500',
  [StarStage.PLANETARY_NEBULA]: '#00D9FF',
  [StarStage.WHITE_DWARF]: '#E0E0E0',
  [StarStage.NEUTRON_STAR]: '#8A2BE2',
  [StarStage.BLACK_HOLE]: '#000000',
};
