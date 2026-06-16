export type SpeciesType = 'plant' | 'fungus' | 'decomposer';

export interface Organism {
  id: string;
  species: SpeciesType;
  x: number;
  y: number;
  health: number;
  isNew: boolean;
}

export interface EnvironmentParams {
  light: number;
  humidity: number;
  temperature: number;
}

export interface SpeciesRelation {
  target: SpeciesType;
  source: SpeciesType;
  coefficient: number;
  threshold?: number;
}

export interface SpeciesConfig {
  optimalLight: number;
  optimalHumidity: number;
  optimalTemperature: number;
  healthDecayPerTick: number;
  baseHealthIncrease: number;
}

export interface EcosystemConfig {
  species: Record<SpeciesType, SpeciesConfig>;
  relations: SpeciesRelation[];
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}
