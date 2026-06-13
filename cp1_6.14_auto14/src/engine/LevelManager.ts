import type { CelestialBody, Wormhole, Vec2 } from '../physics/GravityEngine';

export interface LevelConfig {
  level: number;
  bodies: CelestialBody[];
  wormhole: Wormhole;
  probeStart: Vec2;
  fuel: number;
}

const PLANET_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899'];
const ASTEROID_COLOR = '#94a3b8';

function makePlanet(id: string, x: number, y: number, mass: number, radius: number, colorIdx: number): CelestialBody {
  return {
    id,
    x,
    y,
    mass,
    radius,
    type: 'planet',
    color: PLANET_COLORS[colorIdx % PLANET_COLORS.length],
    gravityRadius: radius * 4,
  };
}

function makeAsteroid(id: string, x: number, y: number, radius: number): CelestialBody {
  return {
    id,
    x,
    y,
    mass: 0,
    radius,
    type: 'asteroid',
    color: ASTEROID_COLOR,
    gravityRadius: 0,
  };
}

function generateLevels(width: number, height: number): LevelConfig[] {
  const cx = width / 2;
  const cy = height / 2;

  const levels: LevelConfig[] = [
    {
      level: 1,
      bodies: [
        makePlanet('p1', cx - 50, cy, 60, 30, 0),
        makePlanet('p2', cx + 120, cy - 80, 40, 22, 1),
      ],
      wormhole: { x: cx + 250, y: cy + 60, radius: 25, rotation: 0 },
      probeStart: { x: cx - 300, y: cy },
      fuel: 80,
    },
    {
      level: 2,
      bodies: [
        makePlanet('p1', cx - 80, cy - 60, 70, 32, 2),
        makePlanet('p2', cx + 80, cy + 40, 50, 25, 3),
        makePlanet('p3', cx + 200, cy - 100, 35, 20, 4),
      ],
      wormhole: { x: cx + 300, y: cy + 100, radius: 25, rotation: 0 },
      probeStart: { x: cx - 320, y: cy + 20 },
      fuel: 90,
    },
    {
      level: 3,
      bodies: [
        makePlanet('p1', cx - 100, cy - 80, 80, 35, 5),
        makePlanet('p2', cx + 60, cy + 60, 55, 28, 6),
        makePlanet('p3', cx + 200, cy - 40, 45, 24, 0),
        makeAsteroid('a1', cx + 140, cy + 140, 12),
      ],
      wormhole: { x: cx + 350, y: cy - 80, radius: 25, rotation: 0 },
      probeStart: { x: cx - 340, y: cy - 20 },
      fuel: 85,
    },
    {
      level: 4,
      bodies: [
        makePlanet('p1', cx - 120, cy, 90, 38, 1),
        makePlanet('p2', cx + 40, cy - 100, 60, 27, 2),
        makePlanet('p3', cx + 160, cy + 80, 50, 25, 3),
        makePlanet('p4', cx - 30, cy + 120, 40, 22, 4),
        makeAsteroid('a1', cx + 100, cy + 20, 10),
        makeAsteroid('a2', cx - 60, cy - 60, 8),
      ],
      wormhole: { x: cx + 340, y: cy - 60, radius: 25, rotation: 0 },
      probeStart: { x: cx - 360, y: cy + 40 },
      fuel: 80,
    },
    {
      level: 5,
      bodies: [
        makePlanet('p1', cx - 80, cy - 100, 100, 40, 5),
        makePlanet('p2', cx + 100, cy - 60, 70, 30, 6),
        makePlanet('p3', cx - 40, cy + 100, 55, 26, 0),
        makePlanet('p4', cx + 220, cy + 60, 45, 24, 1),
        makePlanet('p5', cx + 60, cy + 160, 35, 20, 2),
        makeAsteroid('a1', cx + 30, cy - 10, 10),
        makeAsteroid('a2', cx + 160, cy - 120, 8),
        makeAsteroid('a3', cx - 100, cy + 30, 12),
      ],
      wormhole: { x: cx + 380, y: cy - 120, radius: 25, rotation: 0 },
      probeStart: { x: cx - 380, y: cy - 40 },
      fuel: 75,
    },
  ];

  return levels;
}

export type LevelStatus = 'playing' | 'won' | 'lost' | 'fuel_out';

export default class LevelManager {
  private levels: LevelConfig[];
  private currentLevelIndex: number = 0;

  constructor(width: number, height: number) {
    this.levels = generateLevels(width, height);
  }

  getCurrentLevel(): LevelConfig {
    return this.levels[this.currentLevelIndex];
  }

  getCurrentLevelNumber(): number {
    return this.currentLevelIndex + 1;
  }

  getTotalLevels(): number {
    return this.levels.length;
  }

  checkStatus(
    probeX: number,
    probeY: number,
    probeAlive: boolean,
    probeFuel: number,
    wormhole: Wormhole
  ): LevelStatus {
    if (!probeAlive) {
      return 'lost';
    }
    if (probeFuel <= 0) {
      return 'fuel_out';
    }
    const dx = wormhole.x - probeX;
    const dy = wormhole.y - probeY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < wormhole.radius + 4) {
      return 'won';
    }
    return 'playing';
  }

  advanceLevel(): boolean {
    if (this.currentLevelIndex < this.levels.length - 1) {
      this.currentLevelIndex++;
      return true;
    }
    return false;
  }

  isVictory(): boolean {
    return this.currentLevelIndex >= this.levels.length - 1;
  }

  reset() {
    this.currentLevelIndex = 0;
  }

  resize(width: number, height: number) {
    this.levels = generateLevels(width, height);
  }
}
