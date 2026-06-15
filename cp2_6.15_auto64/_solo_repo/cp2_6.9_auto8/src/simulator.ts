export enum MaterialType {
  Empty = 0,
  Sand = 1,
  Water = 2,
  Wood = 3,
  WetSand = 4
}

export const MATERIAL_COLORS: Record<MaterialType, string> = {
  [MaterialType.Empty]: '#2C2C2C',
  [MaterialType.Sand]: '#D4A574',
  [MaterialType.Water]: '#4A90D9',
  [MaterialType.Wood]: '#8B5E3C',
  [MaterialType.WetSand]: '#A67C52'
};

interface Particle {
  updated: boolean;
}

export class Simulator {
  public readonly width: number;
  public readonly height: number;
  private grid: MaterialType[][];
  private particles: Particle[][];
  private particleCount: number = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.grid = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => MaterialType.Empty)
    );
    this.particles = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ updated: false }))
    );
  }

  public getMaterial(x: number, y: number): MaterialType {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return MaterialType.Wood;
    }
    return this.grid[y][x];
  }

  public setMaterial(x: number, y: number, material: MaterialType): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    const current = this.grid[y][x];
    if (current === material) return;

    if (current !== MaterialType.Empty) {
      this.particleCount--;
    }
    if (material !== MaterialType.Empty) {
      this.particleCount++;
    }

    this.grid[y][x] = material;
    this.particles[y][x].updated = false;
  }

  public getParticleCount(): number {
    return this.particleCount;
  }

  public clear(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = MaterialType.Empty;
        this.particles[y][x].updated = false;
      }
    }
    this.particleCount = 0;
  }

  public update(): void {
    const leftToRight = Math.random() > 0.5;

    for (let y = this.height - 1; y >= 0; y--) {
      if (leftToRight) {
        for (let x = 0; x < this.width; x++) {
          this.updateParticle(x, y);
        }
      } else {
        for (let x = this.width - 1; x >= 0; x--) {
          this.updateParticle(x, y);
        }
      }
    }

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.particles[y][x].updated = false;
      }
    }
  }

  private updateParticle(x: number, y: number): void {
    if (this.particles[y][x].updated) return;

    const material = this.grid[y][x];

    switch (material) {
      case MaterialType.Sand:
        this.updateSand(x, y);
        break;
      case MaterialType.Water:
        this.updateWater(x, y);
        break;
      case MaterialType.Wood:
        this.updateWood(x, y);
        break;
    }
  }

  private updateSand(x: number, y: number): void {
    const below = this.getMaterial(x, y + 1);

    if (below === MaterialType.Empty) {
      this.swap(x, y, x, y + 1);
      return;
    }

    if (below === MaterialType.Water) {
      this.swap(x, y, x, y + 1);
      return;
    }

    const dir = Math.random() > 0.5 ? 1 : -1;
    const diag1 = this.getMaterial(x + dir, y + 1);
    const diag2 = this.getMaterial(x - dir, y + 1);

    if (diag1 === MaterialType.Empty || diag1 === MaterialType.Water) {
      this.swap(x, y, x + dir, y + 1);
      return;
    }

    if (diag2 === MaterialType.Empty || diag2 === MaterialType.Water) {
      this.swap(x, y, x - dir, y + 1);
      return;
    }
  }

  private updateWater(x: number, y: number): void {
    const below = this.getMaterial(x, y + 1);
    if (below === MaterialType.Empty) {
      this.swap(x, y, x, y + 1);
      return;
    }

    if (below === MaterialType.Sand) {
      this.grid[y + 1][x] = MaterialType.WetSand;
      this.particles[y + 1][x].updated = true;
      this.grid[y][x] = MaterialType.Empty;
      this.particles[y][x].updated = true;
      this.particleCount--;
      return;
    }

    const dir = Math.random() > 0.5 ? 1 : -1;
    const diagOrder = [dir, -dir];

    for (const d of diagOrder) {
      const diagMat = this.getMaterial(x + d, y + 1);
      if (diagMat === MaterialType.Empty) {
        this.swap(x, y, x + d, y + 1);
        return;
      }
      if (diagMat === MaterialType.Sand) {
        this.grid[y + 1][x + d] = MaterialType.WetSand;
        this.particles[y + 1][x + d].updated = true;
        this.grid[y][x] = MaterialType.Empty;
        this.particles[y][x].updated = true;
        this.particleCount--;
        return;
      }
    }

    const sideOrder = [dir, -dir];
    for (const d of sideOrder) {
      const sideMat = this.getMaterial(x + d, y);
      if (sideMat === MaterialType.Empty) {
        this.swap(x, y, x + d, y);
        return;
      }
      if (sideMat === MaterialType.Sand) {
        this.grid[y][x + d] = MaterialType.WetSand;
        this.particles[y][x + d].updated = true;
        this.grid[y][x] = MaterialType.Empty;
        this.particles[y][x].updated = true;
        this.particleCount--;
        return;
      }
    }
  }

  private updateWood(x: number, y: number): void {
    const hasWaterLeft = this.getMaterial(x - 1, y) === MaterialType.Water;
    const hasWaterRight = this.getMaterial(x + 1, y) === MaterialType.Water;
    const hasWaterAbove = this.getMaterial(x, y - 1) === MaterialType.Water;

    const hasSupportBelow = this.getMaterial(x, y + 1) !== MaterialType.Empty &&
                            this.getMaterial(x, y + 1) !== MaterialType.Water;
    const hasSupportLeft = this.getMaterial(x - 1, y) === MaterialType.Wood ||
                           this.getMaterial(x - 1, y) === MaterialType.WetSand;
    const hasSupportRight = this.getMaterial(x + 1, y) === MaterialType.Wood ||
                            this.getMaterial(x + 1, y) === MaterialType.WetSand;

    if ((hasWaterLeft || hasWaterRight || hasWaterAbove) && !hasSupportBelow) {
      if (!hasSupportLeft && !hasSupportRight) {
        const dir = hasWaterLeft ? 1 : (hasWaterRight ? -1 : (Math.random() > 0.5 ? 1 : -1));

        const below = this.getMaterial(x, y + 1);
        if (below === MaterialType.Empty || below === MaterialType.Water) {
          this.swap(x, y, x, y + 1);
          return;
        }

        const diag = this.getMaterial(x + dir, y + 1);
        if (diag === MaterialType.Empty || diag === MaterialType.Water) {
          this.swap(x, y, x + dir, y + 1);
          return;
        }

        const side = this.getMaterial(x + dir, y);
        if (side === MaterialType.Empty || side === MaterialType.Water) {
          this.swap(x, y, x + dir, y);
          return;
        }
      }
    }
  }

  private swap(x1: number, y1: number, x2: number, y2: number): void {
    if (x2 < 0 || x2 >= this.width || y2 < 0 || y2 >= this.height) return;

    const tempMat = this.grid[y1][x1];
    this.grid[y1][x1] = this.grid[y2][x2];
    this.grid[y2][x2] = tempMat;

    this.particles[y1][x1].updated = true;
    this.particles[y2][x2].updated = true;
  }
}
