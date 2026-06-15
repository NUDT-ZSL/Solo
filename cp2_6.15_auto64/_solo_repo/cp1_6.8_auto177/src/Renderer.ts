import {
  type GridCell,
  type Particle,
  GRID_SIZE,
  DIRT_COLORS,
  BONE_COLOR,
  BONE_SHADOW,
  BONE_HIGHLIGHT,
  SURFACE_COLOR,
  THEME,
} from './FossilData';
import { type GridEngine } from './GridEngine';

const CELL_SIZE = 60;
const GRID_PADDING = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE + GRID_PADDING * 2;

export { CELL_SIZE, GRID_PADDING, CANVAS_SIZE };

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gridEngine: GridEngine;
  private particles: Particle[] = [];
  private ambientParticles: Particle[] = [];
  private animationId: number = 0;
  private lastTime: number = 0;
  private hoverCell: { row: number; col: number } | null = null;
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement, gridEngine: GridEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.gridEngine = gridEngine;
    this.initAmbientParticles();
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  setHoverCell(row: number | null, col: number | null): void {
    if (row === null || col === null) {
      this.hoverCell = null;
    } else {
      this.hoverCell = { row, col };
    }
  }

  addDustParticles(cellRow: number, cellCol: number, count: number): void {
    const cx = GRID_PADDING + cellCol * CELL_SIZE + CELL_SIZE / 2;
    const cy = GRID_PADDING + cellRow * CELL_SIZE + CELL_SIZE / 2;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: cx + (Math.random() - 0.5) * CELL_SIZE * 0.5,
        y: cy + (Math.random() - 0.5) * CELL_SIZE * 0.5,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 2 - 0.5,
        life: 1,
        maxLife: 0.6 + Math.random() * 0.4,
        type: 'dust',
        size: 2 + Math.random() * 4,
        color: DIRT_COLORS[Math.floor(Math.random() * DIRT_COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
      });
    }
  }

  addCrackParticles(cellRow: number, cellCol: number, count: number): void {
    const cx = GRID_PADDING + cellCol * CELL_SIZE + CELL_SIZE / 2;
    const cy = GRID_PADDING + cellRow * CELL_SIZE + CELL_SIZE / 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        maxLife: 0.3 + Math.random() * 0.5,
        type: 'crack',
        size: 3 + Math.random() * 6,
        color: '#8B7355',
        rotation: angle,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
      });
    }
  }

  addConfetti(count: number): void {
    const w = this.canvas.width;
    for (let i = 0; i < count; i++) {
      const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
      this.particles.push({
        x: Math.random() * w,
        y: -20 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 3,
        vy: 1 + Math.random() * 3,
        life: 1,
        maxLife: 3 + Math.random() * 2,
        type: 'confetti',
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      });
    }
  }

  private initAmbientParticles(): void {
    this.ambientParticles = [];
    for (let i = 0; i < 40; i++) {
      this.ambientParticles.push({
        x: Math.random() * CANVAS_SIZE,
        y: Math.random() * CANVAS_SIZE,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.2 - 0.05,
        life: Math.random(),
        maxLife: 3 + Math.random() * 4,
        type: 'ambient',
        size: 1 + Math.random() * 2,
        color: 'rgba(245, 230, 200, 0.3)',
        rotation: 0,
        rotationSpeed: 0,
      });
    }
  }

  private loop = (timestamp: number): void => {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;
    this.time += dt;

    this.gridEngine.updateShake();
    this.updateParticles(dt);
    this.updateAmbientParticles(dt);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt / p.maxLife;
      p.rotation += p.rotationSpeed;

      if (p.type === 'confetti') {
        p.vy += 0.05;
        p.vx *= 0.99;
      } else if (p.type === 'dust') {
        p.vy -= 0.02;
        p.vx *= 0.97;
      } else if (p.type === 'crack') {
        p.vy += 0.15;
        p.vx *= 0.96;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateAmbientParticles(dt: number): void {
    for (const p of this.ambientParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt / p.maxLife;

      if (p.life <= 0 || p.y < -10) {
        p.x = Math.random() * CANVAS_SIZE;
        p.y = CANVAS_SIZE + 10;
        p.life = 1;
        p.vx = (Math.random() - 0.5) * 0.3;
        p.vy = -Math.random() * 0.2 - 0.05;
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const shake = this.gridEngine.getShakeOffset();

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(shake.x, shake.y);

    this.renderBackground();
    this.renderGridCells();
    this.renderHover();
    this.renderGridLines();
    this.renderParticles();
    this.renderAmbientDust();

    ctx.restore();
  }

  private renderBackground(): void {
    const ctx = this.ctx;

    ctx.fillStyle = THEME.bg;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const gradient = ctx.createRadialGradient(
      CANVAS_SIZE / 2, CANVAS_SIZE / 2, 50,
      CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE * 0.7
    );
    gradient.addColorStop(0, 'rgba(245, 230, 200, 0.08)');
    gradient.addColorStop(1, 'rgba(44, 30, 20, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private renderGridCells(): void {
    const ctx = this.ctx;
    const grid = this.gridEngine.getGrid();

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = grid[r][c];
        const x = GRID_PADDING + c * CELL_SIZE;
        const y = GRID_PADDING + r * CELL_SIZE;

        if (cell.boneId && cell.revealProgress > 0) {
          this.renderBoneCell(ctx, cell, x, y);
        }

        if (cell.dirtRemaining > 0) {
          this.renderDirtCell(ctx, cell, x, y);
        }

        if (cell.isRevealed && !cell.boneId) {
          this.renderEmptyCell(ctx, x, y);
        }
      }
    }
  }

  private renderBoneCell(ctx: CanvasRenderingContext2D, cell: GridCell, x: number, y: number): void {
    const bone = this.gridEngine.getBone(cell.boneId!);
    if (!bone) return;

    const alpha = Math.min(cell.revealProgress * 1.5, 1);
    ctx.globalAlpha = alpha;

    ctx.fillStyle = BONE_COLOR;
    ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

    ctx.fillStyle = BONE_HIGHLIGHT;
    ctx.fillRect(x + 4, y + 4, CELL_SIZE - 12, CELL_SIZE - 12);

    ctx.fillStyle = BONE_SHADOW;
    ctx.fillRect(x + CELL_SIZE - 8, y + 4, 4, CELL_SIZE - 8);
    ctx.fillRect(x + 4, y + CELL_SIZE - 8, CELL_SIZE - 8, 4);

    const veinSeed = cell.row * 8 + cell.col;
    ctx.fillStyle = 'rgba(180, 160, 130, 0.3)';
    for (let i = 0; i < 3; i++) {
      const vx = x + seededRandom(veinSeed + i * 7) * (CELL_SIZE - 8) + 4;
      const vy = y + seededRandom(veinSeed + i * 13) * (CELL_SIZE - 8) + 4;
      const vs = 2 + seededRandom(veinSeed + i * 19) * 4;
      ctx.fillRect(vx, vy, vs, vs * 0.4);
    }

    ctx.globalAlpha = 1;
  }

  private renderDirtCell(ctx: CanvasRenderingContext2D, cell: GridCell, x: number, y: number): void {
    const dirtRatio = cell.dirtRemaining / cell.dirtThickness;
    const colorIndex = Math.min(Math.floor((1 - dirtRatio) * DIRT_COLORS.length), DIRT_COLORS.length - 1);
    const baseColor = DIRT_COLORS[colorIndex];

    ctx.globalAlpha = 0.6 + dirtRatio * 0.4;
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

    const seed = cell.row * 100 + cell.col;
    for (let py = 0; py < CELL_SIZE; py += 4) {
      for (let px = 0; px < CELL_SIZE; px += 4) {
        if (seededRandom(seed + py * 31 + px * 17) > 0.55) {
          const shade = seededRandom(seed + py * 23 + px * 11);
          ctx.fillStyle = shade > 0.5
            ? 'rgba(0, 0, 0, 0.1)'
            : 'rgba(255, 255, 255, 0.05)';
          ctx.fillRect(x + px, y + py, 4, 4);
        }
      }
    }

    if (cell.crackLevel > 0) {
      this.renderCracks(ctx, cell, x, y);
    }

    if (cell.boneId && cell.revealProgress > 0) {
      ctx.fillStyle = SURFACE_COLOR;
      ctx.globalAlpha = (1 - dirtRatio) * 0.6;
      for (let py = 0; py < CELL_SIZE; py += 6) {
        for (let px = 0; px < CELL_SIZE; px += 6) {
          if (seededRandom(seed + py * 41 + px * 29 + 999) > 0.7) {
            ctx.fillRect(x + px, y + py, 3, 3);
          }
        }
      }
    }

    ctx.globalAlpha = 1;
  }

  private renderCracks(ctx: CanvasRenderingContext2D, cell: GridCell, x: number, y: number): void {
    const seed = cell.row * 50 + cell.col + 777;
    ctx.strokeStyle = 'rgba(30, 15, 5, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const numCracks = cell.crackLevel;
    for (let i = 0; i < numCracks; i++) {
      const startX = x + CELL_SIZE * 0.2 + seededRandom(seed + i * 3) * CELL_SIZE * 0.6;
      const startY = y + CELL_SIZE * 0.2 + seededRandom(seed + i * 7) * CELL_SIZE * 0.6;

      ctx.moveTo(startX, startY);
      let cx = startX;
      let cy = startY;

      const segments = 3 + Math.floor(seededRandom(seed + i * 11) * 4);
      for (let s = 0; s < segments; s++) {
        cx += (seededRandom(seed + i * 13 + s * 5) - 0.5) * 15;
        cy += (seededRandom(seed + i * 17 + s * 3) - 0.5) * 15;
        cx = Math.max(x, Math.min(x + CELL_SIZE, cx));
        cy = Math.max(y, Math.min(y + CELL_SIZE, cy));
        ctx.lineTo(cx, cy);
      }
    }

    ctx.stroke();
  }

  private renderEmptyCell(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = 'rgba(44, 30, 20, 0.6)';
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

    const seed = Math.floor(x * 0.1 + y * 0.1);
    ctx.fillStyle = 'rgba(60, 40, 25, 0.3)';
    for (let py = 0; py < CELL_SIZE; py += 8) {
      for (let px = 0; px < CELL_SIZE; px += 8) {
        if (seededRandom(seed + py * 11 + px * 7) > 0.6) {
          ctx.fillRect(x + px, y + py, 6, 6);
        }
      }
    }
  }

  private renderGridLines(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(139, 105, 20, 0.2)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= GRID_SIZE; i++) {
      const x = GRID_PADDING + i * CELL_SIZE;
      const y = GRID_PADDING + i * CELL_SIZE;

      ctx.beginPath();
      ctx.moveTo(x, GRID_PADDING);
      ctx.lineTo(x, GRID_PADDING + GRID_SIZE * CELL_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(GRID_PADDING, y);
      ctx.lineTo(GRID_PADDING + GRID_SIZE * CELL_SIZE, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(139, 105, 20, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      GRID_PADDING,
      GRID_PADDING,
      GRID_SIZE * CELL_SIZE,
      GRID_SIZE * CELL_SIZE
    );
  }

  private renderHover(): void {
    if (!this.hoverCell) return;

    const ctx = this.ctx;
    const { row, col } = this.hoverCell;
    const x = GRID_PADDING + col * CELL_SIZE;
    const y = GRID_PADDING + row * CELL_SIZE;

    const tool = this.gridEngine.getActiveTool();
    if (tool === 'pickaxe') {
      ctx.strokeStyle = 'rgba(139, 105, 20, 0.6)';
      ctx.lineWidth = 2;

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (Math.abs(dr) + Math.abs(dc) <= 1) {
            const hr = row + dr;
            const hc = col + dc;
            if (hr >= 0 && hr < GRID_SIZE && hc >= 0 && hc < GRID_SIZE) {
              ctx.strokeRect(
                GRID_PADDING + hc * CELL_SIZE + 1,
                GRID_PADDING + hr * CELL_SIZE + 1,
                CELL_SIZE - 2,
                CELL_SIZE - 2
              );
            }
          }
        }
      }
    } else {
      ctx.fillStyle = 'rgba(245, 230, 200, 0.1)';
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = 'rgba(245, 230, 200, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    }
  }

  private renderParticles(): void {
    const ctx = this.ctx;

    for (const p of this.particles) {
      const alpha = Math.max(0, p.life);
      ctx.globalAlpha = alpha;

      if (p.type === 'dust') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'crack') {
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else if (p.type === 'confetti') {
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
    }

    ctx.globalAlpha = 1;
  }

  private renderAmbientDust(): void {
    const ctx = this.ctx;

    for (const p of this.ambientParticles) {
      const alpha = Math.sin(p.life * Math.PI) * 0.4;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = 'rgba(245, 230, 200, 0.5)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  getCanvasCoords(clientX: number, clientY: number): { row: number; col: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX - GRID_PADDING;
    const y = (clientY - rect.top) * scaleY - GRID_PADDING;

    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);

    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      return { row, col };
    }
    return null;
  }
}
