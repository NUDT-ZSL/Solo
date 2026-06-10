import { GameState, Talisman, ElementType, StoneWall } from './gameState';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'fire' | 'ice' | 'wind' | 'stone';
}

class ParticlePool {
  private pool: Particle[];
  private activeList: Particle[];

  constructor(maxSize: number) {
    this.pool = [];
    this.activeList = [];
    for (let i = 0; i < maxSize; i++) {
      this.pool.push({
        active: false,
        x: 0, y: 0, vx: 0, vy: 0,
        radius: 0, color: '', life: 0, maxLife: 0, type: 'fire'
      });
    }
  }

  acquire(): Particle | null {
    for (const p of this.pool) {
      if (!p.active) {
        p.active = true;
        this.activeList.push(p);
        return p;
      }
    }
    return null;
  }

  spawn(params: Partial<Particle>): Particle | null {
    let p = this.acquire();
    if (!p) {
      this.activeList.sort((a, b) => a.life - b.life);
      p = this.activeList.shift() || null;
      if (!p) return null;
    }
    Object.assign(p, {
      x: 0, y: 0, vx: 0, vy: 0, radius: 3, color: '#fff',
      life: 0.5, maxLife: 0.5, type: 'fire' as const,
      active: true,
      ...params
    });
    if (!this.activeList.includes(p)) this.activeList.push(p);
    return p;
  }

