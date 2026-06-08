import { OrbitSimulator, PlanetData, PortalData } from './OrbitSimulator';

export interface LevelConfig {
  cols: number;
  rows: number;
  planets: PlanetData[];
  portals: PortalData[];
  cellSize: number;
  offsetX: number;
  offsetY: number;
}

const PLANET_COLOR_PALETTES = [
  { outer: 0x6633cc, inner: 0xaa66ff },
  { outer: 0xcc6600, inner: 0xffaa33 },
  { outer: 0x009988, inner: 0x33ddcc },
  { outer: 0xcc3366, inner: 0xff6699 },
  { outer: 0x3366cc, inner: 0x6699ff },
];

export class LevelManager {
  private currentLevel: number = 0;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  generateLevel(): LevelConfig {
    this.currentLevel++;
    const minSize = 5;
    const maxSize = Math.min(7, 4 + this.currentLevel);
    const cols = minSize + Math.floor(Math.random() * (maxSize - minSize + 1));
    const rows = minSize + Math.floor(Math.random() * (maxSize - minSize + 1));

    const maxGridPx = Math.min(this.canvasWidth * 0.7, this.canvasHeight * 0.75);
    const cellSize = Math.floor(maxGridPx / Math.max(cols, rows));
    const gridWidth = (cols - 1) * cellSize;
    const gridHeight = (rows - 1) * cellSize;
    const offsetX = Math.floor((this.canvasWidth - gridWidth) / 2);
    const offsetY = Math.floor((this.canvasHeight - gridHeight) / 2) + 20;

    const numPlanets = 2 + Math.floor(Math.random() * 3);
    const planets = this.generatePlanets(cols, rows, numPlanets);

    const portals = this.generatePortals(cols, rows, planets);

    const config: LevelConfig = {
      cols,
      rows,
      planets,
      portals,
      cellSize,
      offsetX,
      offsetY,
    };

    const simulator = new OrbitSimulator(cols, rows, cellSize, offsetX, offsetY);
    const reachable = simulator.findReachablePortals(planets, portals);

    let allReachable = true;
    for (let i = 0; i < portals.length; i++) {
      const list = reachable.get(i);
      if (!list || list.length === 0) {
        allReachable = false;
        break;
      }
    }

    if (!allReachable) {
      return this.regenerateWithRetry(cols, rows, cellSize, offsetX, offsetY);
    }

    return config;
  }

  private regenerateWithRetry(
    cols: number,
    rows: number,
    cellSize: number,
    offsetX: number,
    offsetY: number,
    maxRetries: number = 20
  ): LevelConfig {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const numPlanets = 2 + Math.floor(Math.random() * 3);
      const planets = this.generatePlanets(cols, rows, numPlanets);
      const portals = this.generatePortals(cols, rows, planets);

      const simulator = new OrbitSimulator(cols, rows, cellSize, offsetX, offsetY);
      const reachable = simulator.findReachablePortals(planets, portals);

      let allReachable = true;
      for (let i = 0; i < portals.length; i++) {
        const list = reachable.get(i);
        if (!list || list.length === 0) {
          allReachable = false;
          break;
        }
      }

      if (allReachable) {
        return { cols, rows, planets, portals, cellSize, offsetX, offsetY };
      }
    }

    const fallbackPlanets: PlanetData[] = [
      { gridX: Math.floor(cols / 2), gridY: Math.floor(rows / 2), mass: 3, color: 0x6633cc, innerColor: 0xaa66ff },
    ];
    const fallbackPortals: PortalData[] = [
      { gridX: 0, gridY: 0 },
      { gridX: cols - 1, gridY: 0 },
      { gridX: Math.floor(cols / 2), gridY: rows - 1 },
    ];

    return { cols, rows, planets: fallbackPlanets, portals: fallbackPortals, cellSize, offsetX, offsetY };
  }

  private generatePlanets(cols: number, rows: number, count: number): PlanetData[] {
    const planets: PlanetData[] = [];
    const occupied = new Set<string>();

    for (let i = 0; i < count; i++) {
      let gx: number, gy: number;
      let attempts = 0;
      do {
        gx = 1 + Math.floor(Math.random() * (cols - 2));
        gy = 1 + Math.floor(Math.random() * (rows - 2));
        attempts++;
      } while (occupied.has(`${gx},${gy}`) && attempts < 50);

      occupied.add(`${gx},${gy}`);

      const mass = 1 + Math.floor(Math.random() * 4);
      const palette = PLANET_COLOR_PALETTES[Math.floor(Math.random() * PLANET_COLOR_PALETTES.length)];

      planets.push({
        gridX: gx,
        gridY: gy,
        mass,
        color: palette.outer,
        innerColor: palette.inner,
      });
    }

    return planets;
  }

  private generatePortals(cols: number, rows: number, planets: PlanetData[]): PortalData[] {
    const portals: PortalData[] = [];
    const occupied = new Set<string>();

    for (const p of planets) {
      occupied.add(`${p.gridX},${p.gridY}`);
    }

    for (let i = 0; i < 3; i++) {
      let gx: number, gy: number;
      let attempts = 0;
      do {
        gx = Math.floor(Math.random() * cols);
        gy = Math.floor(Math.random() * rows);
        attempts++;
      } while ((occupied.has(`${gx},${gy}`) || this.isNearPlanet(gx, gy, planets, 1)) && attempts < 80);

      occupied.add(`${gx},${gy}`);
      portals.push({ gridX: gx, gridY: gy });
    }

    return portals;
  }

  private isNearPlanet(gx: number, gy: number, planets: PlanetData[], minDist: number): boolean {
    for (const p of planets) {
      const dx = Math.abs(p.gridX - gx);
      const dy = Math.abs(p.gridY - gy);
      if (dx + dy <= minDist) return true;
    }
    return false;
  }

  getCurrentLevel(): number {
    return this.currentLevel;
  }

  resetLevelNumber(): void {
    this.currentLevel = 0;
  }
}
