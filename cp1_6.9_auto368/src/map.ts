export interface Vec2 {
  x: number;
  y: number;
}

export interface CrystalSpawn {
  x: number;
  y: number;
  collected: boolean;
}

export interface ChestSpawn {
  x: number;
  y: number;
  opened: boolean;
  revealed: boolean;
}

export class MapManager {
  public tileSize: number;
  public cols: number;
  public rows: number;
  public grid: number[][];
  public explored: boolean[][];
  public crystals: CrystalSpawn[] = [];
  public chests: ChestSpawn[] = [];
  public level: number;
  public plankton: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; phase: number }[] = [];
  private planktonCount: number;

  private static readonly WALL = 0;
  private static readonly FLOOR = 1;

  constructor(level: number, cols: number = 80, rows: number = 50, tileSize: number = 32) {
    this.level = level;
    this.cols = cols;
    this.rows = rows;
    this.tileSize = tileSize;
    this.grid = [];
    this.explored = [];
    this.planktonCount = Math.floor(80 * (1 + (level - 1) * 0.2));
    this.generate();
    this.spawnCrystals();
    this.spawnChests();
    this.spawnPlankton();
  }

  private generate(): void {
    const widthFactor = 1 - (this.level - 1) * 0.1;
    this.grid = this.createFractalNoise(widthFactor);
    this.ensureConnectivity();
    this.explored = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => false)
    );
  }

  private createFractalNoise(widthFactor: number): number[][] {
    const grid: number[][] = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => MapManager.WALL)
    );

    for (let y = 2; y < this.rows - 2; y++) {
      for (let x = 2; x < this.cols - 2; x++) {
        const noise = this.valueNoise(x * 0.12, y * 0.12);
        const noise2 = this.valueNoise(x * 0.3, y * 0.3) * 0.5;
        const combined = noise + noise2;
        const threshold = 0.42 + (1 - widthFactor) * 0.12;
        grid[y][x] = combined > threshold ? MapManager.FLOOR : MapManager.WALL;
      }
    }

    this.carveMainPath(grid);
    this.carveCaves(grid);
    return grid;
  }

  private valueNoise(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;

    const v00 = this.hash(xi, yi);
    const v10 = this.hash(xi + 1, yi);
    const v01 = this.hash(xi, yi + 1);
    const v11 = this.hash(xi + 1, yi + 1);

    const u = this.smoothstep(xf);
    const v = this.smoothstep(yf);

    const a = v00 + (v10 - v00) * u;
    const b = v01 + (v11 - v01) * u;
    return a + (b - a) * v;
  }

  private hash(x: number, y: number): number {
    let h = x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
  }

  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  private carveMainPath(grid: number[][]): void {
    const startY = Math.floor(this.rows / 2);
    let x = 3;
    let y = startY;
    const endX = this.cols - 4;

    while (x < endX) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (this.inBounds(nx, ny) && Math.abs(dx) + Math.abs(dy) <= 3) {
            grid[ny][nx] = MapManager.FLOOR;
          }
        }
      }
      x++;
      const r = Math.random();
      if (r < 0.35) y = Math.max(4, y - 1);
      else if (r > 0.65) y = Math.min(this.rows - 5, y + 1);
    }
  }

  private carveCaves(grid: number[][]): void {
    const caveCount = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < caveCount; i++) {
      const cx = 10 + Math.floor(Math.random() * (this.cols - 20));
      const cy = 6 + Math.floor(Math.random() * (this.rows - 12));
      const radius = 4 + Math.floor(Math.random() * 5);
      for (let y = -radius; y <= radius; y++) {
        for (let x = -radius; x <= radius; x++) {
          const dist = Math.sqrt(x * x + y * y);
          if (dist <= radius && this.inBounds(cx + x, cy + y)) {
            if (Math.random() > dist / radius * 0.6) {
              grid[cy + y][cx + x] = MapManager.FLOOR;
            }
          }
        }
      }
    }
  }

  private ensureConnectivity(): void {
    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        if (this.grid[y][x] === MapManager.FLOOR) {
          const neighbors = this.countFloorNeighbors(x, y);
          if (neighbors <= 1) {
            this.grid[y][x] = MapManager.WALL;
          }
        }
      }
    }
  }

  private countFloorNeighbors(x: number, y: number): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (this.inBounds(x + dx, y + dy) && this.grid[y + dy][x + dx] === MapManager.FLOOR) {
          count++;
        }
      }
    }
    return count;
  }

  public inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
  }

  public isWall(px: number, py: number): boolean {
    const tx = Math.floor(px / this.tileSize);
    const ty = Math.floor(py / this.tileSize);
    if (!this.inBounds(tx, ty)) return true;
    return this.grid[ty][tx] === MapManager.WALL;
  }

  public isWallTile(tx: number, ty: number): boolean {
    if (!this.inBounds(tx, ty)) return true;
    return this.grid[ty][tx] === MapManager.WALL;
  }

  public getSpawnPoint(): Vec2 {
    for (let x = 3; x < 15; x++) {
      for (let y = Math.floor(this.rows / 2) - 5; y < Math.floor(this.rows / 2) + 5; y++) {
        if (this.inBounds(x, y) && this.grid[y][x] === MapManager.FLOOR) {
          return {
            x: x * this.tileSize + this.tileSize / 2,
            y: y * this.tileSize + this.tileSize / 2
          };
        }
      }
    }
    return { x: this.tileSize * 5, y: this.tileSize * (this.rows / 2) };
  }

  public getRandomFloorPoint(): Vec2 | null {
    for (let tries = 0; tries < 200; tries++) {
      const tx = 8 + Math.floor(Math.random() * (this.cols - 16));
      const ty = 3 + Math.floor(Math.random() * (this.rows - 6));
      if (this.inBounds(tx, ty) && this.grid[ty][tx] === MapManager.FLOOR) {
        return {
          x: tx * this.tileSize + this.tileSize / 2,
          y: ty * this.tileSize + this.tileSize / 2
        };
      }
    }
    return null;
  }

  private spawnCrystals(): void {
    this.crystals = [];
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const p = this.getRandomFloorPoint();
      if (p) {
        this.crystals.push({ x: p.x, y: p.y, collected: false });
      }
    }
  }

  private spawnChests(): void {
    this.chests = [];
    const count = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const p = this.getRandomFloorPoint();
      if (p) {
        this.chests.push({ x: p.x, y: p.y, opened: false, revealed: false });
      }
    }
  }

  private spawnPlankton(): void {
    this.plankton = [];
    for (let i = 0; i < this.planktonCount; i++) {
      const p = this.getRandomFloorPoint();
      if (p) {
        this.plankton.push({
          x: p.x,
          y: p.y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          size: 3 + Math.random() * 3,
          alpha: 0.2 + Math.random() * 0.2,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
  }

  public update(dt: number, playerPos: Vec2, viewRadius: number): void {
    this.updateExplored(playerPos, viewRadius);
    for (const p of this.plankton) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.phase += dt * 2;
      if (Math.random() < 0.005) {
        p.vx = (Math.random() - 0.5) * 10;
        p.vy = (Math.random() - 0.5) * 10;
      }
      if (this.isWall(p.x, p.y)) {
        p.vx *= -1;
        p.vy *= -1;
      }
    }
    for (const chest of this.chests) {
      if (!chest.revealed && !chest.opened) {
        const dx = chest.x - playerPos.x;
        const dy = chest.y - playerPos.y;
        if (dx * dx + dy * dy < 50 * 50) {
          chest.revealed = true;
        }
      }
    }
  }

  private updateExplored(playerPos: Vec2, viewRadius: number): void {
    const cx = Math.floor(playerPos.x / this.tileSize);
    const cy = Math.floor(playerPos.y / this.tileSize);
    const r = Math.ceil(viewRadius / this.tileSize);
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (this.inBounds(x, y)) {
          const dx = (x + 0.5) * this.tileSize - playerPos.x;
          const dy = (y + 0.5) * this.tileSize - playerPos.y;
          if (dx * dx + dy * dy <= viewRadius * viewRadius) {
            this.explored[y][x] = true;
          }
        }
      }
    }
  }

  public collideCircle(cx: number, cy: number, radius: number): { hit: boolean; normal: Vec2; point: Vec2 } | null {
    const tx = Math.floor(cx / this.tileSize);
    const ty = Math.floor(cy / this.tileSize);
    let closest: { hit: boolean; normal: Vec2; point: Vec2; dist: number } | null = null;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = tx + dx;
        const ny = ty + dy;
        if (!this.inBounds(nx, ny)) continue;
        if (this.grid[ny][nx] !== MapManager.WALL) continue;

        const rectX = nx * this.tileSize;
        const rectY = ny * this.tileSize;
        const closestX = Math.max(rectX, Math.min(cx, rectX + this.tileSize));
        const closestY = Math.max(rectY, Math.min(cy, rectY + this.tileSize));
        const ddx = cx - closestX;
        const ddy = cy - closestY;
        const distSq = ddx * ddx + ddy * ddy;

        if (distSq <= radius * radius) {
          const dist = Math.sqrt(distSq) || 0.001;
          let normalX = ddx / dist;
          let normalY = ddy / dist;
          if (distSq < 0.01) {
            const centerX = rectX + this.tileSize / 2;
            const centerY = rectY + this.tileSize / 2;
            const tdx = cx - centerX;
            const tdy = cy - centerY;
            if (Math.abs(tdx) > Math.abs(tdy)) {
              normalX = tdx > 0 ? 1 : -1;
              normalY = 0;
            } else {
              normalX = 0;
              normalY = tdy > 0 ? 1 : -1;
            }
          }
          if (!closest || distSq < closest.dist) {
            closest = { hit: true, normal: { x: normalX, y: normalY }, point: { x: closestX, y: closestY }, dist: distSq };
          }
        }
      }
    }
    return closest ? { hit: true, normal: closest.normal, point: closest.point } : null;
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number, viewW: number, viewH: number): void {
    ctx.save();
    ctx.translate(-camX, -camY);

    const startTX = Math.max(0, Math.floor(camX / this.tileSize));
    const endTX = Math.min(this.cols - 1, Math.ceil((camX + viewW) / this.tileSize));
    const startTY = Math.max(0, Math.floor(camY / this.tileSize));
    const endTY = Math.min(this.rows - 1, Math.ceil((camY + viewH) / this.tileSize));

    for (let y = startTY; y <= endTY; y++) {
      for (let x = startTX; x <= endTX; x++) {
        if (this.grid[y][x] === MapManager.WALL) {
          this.drawWallTile(ctx, x, y);
        }
      }
    }

    for (const p of this.plankton) {
      const flicker = 0.6 + 0.4 * Math.sin(p.phase);
      ctx.globalAlpha = p.alpha * flicker;
      ctx.fillStyle = '#98D8F0';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  private drawWallTile(ctx: CanvasRenderingContext2D, tx: number, ty: number): void {
    const px = tx * this.tileSize;
    const py = ty * this.tileSize;
    const size = this.tileSize;

    ctx.fillStyle = '#0D0D35';
    ctx.fillRect(px, py, size, size);

    ctx.strokeStyle = '#4A90D9';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#4A90D9';
    ctx.shadowBlur = 8;

    const top = ty > 0 && this.grid[ty - 1][tx] === MapManager.FLOOR;
    const bottom = ty < this.rows - 1 && this.grid[ty + 1][tx] === MapManager.FLOOR;
    const left = tx > 0 && this.grid[ty][tx - 1] === MapManager.FLOOR;
    const right = tx < this.cols - 1 && this.grid[ty][tx + 1] === MapManager.FLOOR;

    ctx.beginPath();
    if (top) { ctx.moveTo(px, py); ctx.lineTo(px + size, py); }
    if (bottom) { ctx.moveTo(px, py + size); ctx.lineTo(px + size, py + size); }
    if (left) { ctx.moveTo(px, py); ctx.lineTo(px, py + size); }
    if (right) { ctx.moveTo(px + size, py); ctx.lineTo(px + size, py + size); }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  public renderMinimap(ctx: CanvasRenderingContext2D, mmX: number, mmY: number, mmW: number, mmH: number, playerPos: Vec2, entities: { x: number; y: number; type: string }[]): void {
    const scaleX = mmW / (this.cols * this.tileSize);
    const scaleY = mmH / (this.rows * this.tileSize);
    const scale = Math.min(scaleX, scaleY);
    const offsetX = mmX + (mmW - this.cols * this.tileSize * scale) / 2;
    const offsetY = mmY + (mmH - this.rows * this.tileSize * scale) / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 46, 0.7)';
    ctx.fillRect(mmX, mmY, mmW, mmH);
    ctx.strokeStyle = 'rgba(74, 144, 217, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mmX, mmY, mmW, mmH);

    ctx.beginPath();
    ctx.rect(mmX, mmY, mmW, mmH);
    ctx.clip();

    const cellW = this.tileSize * scale;
    const cellH = this.tileSize * scale;

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.explored[y][x]) {
          if (this.grid[y][x] === MapManager.FLOOR) {
            ctx.fillStyle = 'rgba(100, 149, 237, 0.25)';
          } else {
            ctx.fillStyle = 'rgba(30, 30, 80, 0.5)';
          }
          ctx.fillRect(offsetX + x * cellW, offsetY + y * cellH, cellW + 0.5, cellH + 0.5);
        }
      }
    }

    for (const c of this.crystals) {
      if (!c.collected) {
        const epx = Math.floor(c.x / this.tileSize);
        const epy = Math.floor(c.y / this.tileSize);
        if (this.inBounds(epx, epy) && this.explored[epy][epx]) {
          ctx.fillStyle = '#00FF7F';
          ctx.beginPath();
          ctx.arc(offsetX + c.x * scale, offsetY + c.y * scale, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const now = performance.now() / 300;
    for (const e of entities) {
      if (e.type === 'enemy') {
        const flash = (Math.sin(now) + 1) / 2;
        ctx.fillStyle = `rgba(255, ${60 + flash * 40}, ${60 + flash * 40}, ${0.6 + flash * 0.4})`;
        ctx.beginPath();
        ctx.arc(offsetX + e.x * scale, offsetY + e.y * scale, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const pmmx = offsetX + playerPos.x * scale;
    const pmmy = offsetY + playerPos.y * scale;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(pmmx, pmmy - 4);
    ctx.lineTo(pmmx - 3, pmmy + 3);
    ctx.lineTo(pmmx + 3, pmmy + 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  public getWorldWidth(): number { return this.cols * this.tileSize; }
  public getWorldHeight(): number { return this.rows * this.tileSize; }
}
