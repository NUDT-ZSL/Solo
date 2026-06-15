import {
  AICreature,
  MAX_CREATURES,
  CREATURE_SPEED,
  CREATURE_OXYGEN_DAMAGE,
  CellType,
  GRID_SIZE,
  SubmarineState,
  ScreenShake,
  OxygenFlash
} from '../types/gameTypes';

export class AISystem {
  creatures: AICreature[];
  nextSpawnTime: number;
  currentTime: number;
  private creatureCounter: number;

  constructor() {
    this.creatures = [];
    this.nextSpawnTime = 8 + Math.random() * 7;
    this.currentTime = 0;
    this.creatureCounter = 0;
  }

  spawnCreature(grid: { type: CellType }[][]): void {
    if (this.creatures.length >= MAX_CREATURES) return;

    let spawned = false;
    let attempts = 0;

    while (!spawned && attempts < 100) {
      attempts++;
      const x = 2 + Math.floor(Math.random() * (GRID_SIZE - 4));
      const y = 2 + Math.floor(Math.random() * (GRID_SIZE - 4));
      if (grid[y][x].type === CellType.WATER) {
        this.creatureCounter++;
        this.creatures.push({
          id: `creature_${this.creatureCounter}`,
          x,
          y,
          vx: 0,
          vy: 0,
          type: Math.random() > 0.5 ? 'jellyfish' : 'shark',
          stunned: 0,
          targetX: x,
          targetY: y
        });
        spawned = true;
      }
    }

    this.nextSpawnTime = this.currentTime + 8 + Math.random() * 7;
  }

  stunCreature(id: string): void {
    const creature = this.creatures.find(c => c.id === id);
    if (creature) {
      creature.stunned = 3;
    }
  }

  stunCreatures(ids: string[]): void {
    for (const id of ids) {
      this.stunCreature(id);
    }
  }

  update(
    dt: number,
    grid: { type: CellType }[][],
    submarine: SubmarineState
  ): {
    collisions: { damage: number; screenShake: ScreenShake; oxygenFlash: OxygenFlash }[]
  } {
    this.currentTime += dt;

    if (this.currentTime >= this.nextSpawnTime) {
      this.spawnCreature(grid);
    }

    const collisions: { damage: number; screenShake: ScreenShake; oxygenFlash: OxygenFlash }[] = [];

    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const c = this.creatures[i];

      if (c.stunned > 0) {
        c.stunned -= dt;
        const fleeAngle = Math.random() * Math.PI * 2;
        const fleeSpeed = CREATURE_SPEED * 0.5;
        c.vx = Math.cos(fleeAngle) * fleeSpeed;
        c.vy = Math.sin(fleeAngle) * fleeSpeed;
      } else {
        const dx = submarine.x - c.x;
        const dy = submarine.y - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.1) {
          c.targetX = submarine.x;
          c.targetY = submarine.y;
          c.vx = (dx / dist) * CREATURE_SPEED;
          c.vy = (dy / dist) * CREATURE_SPEED;
        }
      }

      let newX = c.x + c.vx * dt;
      let newY = c.y + c.vy * dt;

      const gx = Math.floor(newX);
      const gy = Math.floor(newY);
      if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE &&
          grid[gy][gx].type !== CellType.WALL) {
        c.x = newX;
        c.y = newY;
      } else {
        c.x += (Math.random() - 0.5) * dt * 2;
        c.y += (Math.random() - 0.5) * dt * 2;
      }

      c.x = Math.max(1, Math.min(GRID_SIZE - 2, c.x));
      c.y = Math.max(1, Math.min(GRID_SIZE - 2, c.y));

      const sdx = submarine.x - c.x;
      const sdy = submarine.y - c.y;
      const sdist = Math.sqrt(sdx * sdx + sdy * sdy);

      if (sdist < 0.9 && c.stunned <= 0) {
        collisions.push({
          damage: CREATURE_OXYGEN_DAMAGE,
          screenShake: {
            active: true,
            amplitude: 5,
            frequency: 5,
            duration: 1.5,
            startTime: this.currentTime
          },
          oxygenFlash: {
            active: true,
            startTime: this.currentTime,
            duration: 0.2,
            blinkCount: 2
          }
        });

        if (sdist > 0) {
          c.x -= (sdx / sdist) * 0.5;
          c.y -= (sdy / sdist) * 0.5;
        }
        c.stunned = 1;
      }
    }

    this.creatures = this.creatures.filter(c => {
      if (c.stunned > 0 && c.stunned < 2.5) return true;
      const dx = submarine.x - c.x;
      const dy = submarine.y - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist < GRID_SIZE * 0.8;
    });

    return { collisions };
  }
}