  update(dt: number): void {
    for (let i = this.activeList.length - 1; i >= 0; i--) {
      const p = this.activeList[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.type === 'fire') p.vy += 0.1;
      else if (p.type === 'wind') {
        const ang = Math.atan2(p.vy, p.vx);
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        p.vx = Math.cos(ang + 0.08) * spd;
        p.vy = Math.sin(ang + 0.08) * spd;
      } else if (p.type === 'stone') {
        p.vy += 0.15;
      }
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.activeList.splice(i, 1);
      }
    }
  }

  forEach(fn: (p: Particle) => void): void {
    for (const p of this.activeList) fn(p);
  }

  count(): number {
    return this.activeList.length;
  }

  clear(): void {
    for (const p of this.activeList) p.active = false;
    this.activeList.length = 0;
  }
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;
  private cellSize: number;
  private boardX: number;
  private boardY: number;
  private boardSize: number;
  private particles: ParticlePool;
  private time: number;
  private hoveredCell: { row: number; col: number } | null;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private comboFlashTime: number;

  private _easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  constructor(canvas: HTMLCanvasElement, gameState: GameState) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.gameState = gameState;
    this.cellSize = 70;
    this.boardX = 0;
    this.boardY = 0;
    this.boardSize = 490;
    this.particles = new ParticlePool(200);
    this.time = 0;
    this.hoveredCell = null;
    this.comboFlashTime = 0;

    this.offscreenCanvas = document.createElement('canvas');
    const offCtx = this.offscreenCanvas.getContext('2d');
    if (!offCtx) throw new Error('Failed to get offscreen context');
    this.offscreenCtx = offCtx;

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.gameState.onCombo = () => {
      this.comboFlashTime = 0.5;
    };
  }

  resize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    this.canvas.width = width;
    this.canvas.height = height;
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
    this.boardSize = Math.min(width * 0.5, 490);
    this.cellSize = this.boardSize / GameState.GRID_SIZE;
    this.boardX = (width - this.boardSize) / 2;
    this.boardY = (height - this.boardSize) / 2 + 20;
  }

  update(dt: number): void {
    this.time += dt;
    if (this.comboFlashTime > 0) this.comboFlashTime -= dt;
    this.particles.update(dt);
  }

  render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.drawBackgroundToOffscreen(w, h);
    ctx.drawImage(this.offscreenCanvas, 0, 0);

    this.drawBoard(ctx);
    this.drawEffects(ctx);
    this.drawTalismans(ctx);
    this.drawParticles(ctx);
    this.drawScorePopups(ctx);
    this.drawUI(ctx);

    if (this.comboFlashTime > 0) {
      ctx.save();
      ctx.globalAlpha = this.comboFlashTime / 0.5 * 0.3;
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  private drawBackgroundToOffscreen(w: number, h: number): void {
    const ctx = this.offscreenCtx;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0B0B2B');
    g.addColorStop(1, '#1A0A3A');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  private drawBoard(ctx: CanvasRenderingContext2D): void {
    const x = this.boardX;
    const y = this.boardY;
    const size = this.boardSize;
    const gs = GameState.GRID_SIZE;
    const cs = this.cellSize;

    ctx.save();
    ctx.shadowColor = '#C5A55A80';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#1C1C3A';
    ctx.fillRect(x - 2, y - 2, size + 4, size + 4);
    ctx.restore();

    ctx.strokeStyle = '#2A2A5A';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let i = 0; i <= gs; i++) {
      ctx.moveTo(x + i * cs, y);
      ctx.lineTo(x + i * cs, y + size);
      ctx.moveTo(x, y + i * cs);
      ctx.lineTo(x + size, y + i * cs);
    }
    ctx.stroke();

    ctx.strokeStyle = '#1A1A2E';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);
  }

  private drawEffects(ctx: CanvasRenderingContext2D): void {
    for (const eff of this.gameState.iceEffects) {
      const x = this.boardX + eff.col * this.cellSize;
      const y = this.boardY + eff.row * this.cellSize;
      const s = this.cellSize;
      const a = eff.life / eff.maxLife;
      ctx.strokeStyle = `rgba(224, 255, 255, ${a})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
      ctx.fillStyle = `rgba(224, 255, 255, ${a * 0.15})`;
      ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
    }

    for (const spot of this.gameState.lavaSpots) {
      const cx = this.boardX + (spot.x + 0.5) * this.cellSize;
      const cy = this.boardY + (spot.y + 0.5) * this.cellSize;
      const r = (20 / 70) * this.cellSize;
      const a = spot.life / spot.maxLife;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(255, 69, 0, ${a * 0.6})`);
      g.addColorStop(0.5, `rgba(255, 140, 0, ${a * 0.4})`);
      g.addColorStop(1, `rgba(255, 69, 0, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const wall of this.gameState.stoneWalls) {
      this.drawStoneWall(ctx, wall);
    }
  }

  private drawStoneWall(ctx: CanvasRenderingContext2D, wall: StoneWall): void {
    const cx = this.boardX + (wall.col + 0.5) * this.cellSize;
    const cy = this.boardY + (wall.row + 0.5) * this.cellSize;
    const a = wall.isCollapsing ? Math.max(0, wall.life / 0.5) : 1;

    ctx.fillStyle = `rgba(92, 64, 51, ${a})`;

    if (wall.direction === 'horizontal') {
      const w = (20 / 70) * this.cellSize;
      ctx.fillRect(cx - w / 2, cy - 1, w, 2);
    } else {
      const h = (20 / 70) * this.cellSize;
      ctx.fillRect(cx - 1, cy - h / 2, 2, h);
    }

    if (wall.isCollapsing && Math.random() < 0.3) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 0.5 + Math.random();
      this.particles.spawn({
        x: cx, y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd + 0.5,
        radius: 2 + Math.random(),
        color: '#5C4033',
        life: 0.5, maxLife: 0.5,
        type: 'stone'
      });
    }
  }

  private drawTalismans(ctx: CanvasRenderingContext2D): void {
    const gs = GameState.GRID_SIZE;
    for (let r = 0; r < gs; r++) {
      for (let c = 0; c < gs; c++) {
        const t = this.gameState.grid[r][c];
        if (t) this.drawTalisman(ctx, t);
      }
    }
  }

  private drawTalisman(ctx: CanvasRenderingContext2D, t: Talisman): void {
    let prog = 0;
    if (t.isMoving) {
      prog = this._easeOutCubic(Math.min(1, t.moveProgress));
    }
    const dr = t.targetRow - t.startRow;
    const dc = t.targetCol - t.startCol;
    const curR = t.startRow + dr * prog;
    const curC = t.startCol + dc * prog;

    const cx = this.boardX + (curC + 0.5) * this.cellSize;
    const cy = this.boardY + (curR + 0.5) * this.cellSize;

    let size = this.cellSize * 0.8;

    if (t.isRemoving) {
      const s = 1 - t.removeProgress * 0.5;
      size *= s;
      this.spawnElementParticles(t.element, cx, cy);
    }
    if (t.isNew) {
      size *= 0.5 + t.newProgress * 0.5;
    }

    const isSel = this.gameState.selectedTalisman?.id === t.id;
    const isHov = this.hoveredCell?.row === t.row && this.hoveredCell?.col === t.col;

    if (isHov && !t.isRemoving) size *= 1.1;
    if (isSel) this.drawGlow(ctx, cx, cy, size);

    this.drawShape(ctx, t.element, cx, cy, size);
    this.drawSymbol(ctx, t.element, cx, cy, size);
  }

  private drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const gs = size * 0.65;
    const rot = this.time * Math.PI;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;
    const corners = [
      { x: -gs, y: -gs }, { x: gs, y: -gs },
      { x: gs, y: gs }, { x: -gs, y: gs }
    ];
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const c1 = corners[i];
      const c2 = corners[(i + 1) % 4];
      const mx = (c1.x + c2.x) / 2;
      const my = (c1.y + c2.y) / 2;
      if (i === 0) ctx.moveTo(c1.x, c1.y);
      ctx.quadraticCurveTo(mx, my, c2.x, c2.y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0;
  }

  private drawShape(ctx: CanvasRenderingContext2D, el: ElementType, x: number, y: number, size: number): void {
    const color = GameState.ELEMENT_COLORS[el];
    const half = size / 2;
    const rad = Math.min(8, half);

    ctx.save();
    ctx.translate(x, y);
    const g = ctx.createLinearGradient(-half, -half, half, half);
    g.addColorStop(0, this.lighten(color, 30));
    g.addColorStop(1, this.darken(color, 30));
    ctx.fillStyle = g;

    ctx.beginPath();
    ctx.moveTo(-half + rad, -half);
    ctx.lineTo(half - rad, -half);
    ctx.quadraticCurveTo(half, -half, half, -half + rad);
    ctx.lineTo(half, half - rad);
    ctx.quadraticCurveTo(half, half, half - rad, half);
    ctx.lineTo(-half + rad, half);
    ctx.quadraticCurveTo(-half, half, -half, half - rad);
    ctx.lineTo(-half, -half + rad);
    ctx.quadraticCurveTo(-half, -half, -half + rad, -half);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = this.lighten(color, 50);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private drawSymbol(ctx: CanvasRenderingContext2D, el: ElementType, x: number, y: number, size: number): void {
    const ss = size * 0.4;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#FFFFFF';
    ctx.fillStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (el) {
      case 'fire': {
        const s = ss / 2;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(s * 0.6, -s * 0.3, s * 0.3, s * 0.2);
        ctx.quadraticCurveTo(s * 0.5, s * 0.5, 0, s * 0.6);
        ctx.quadraticCurveTo(-s * 0.5, s * 0.5, -s * 0.3, s * 0.2);
        ctx.quadraticCurveTo(-s * 0.6, -s * 0.3, 0, -s);
        ctx.fill();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, -s * 0.2);
        ctx.quadraticCurveTo(0, -s * 0.4, s * 0.2, -s * 0.2);
        ctx.quadraticCurveTo(s * 0.1, 0, 0, s * 0.1);
        ctx.quadraticCurveTo(-s * 0.1, 0, -s * 0.2, -s * 0.2);
        ctx.stroke();
        break;
      }
      case 'water': {
        const s = ss / 2;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(s, 0, 0, s * 0.8);
        ctx.quadraticCurveTo(-s, 0, 0, -s);
        ctx.fill();
        ctx.strokeStyle = '#E0FFFF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-s * 0.4, -s * 0.1);
        ctx.quadraticCurveTo(-s * 0.2, -s * 0.2, 0, -s * 0.1);
        ctx.quadraticCurveTo(s * 0.2, 0, s * 0.4, -s * 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-s * 0.3, s * 0.2);
        ctx.quadraticCurveTo(-s * 0.1, s * 0.1, s * 0.1, s * 0.2);
        ctx.quadraticCurveTo(s * 0.3, s * 0.3, s * 0.4, s * 0.2);
        ctx.stroke();
        break;
      }
      case 'wind': {
        const s = ss / 2;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const r = s * (0.3 + i * 0.25);
          const sa = -Math.PI / 2 + i * 0.5;
          const ea = sa + Math.PI * 1.2;
          ctx.arc(0, 0, r, sa, ea);
        }
        ctx.lineWidth = 2;
        ctx.stroke();
        const ang = -Math.PI / 2 + Math.PI * 1.2;
        const tx = Math.cos(ang) * s * 0.8;
        const ty = Math.sin(ang) * s * 0.8;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - s * 0.15, ty - s * 0.1);
        ctx.lineTo(tx - s * 0.05, ty + s * 0.15);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'earth': {
        const s = ss / 2;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.8, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#D2B48C';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-s * 0.3, -s * 0.2);
        ctx.lineTo(s * 0.3, -s * 0.2);
        ctx.moveTo(-s * 0.4, s * 0.1);
        ctx.lineTo(s * 0.4, s * 0.1);
        ctx.moveTo(-s * 0.2, s * 0.4);
        ctx.lineTo(s * 0.2, s * 0.4);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  private spawnElementParticles(el: ElementType, x: number, y: number): void {
    if (Math.random() > 0.6) return;
    switch (el) {
      case 'fire': {
        const n = 2 + Math.floor(Math.random() * 2);
        const colors = ['#FF4500', '#FF8C00', '#FFD700', '#FF6347'];
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 2 + Math.random() * 2;
          this.particles.spawn({
            x, y,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
            radius: 3 + Math.random() * 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 0.8, maxLife: 0.8, type: 'fire'
          });
        }
        break;
      }
      case 'water': {
        const n = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) {
          const a = (Math.PI * 2 * i) / n + Math.random() * 0.3;
          const sp = 1 + Math.random();
          this.particles.spawn({
            x, y,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            radius: 2 + Math.random() * 2,
            color: '#E0FFFF',
            life: 0.6, maxLife: 0.6, type: 'ice'
          });
        }
        break;
      }
      case 'wind': {
        const n = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 1.5 + Math.random() * 1.5;
          this.particles.spawn({
            x, y,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            radius: 2 + Math.random() * 2,
            color: '#90EE90',
            life: 0.7, maxLife: 0.7, type: 'wind'
          });
        }
        break;
      }
      case 'earth': {
        const n = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 1 + Math.random() * 2;
          this.particles.spawn({
            x, y,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 0.5,
            radius: 2 + Math.random() * 3,
            color: '#8B4513',
            life: 0.5, maxLife: 0.5, type: 'stone'
          });
        }
        break;
      }
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    this.particles.forEach(p => {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private drawScorePopups(ctx: CanvasRenderingContext2D): void {
    for (const p of this.gameState.scorePopups) {
      const x = this.boardX + (p.x + 0.5) * this.cellSize;
      const y = this.boardY + (p.y + 0.5) * this.cellSize;
      const prog = 1 - p.life / p.maxLife;
      const a = p.life / p.maxLife;
      const sc = 1 + prog * 0.3;
      const oy = -prog * 30;

      ctx.save();
      ctx.translate(x, y + oy);
      ctx.scale(sc, sc);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 20px Microsoft YaHei, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 10;
      ctx.fillText(p.isCombo ? `+${p.score} x2!` : `+${p.score}`, 0, 0);
      ctx.restore();
    }
  }

  private drawUI(ctx: CanvasRenderingContext2D): void {
    const cx = this.canvas.width / 2;
    const ty = this.boardY - 60;
    this.drawTimer(ctx, cx - 80, ty);
    this.drawScore(ctx, cx + 40, ty);
  }

  private drawTimer(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const rad = 20;
    const prog = this.gameState.timeLeft / GameState.GAME_DURATION;
    ctx.save();
    ctx.translate(x, y);

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.stroke();

    const r = Math.floor(255 * (1 - prog));
    const g = Math.floor(255 * prog);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
    grad.addColorStop(0, `rgb(${r},${g},0)`);
    grad.addColorStop(1, `rgb(${Math.floor(r * 0.8)},${Math.floor(g * 0.8)},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, rad - 2, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Microsoft YaHei, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.ceil(this.gameState.timeLeft).toString(), 0, 0);
    ctx.restore();
  }

  private drawScore(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px Microsoft YaHei, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 5;
    ctx.fillText(`得分: ${this.gameState.score}`, x, y);
    ctx.restore();
  }

  setHoveredCell(row: number | null, col: number | null): void {
    this.hoveredCell = (row === null || col === null) ? null : { row, col };
  }

  getCellAtPosition(clientX: number, clientY: number): { row: number; col: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left - this.boardX;
    const y = clientY - rect.top - this.boardY;
    if (x < 0 || x >= this.boardSize || y < 0 || y >= this.boardSize) return null;
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    if (row >= 0 && row < GameState.GRID_SIZE && col >= 0 && col < GameState.GRID_SIZE) {
      return { row, col };
    }
    return null;
  }

  private lighten(c: string, p: number): string {
    const n = parseInt(c.replace('#', ''), 16);
    const amt = Math.round(2.55 * p);
    const R = Math.min(255, (n >> 16) + amt);
    const G = Math.min(255, ((n >> 8) & 0xFF) + amt);
    const B = Math.min(255, (n & 0xFF) + amt);
    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
  }

  private darken(c: string, p: number): string {
    const n = parseInt(c.replace('#', ''), 16);
    const amt = Math.round(2.55 * p);
    const R = Math.max(0, (n >> 16) - amt);
    const G = Math.max(0, ((n >> 8) & 0xFF) - amt);
    const B = Math.max(0, (n & 0xFF) - amt);
    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
  }

  getCanvas(): HTMLCanvasElement { return this.canvas; }
  getParticleCount(): number { return this.particles.count(); }
}
