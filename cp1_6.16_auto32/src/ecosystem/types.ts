export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface SpeciesBase {
  id: string;
  name: string;
  speciesType: 'coral' | 'fish' | 'plant';
  position: Position;
  health: number;
  age: number;
  growthRate: number;
}

export interface Coral extends SpeciesBase {
  speciesType: 'coral';
  coralType: 'branching' | 'brain' | 'leaf';
  color: string;
  size: number;
  coverage: number;
  symbionts: string[];
}

export interface Fish extends SpeciesBase {
  speciesType: 'fish';
  schoolId: string;
  size: number;
  speed: number;
  direction: Position;
  predator: boolean;
  diet: string[];
}

export interface Plant extends SpeciesBase {
  speciesType: 'plant';
  plantType: 'kelp' | 'seaweed' | 'seagrass';
  height: number;
}

export type Species = Coral | Fish | Plant;

export interface EnvironmentParams {
  lightIntensity: number;
  currentSpeed: number;
  nutrientLevel: number;
  temperature: number;
}

export interface EcoMetrics {
  biodiversity: number;
  populationDensity: number;
  waterHealth: number;
  coralCoverage: number;
}

export interface EcoEvent {
  id: string;
  type: 'alert' | 'prosperity' | 'warning' | 'info';
  message: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface Boid {
  position: Position;
  velocity: Position;
  acceleration: Position;
}

export interface School {
  id: string;
  name: string;
  fishIds: string[];
  center: Position;
  averageVelocity: Position;
  boids: Boid[];
  color: string;
}

export interface Symbiosis {
  speciesA: string;
  speciesB: string;
  type: 'mutualism' | 'commensalism' | 'parasitism';
  benefitMultiplier: number;
}

export interface EcosystemState {
  species: Map<string, Species>;
  schools: Map<string, School>;
  environment: EnvironmentParams;
  metrics: EcoMetrics;
  events: EcoEvent[];
  symbioses: Symbiosis[];
  currentField: Position[][];
}
