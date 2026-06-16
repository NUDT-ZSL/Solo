export interface HeatParams {
  buildingDensity: number;
  greeneryRate: number;
  surfaceAlbedo: number;
}

export interface TemperatureResult {
  matrix: number[][];
  minTemp: number;
  maxTemp: number;
  avgTemp: number;
}

const BASE_TEMPERATURE = 25;
const GRID_SIZE = 6;

export function calculateTemperature(params: HeatParams): TemperatureResult {
  const { buildingDensity, greeneryRate, surfaceAlbedo } = params;

  const densityDelta = ((buildingDensity - 0.5) / 0.1) * 1.5;
  const greeneryDelta = ((greeneryRate - 0.3) / 0.1) * -2;
  const albedoDelta = ((surfaceAlbedo - 0.5) / 0.1) * -0.8;

  const baseTemp = BASE_TEMPERATURE + densityDelta + greeneryDelta + albedoDelta;

  const matrix: number[][] = [];
  let minTemp = Infinity;
  let maxTemp = -Infinity;
  let sumTemp = 0;

  for (let i = 0; i < GRID_SIZE; i++) {
    const row: number[] = [];
    for (let j = 0; j < GRID_SIZE; j++) {
      const randomFluctuation = (Math.random() - 0.5) * 1.0;
      const temp = baseTemp + randomFluctuation;
      row.push(temp);
      if (temp < minTemp) minTemp = temp;
      if (temp > maxTemp) maxTemp = temp;
      sumTemp += temp;
    }
    matrix.push(row);
  }

  return {
    matrix,
    minTemp,
    maxTemp,
    avgTemp: sumTemp / (GRID_SIZE * GRID_SIZE)
  };
}

export function getGridSize(): number {
  return GRID_SIZE;
}
