import { EcosystemConfig, SpeciesType } from './types';

export const JAR_WIDTH = 320;
export const JAR_HEIGHT = 480;
export const SOIL_HEIGHT = 50;
export const PANEL_WIDTH = 120;

export const SPECIES_COLORS: Record<SpeciesType, string> = {
  plant: '#66bb6a',
  fungus: '#efebe9',
  decomposer: '#ffab91'
};

export const SPECIES_NAMES: Record<SpeciesType, string> = {
  plant: '植物',
  fungus: '真菌',
  decomposer: '分解者'
};

export const SPECIES_SIZES: Record<SpeciesType, number> = {
  plant: 28,
  fungus: 22,
  decomposer: 18
};

export const DEFAULT_ENVIRONMENT = {
  light: 500,
  humidity: 60,
  temperature: 25
};

export const DEFAULT_ECOSYSTEM_CONFIG: EcosystemConfig = {
  species: {
    plant: {
      optimalLight: 600,
      optimalHumidity: 60,
      optimalTemperature: 24,
      healthDecayPerTick: 2,
      baseHealthIncrease: 5
    },
    fungus: {
      optimalLight: 200,
      optimalHumidity: 75,
      optimalTemperature: 22,
      healthDecayPerTick: 1.5,
      baseHealthIncrease: 4
    },
    decomposer: {
      optimalLight: 100,
      optimalHumidity: 70,
      optimalTemperature: 28,
      healthDecayPerTick: 1,
      baseHealthIncrease: 3
    }
  },
  relations: [
    { target: 'decomposer', source: 'plant', coefficient: 0.8 },
    { target: 'fungus', source: 'plant', coefficient: 0.3 },
    { target: 'plant', source: 'fungus', coefficient: 0.5 },
    { target: 'decomposer', source: 'fungus', coefficient: 0.4 },
    { target: 'fungus', source: 'decomposer', coefficient: -0.6, threshold: 3 },
    { target: 'plant', source: 'decomposer', coefficient: 0.2 }
  ]
};
