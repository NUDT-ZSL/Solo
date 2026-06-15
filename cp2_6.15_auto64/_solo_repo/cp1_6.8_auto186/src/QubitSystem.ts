import { CellState, Grid, Position } from './GridGenerator';

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: TrailPoint[];
  alive: boolean;
  targetRow: number;
  targetCol: number;
  age: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export class QubitSystem {
  particles: Particle[] = [];
  shockwaves: Shockwave[] = [];

  fire(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    targetRow: number,
    targetCol: number
  ) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    const speed = 500;
    this.particles.push({
      x: fromX,
      y: fromY,
      vx: (dx / len) * speed,
      vy: (dy / len) * speed,
      trail: [],
      alive: true,
      targetRow,
      targetCol,
      age: 0,
    });
  }

  addShockwave(x: number, y: number, maxRadius: number) {
    this.shockwaves.push({
      x,
      y,
      radius: 0,
      maxRadius,
      alpha: 1,
    });
  }

  update(dt: number, grid: Grid, cellSize: number, ox: number, oy: number): Position[] {
    const hitCells: Position[] = [];

    for (const p of this.particles) {
      if (!p.alive) {
        p.trail = p.trail.filter(t => {
          t.alpha -= dt * 4;
          return t.alpha > 0;
        });
        continue;
      }

      p.age += dt;
      p.trail.push({ x: p.x, y: p.y, alpha: 1 });
      if (p.trail.length > 30) p.trail.shift();
      for (const t of p.trail) {
        t.alpha -= dt * 3;
      }
      p.trail = p.trail.filter(t => t.alpha > 0);

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const col = Math.floor((p.x - ox) / cellSize);
      const row = Math.floor((p.y - oy) / cellSize);

      if (row >= 0 && row < grid.height && col >= 0 && col < grid.width) {
        const cell = grid.cells[row][col];
        if (cell.state === CellState.Superposition) {
          p.alive = false;
          hitCells.push({ row, col });
          const cx = ox + col * cellSize + cellSize / 2;
          const cy = oy + row * cellSize + cellSize / 2;
          this.addShockwave(cx, cy, cellSize * 1.5);
        }
      }

      if (
        p.x < ox - cellSize ||
        p.x > ox + grid.width * cellSize + cellSize ||
        p.y < oy - cellSize ||
        p.y > oy + grid.height * cellSize + cellSize
      ) {
        p.alive = false;
      }
    }

    for (const sw of this.shockwaves) {
      sw.radius += dt * 200;
      sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
    }
    this.shockwaves = this.shockwaves.filter(sw => sw.alpha > 0);
    this.particles = this.particles.filter(p => p.alive || p.trail.length > 0);

    return hitCells;
  }
}
