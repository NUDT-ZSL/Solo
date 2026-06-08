import type { Grid } from './grid.js';

export type ParticleType = 'sand' | 'water' | 'fire' | 'wood' | 'steam' | 'ash';

export interface Particle {
  type: ParticleType;
  x: number;
  y: number;
  updated: boolean;
  color: [number, number, number];
  update(grid: Grid): void;
}

function randomizeColor(base: [number, number, number], variance: number = 15): [number, number, number] {
  return [
    Math.min(255, Math.max(0, base[0] + Math.floor((Math.random() - 0.5) * variance * 2))),
    Math.min(255, Math.max(0, base[1] + Math.floor((Math.random() - 0.5) * variance * 2))),
    Math.min(255, Math.max(0, base[2] + Math.floor((Math.random() - 0.5) * variance * 2))),
  ];
}

export const COLORS: Record<ParticleType, [number, number, number]> = {
  sand: [230, 200, 110],
  water: [90, 159, 212],
  fire: [255, 107, 53],
  wood: [139, 90, 43],
  steam: [204, 204, 204],
  ash: [102, 102, 102],
};

function createParticle(type: ParticleType, x: number, y: number): Particle {
  switch (type) {
    case 'sand': return new Sand(x, y);
    case 'water': return new Water(x, y);
    case 'fire': return new Fire(x, y);
    case 'wood': return new Wood(x, y);
    case 'steam': return new Steam(x, y);
    case 'ash': return new Ash(x, y);
  }
}

export { createParticle };

abstract class BaseParticle implements Particle {
  type: ParticleType;
  x: number;
  y: number;
  updated: boolean;
  color: [number, number, number];

  constructor(type: ParticleType, x: number, y: number) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.updated = false;
    this.color = randomizeColor(COLORS[type]);
  }

  protected swap(grid: Grid, nx: number, ny: number): void {
    const target = grid.getCell(nx, ny);
    grid.setCell(nx, ny, this);
    grid.setCell(this.x, this.y, target);
    if (target) {
      target.x = this.x;
      target.y = this.y;
      target.updated = true;
    }
    this.x = nx;
    this.y = ny;
    this.updated = true;
  }

  protected isEmpty(grid: Grid, nx: number, ny: number): boolean {
    return grid.isInBounds(nx, ny) && !grid.getCell(nx, ny);
  }

  protected isType(grid: Grid, nx: number, ny: number, type: ParticleType): boolean {
    const cell = grid.getCell(nx, ny);
    return !!cell && cell.type === type;
  }

  abstract update(grid: Grid): void;
}

class Sand extends BaseParticle {
  constructor(x: number, y: number) {
    super('sand', x, y);
  }

  update(grid: Grid): void {
    if (this.updated) return;

    const below = this.y + 1;
    if (this.isEmpty(grid, this.x, below)) {
      this.swap(grid, this.x, below);
      return;
    }

    const belowCell = grid.getCell(this.x, below);
    if (belowCell && belowCell.type === 'water') {
      this.swap(grid, this.x, below);
      return;
    }

    const dir = Math.random() < 0.5 ? -1 : 1;
    if (this.isEmpty(grid, this.x + dir, below)) {
      this.swap(grid, this.x + dir, below);
      return;
    }
    const diagCell1 = grid.getCell(this.x + dir, below);
    if (diagCell1 && diagCell1.type === 'water') {
      this.swap(grid, this.x + dir, below);
      return;
    }

    if (this.isEmpty(grid, this.x - dir, below)) {
      this.swap(grid, this.x - dir, below);
      return;
    }
    const diagCell2 = grid.getCell(this.x - dir, below);
    if (diagCell2 && diagCell2.type === 'water') {
      this.swap(grid, this.x - dir, below);
      return;
    }

    this.updated = true;
  }
}

class Water extends BaseParticle {
  constructor(x: number, y: number) {
    super('water', x, y);
  }

  update(grid: Grid): void {
    if (this.updated) return;

    const below = this.y + 1;
    if (this.isEmpty(grid, this.x, below)) {
      this.swap(grid, this.x, below);
      return;
    }

    const belowCell = grid.getCell(this.x, below);
    if (belowCell && belowCell.type === 'fire') {
      grid.setCell(this.x, below, null);
      grid.setCell(this.x, this.y, null);
      if (this.isEmpty(grid, this.x, this.y - 1)) {
        const steam = new Steam(this.x, this.y - 1);
        steam.updated = true;
        grid.setCell(this.x, this.y - 1, steam);
      }
      grid.decrementCount();
      grid.decrementCount();
      this.updated = true;
      return;
    }

    const dir = Math.random() < 0.5 ? -1 : 1;
    if (this.isEmpty(grid, this.x + dir, below)) {
      this.swap(grid, this.x + dir, below);
      return;
    }
    if (this.isEmpty(grid, this.x - dir, below)) {
      this.swap(grid, this.x - dir, below);
      return;
    }

    for (let d = 1; d <= 4; d++) {
      if (this.isEmpty(grid, this.x + dir * d, this.y)) {
        this.swap(grid, this.x + dir * d, this.y);
        return;
      }
      if (this.isEmpty(grid, this.x - dir * d, this.y)) {
        this.swap(grid, this.x - dir * d, this.y);
        return;
      }
    }

    this.updated = true;
  }
}

