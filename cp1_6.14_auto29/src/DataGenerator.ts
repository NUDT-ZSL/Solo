export interface BuildingData {
  x: number;
  z: number;
  height: number;
  intensity: number;
  colorTemp: number;
}

const MAX_BUILDINGS = 400;
const MAX_PARTICLES = 5000;
const MAX_POLYGONS = 500000;

export function getPerformanceLimits() {
  return { MAX_BUILDINGS, MAX_PARTICLES, MAX_POLYGONS };
}

export class DataGenerator {
  private gridW: number;
  private gridH: number;
  private data: BuildingData[] = [];

  constructor(gridW: number, gridH: number) {
    const total = gridW * gridH;
    if (total > MAX_BUILDINGS) {
      this.gridW = Math.floor(Math.sqrt(MAX_BUILDINGS));
      this.gridH = this.gridW;
    } else {
      this.gridW = gridW;
      this.gridH = gridH;
    }
    this.generate();
  }

  private generate(): void {
    this.data = [];
    for (let gx = 0; gx < this.gridW; gx++) {
      for (let gz = 0; gz < this.gridH; gz++) {
        this.data.push({
          x: gx,
          z: gz,
          height: 3 + Math.random() * 17,
          intensity: 30 + Math.random() * 70,
          colorTemp: 2500 + Math.random() * 4000,
        });
      }
    }
  }

  getData(): BuildingData[] {
    return this.data;
  }
}

export function colorTempToRGB(kelvin: number): [number, number, number] {
  const temp = Math.max(2000, Math.min(6500, kelvin)) / 100;
  let r: number, g: number, b: number;
  if (temp <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
    if (temp <= 19) {
      b = 0;
    } else {
      b = 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
    }
  } else {
    r = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
    b = 255;
  }
  return [
    Math.max(0, Math.min(255, Math.round(r))) / 255,
    Math.max(0, Math.min(255, Math.round(g))) / 255,
    Math.max(0, Math.min(255, Math.round(b))) / 255,
  ];
}