class Fire extends BaseParticle {
  life: number;

  constructor(x: number, y: number) {
    super('fire', x, y);
    this.life = 60 + Math.floor(Math.random() * 60);
  }

  update(grid: Grid): void {
    if (this.updated) return;

    this.life--;
    if (this.life <= 0) {
      grid.setCell(this.x, this.y, null);
      grid.decrementCount();
      this.updated = true;
      return;
    }

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = this.x + dx;
        const ny = this.y + dy;
        const cell = grid.getCell(nx, ny);
        if (cell && cell.type === 'water') {
          grid.setCell(this.x, this.y, null);
          grid.setCell(nx, ny, null);
          grid.decrementCount();
          grid.decrementCount();
          if (this.isEmpty(grid, nx, ny - 1)) {
            const steam = new Steam(nx, ny - 1);
            steam.updated = true;
            grid.setCell(nx, ny - 1, steam);
          }
          this.updated = true;
          return;
        }
        if (cell && cell.type === 'wood' && Math.random() < 0.02) {
          const newFire = new Fire(nx, ny);
          newFire.updated = true;
          grid.setCell(nx, ny, newFire);
          this.updated = true;
          return;
        }
      }
    }

    const above = this.y - 1;
    if (this.isEmpty(grid, this.x, above)) {
      this.swap(grid, this.x, above);
      return;
    }

    const dir = Math.random() < 0.5 ? -1 : 1;
    if (this.isEmpty(grid, this.x + dir, above)) {
      this.swap(grid, this.x + dir, above);
      return;
    }
    if (this.isEmpty(grid, this.x - dir, above)) {
      this.swap(grid, this.x - dir, above);
      return;
    }

    this.updated = true;
  }
}

class Wood extends BaseParticle {
  burnProgress: number;

  constructor(x: number, y: number) {
    super('wood', x, y);
    this.burnProgress = 0;
  }

  update(grid: Grid): void {
    if (this.updated) return;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const cell = grid.getCell(this.x + dx, this.y + dy);
        if (cell && cell.type === 'fire') {
          this.burnProgress += 1;
          if (this.burnProgress >= 30 && Math.random() < 0.3) {
            const ash = new Ash(this.x, this.y);
            ash.updated = true;
            grid.setCell(this.x, this.y, ash);
            this.updated = true;
            return;
          }
        }
      }
    }

    this.updated = true;
  }
}

class Steam extends BaseParticle {
  life: number;

  constructor(x: number, y: number) {
    super('steam', x, y);
    this.life = 120 + Math.floor(Math.random() * 60);
  }

  update(grid: Grid): void {
    if (this.updated) return;

    this.life--;
    if (this.life <= 0) {
      grid.setCell(this.x, this.y, null);
      grid.decrementCount();
      this.updated = true;
      return;
    }

    const above = this.y - 1;
    if (this.isEmpty(grid, this.x, above)) {
      this.swap(grid, this.x, above);
      return;
    }

    const dir = Math.random() < 0.5 ? -1 : 1;
    if (this.isEmpty(grid, this.x + dir, above)) {
      this.swap(grid, this.x + dir, above);
      return;
    }
    if (this.isEmpty(grid, this.x - dir, above)) {
      this.swap(grid, this.x - dir, above);
      return;
    }
    if (this.isEmpty(grid, this.x + dir, this.y)) {
      this.swap(grid, this.x + dir, this.y);
      return;
    }
    if (this.isEmpty(grid, this.x - dir, this.y)) {
      this.swap(grid, this.x - dir, this.y);
      return;
    }

    this.updated = true;
  }
}

class Ash extends BaseParticle {
  constructor(x: number, y: number) {
    super('ash', x, y);
  }

  update(grid: Grid): void {
    if (this.updated) return;

    const below = this.y + 1;
    if (this.isEmpty(grid, this.x, below)) {
      this.swap(grid, this.x, below);
      return;
    }

    const belowCell = grid.getCell(this.x, below);
    if (belowCell && belowCell.type === 'water') {
      this.swap(grid, this.x, below);
      return;
    }

    const dir = Math.random() < 0.5 ? -1 : 1;
    if (this.isEmpty(grid, this.x + dir, below)) {
      this.swap(grid, this.x + dir, below);
      return;
    }
    if (this.isEmpty(grid, this.x - dir, below)) {
      this.swap(grid, this.x - dir, below);
      return;
    }

    this.updated = true;
  }
}
