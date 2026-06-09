import {
  HexCell,
  HexCoord,
  drawHex,
  isAdjacent,
  getTerrainFillStyle,
  drawTerrainPattern,
} from './Grid';

export type TowerLevel = 1 | 2 | 3;
export type EnemyType = 'normal' | 'scout' | 'tank';
export type ParticleType =
  | 'build'
  | 'projectile'
  | 'pulse'
  | 'death'
  | 'explosion'
  | 'splash';
export type GameStatus = 'playing' | 'won' | 'lost';

export interface Tower {
  id: string;
  coord: HexCoord;
  level: TowerLevel;
  x: number;
  y: number;
  range: number;
  attackInterval: number;
  lastAttackTime: number;
  baseDamage: number;
  buildProgress: number;
  chargedUntil: number;
  deathExplosionTriggered: boolean;
  rotation: number;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  pathIndex: number;
  attackCooldown: number;
}

export interface Core {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  isMoving: boolean;
  moveSpeed: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  currentCell: HexCoord;
  lastPulseTime: number;
}

export interface Particle {
  id: string;
  type: ParticleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  trailLength?: number;
}

export interface UIData {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  wave: number;
  totalWaves: number;
  remainingEnemies: number;
  status: GameStatus;
  selectedTower: Tower | null;
}

export interface RenderState {
  grid: HexCell[][];
  core: Core;
  towers: Map<string, Tower>;
  enemies: Enemy[];
  particles: Particle[];
  selectedCell: HexCoord | null;
  ui: UIData;
  hexWidth: number;
  isMobile: boolean;
  time: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.updateDPR();
  }

  updateDPR(): void {
    this.dpr = window.devicePixelRatio || 1;
  }

  resize(width: number, height: number): void {
    this.updateDPR();
    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  get width(): number {
    return this.canvas.width / this.dpr;
  }

  get height(): number {
    return this.canvas.height / this.dpr;
  }

  clear(): void {
    this.ctx.fillStyle = '#0A0E27';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawScene(state: RenderState): void {
    const { grid, core, towers, enemies, particles, selectedCell, hexWidth, time } = state;
    this.clear();
    this.drawGrid(grid, selectedCell, core.currentCell, hexWidth, time);
    this.drawEnemies(enemies);
    this.drawTowers(towers, time);
    this.drawCore(core, time);
    this.drawParticles(particles);
    this.drawUpgradePanel(state);
    this.drawGameEndOverlay(state.ui);
  }

  private drawGrid(
    grid: HexCell[][],
    selectedCell: HexCoord | null,
    coreCoord: HexCoord,
    hexWidth: number,
    time: number
  ): void {
    const ctx = this.ctx;
    for (const row of grid) {
      for (const cell of row) {
        const fill = getTerrainFillStyle(cell.terrain, time);
        drawHex(
          ctx,
          cell.pixelX,
          cell.pixelY,
          hexWidth * 0.96,
          fill,
          'rgba(255,255,255,0.15)',
          1
        );
        drawTerrainPattern(ctx, cell, hexWidth, time);

        const isCoreCell =
          cell.coord.q === coreCoord.q && cell.coord.r === coreCoord.r;
        const adj = isAdjacent(coreCoord, cell.coord);
        const isSelected =
          selectedCell &&
          selectedCell.q === cell.coord.q &&
          selectedCell.r === cell.coord.r;

        if (isCoreCell) {
          drawHex(
            ctx,
            cell.pixelX,
            cell.pixelY,
            hexWidth * 0.92,
            'rgba(0, 191, 255, 0.12)',
            'rgba(120, 220, 255, 0.7)',
            2
          );
        } else if (adj && !cell.hasTower) {
          drawHex(
            ctx,
            cell.pixelX,
            cell.pixelY,
            hexWidth * 0.92,
            'rgba(140, 255, 180, 0.10)',
            'rgba(140, 255, 180, 0.55)',
            1.5
          );
        }
        if (isSelected) {
          drawHex(
            ctx,
            cell.pixelX,
            cell.pixelY,
            hexWidth * 0.9,
            'rgba(255, 240, 120, 0.08)',
            'rgba(255, 240, 120, 0.85)',
            2.5
          );
        }
      }
    }
  }

  private drawTowers(towers: Map<string, Tower>, time: number): void {
    const ctx = this.ctx;
    for (const tower of towers.values()) {
      const progress = Math.min(1, tower.buildProgress);
      const charged = time < tower.chargedUntil;
      const scale = 0.4 + progress * 0.6;
      const height = 40 * scale;
      const baseWidth = 30 * scale;

      ctx.save();
      ctx.translate(tower.x, tower.y);

      if (progress < 1) {
        ctx.globalAlpha = progress;
      }

      if (charged) {
        const pulse = 0.5 + 0.5 * Math.sin(time / 120);
        const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, baseWidth * 1.3);
        glow.addColorStop(0, `rgba(180, 230, 255, ${0.35 * pulse})`);
        glow.addColorStop(1, 'rgba(0, 120, 220, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, baseWidth * 1.3, 0, Math.PI * 2);
        ctx.fill();
      }

      let colorTop = '#FFFFFF';
      let colorBottom = '#E0E8FF';
      if (tower.level === 2) {
        colorTop = '#9DCFFF';
        colorBottom = '#2E6BFF';
      } else if (tower.level === 3) {
        colorTop = '#E9B8FF';
        colorBottom = '#8A2BE2';
      }

      ctx.beginPath();
      ctx.moveTo(-baseWidth / 2, height * 0.1);
      ctx.lineTo(0, -height);
      ctx.lineTo(baseWidth / 2, height * 0.1);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, -height, 0, height * 0.1);
      grad.addColorStop(0, colorTop);
      grad.addColorStop(1, colorBottom);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-baseWidth / 2, height * 0.1);
      ctx.lineTo(0, height * 0.22);
      ctx.lineTo(baseWidth / 2, height * 0.1);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fill();

      if (tower.level === 3 && progress >= 1) {
        const rot = tower.rotation;
        ctx.save();
        ctx.rotate(rot);
        for (let i = 0; i < 3; i++) {
          ctx.rotate((Math.PI * 2) / 3);
          const rg = ctx.createRadialGradient(
            baseWidth * 0.55,
            0,
            0,
            baseWidth * 0.55,
            0,
            10
          );
          rg.addColorStop(0, 'rgba(220, 180, 255, 0.95)');
          rg.addColorStop(1, 'rgba(138, 43, 226, 0)');
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(baseWidth * 0.55, 0, 10, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (tower.level >= 1) {
        ctx.fillStyle = tower.level === 3 ? '#FFD9FF' : tower.level === 2 ? '#D9EAFF' : '#FFF8E0';
        ctx.beginPath();
        ctx.arc(0, -height * 0.88, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawEnemies(enemies: Enemy[]): void {
    const ctx = this.ctx;
    for (const enemy of enemies) {
      let size = 10;
      let color = '#FF6B6B';
      let shape: 'circle' | 'triangle' | 'square' = 'circle';
      if (enemy.type === 'scout') {
        size = 7;
        color = '#FFD93D';
        shape = 'triangle';
      } else if (enemy.type === 'tank') {
        size = 14;
        color = '#8B5A2B';
        shape = 'square';
      }

      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      const hpRatio = enemy.hp / enemy.maxHp;
      const barW = size * 2.4;
      const barH = 3;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-barW / 2, -size - 10, barW, barH);
      ctx.fillStyle =
        hpRatio > 0.5 ? '#7CFF7C' : hpRatio > 0.25 ? '#FFD93D' : '#FF6B6B';
      ctx.fillRect(-barW / 2, -size - 10, barW * hpRatio, barH);

      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (shape === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size, size);
        ctx.lineTo(-size, size);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(-size, -size, size * 2, size * 2);
        ctx.strokeRect(-size, -size, size * 2, size * 2);
      }

      const innerColor = 'rgba(255,255,255,0.4)';
      ctx.fillStyle = innerColor;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawCore(core: Core, time: number): void {
    const ctx = this.ctx;
    const pulse = 0.5 + 0.5 * Math.sin(time / 250);

    const glow1 = ctx.createRadialGradient(core.x, core.y, 4, core.x, core.y, 40);
    glow1.addColorStop(0, 'rgba(160, 230, 255, 0.65)');
    glow1.addColorStop(0.6, 'rgba(0, 170, 255, 0.25)');
    glow1.addColorStop(1, 'rgba(0, 80, 180, 0)');
    ctx.fillStyle = glow1;
    ctx.beginPath();
    ctx.arc(core.x, core.y, 40 + pulse * 6, 0, Math.PI * 2);
    ctx.fill();

    const mainGrad = ctx.createRadialGradient(core.x, core.y, 2, core.x, core.y, 18);
    mainGrad.addColorStop(0, '#FFFFFF');
    mainGrad.addColorStop(0.4, '#7AE7FF');
    mainGrad.addColorStop(1, '#0078D4');
    ctx.fillStyle = mainGrad;
    ctx.beginPath();
    ctx.arc(core.x, core.y, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.strokeStyle = `rgba(180, 240, 255, ${0.3 + pulse * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(core.x, core.y, 22 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    for (const p of particles) {
      const t = 1 - p.life / p.maxLife;
      const alpha = Math.max(0, 1 - t);
      ctx.save();
      if (p.type === 'pulse') {
        const radius = p.size * t;
        ctx.strokeStyle = `rgba(120, 200, 255, ${alpha * 0.6})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(180, 230, 255, ${alpha * 0.3})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 0.9, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'projectile' && p.startX !== undefined && p.endX !== undefined) {
        const sx = p.startX + (p.endX - p.startX) * (1 - p.life / p.maxLife);
        const sy = p.startY! + (p.endY! - p.startY!) * (1 - p.life / p.maxLife);
        const tl = p.trailLength ?? 15;
        const dx = (p.endX - p.startX);
        const dy = (p.endY! - p.startY!);
        const len = Math.hypot(dx, dy) || 1;
        const nx = dx / len;
        const ny = dy / len;
        const tailX = sx - nx * tl;
        const tailY = sy - ny * tl;
        const grd = ctx.createLinearGradient(tailX, tailY, sx, sy);
        grd.addColorStop(0, 'rgba(200, 230, 255, 0)');
        grd.addColorStop(1, p.color);
        ctx.strokeStyle = grd;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(sx, sy);
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'explosion') {
        const radius = p.size * t;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        g.addColorStop(0, `rgba(255, 180, 120, ${alpha * 0.8})`);
        g.addColorStop(0.5, `rgba(255, 100, 60, ${alpha * 0.5})`);
        g.addColorStop(1, `rgba(120, 30, 30, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        if (p.type === 'death') {
          ctx.translate(p.x, p.y);
          ctx.rotate(t * Math.PI * 2);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * Math.max(0.3, 1 - t * 0.6), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  drawStatusBars(
    ctx: CanvasRenderingContext2D,
    ui: UIData,
    barY: number,
    canvasW: number,
    scale: number
  ): void {
    const fontSize = Math.max(10, 14 * scale);
    ctx.font = `${fontSize}px monospace`;
    ctx.textBaseline = 'middle';

    const barW = 160 * scale;
    const barH = 8 * scale;
    const gap = 12 * scale;
    let x = 14 * scale;
    let y = barY + 15 * scale;

    ctx.fillStyle = '#CCCCCC';
    ctx.textAlign = 'left';
    ctx.fillText('HP', x, y);
    x += 24 * scale;
    this.drawGradientBar(ctx, x, y - barH / 2, barW, barH, ui.hp / ui.maxHp, [
      { pos: 0, color: '#FF3030' },
      { pos: 0.5, color: '#FFD93D' },
      { pos: 1, color: '#30FF70' },
    ]);
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText(
      `${Math.max(0, Math.ceil(ui.hp))}/${ui.maxHp}`,
      x + barW + 6 * scale,
      y
    );

    x = 14 * scale;
    y += barH + gap;
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText('EN', x, y);
    x += 24 * scale;
    this.drawGradientBar(ctx, x, y - barH / 2, barW, barH, ui.energy / ui.maxEnergy, [
      { pos: 0, color: '#1E50A0' },
      { pos: 0.7, color: '#4DA8FF' },
      { pos: 1, color: '#FFFFFF' },
    ]);
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText(
      `${Math.floor(ui.energy)}/${ui.maxEnergy}`,
      x + barW + 6 * scale,
      y
    );

    const cx = canvasW / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#CCCCCC';
    y = barY + 15 * scale;
    ctx.fillText(`波次 ${ui.wave}/${ui.totalWaves}`, cx, y);
    ctx.fillText(`剩余敌人: ${ui.remainingEnemies}`, cx, y + 16 * scale);
  }

  private drawGradientBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    ratio: number,
    stops: { pos: number; color: string }[]
  ): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.strokeStyle = 'rgba(80, 120, 220, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
    const fillW = Math.max(0, Math.min(1, ratio)) * w;
    if (fillW <= 0) return;
    const g = ctx.createLinearGradient(x, y, x + w, y);
    for (const s of stops) g.addColorStop(s.pos, s.color);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, fillW, h);
  }

  private drawUpgradePanel(state: RenderState): void {
    const tower = state.ui.selectedTower;
    if (!tower) return;
    const ctx = this.ctx;
    const w = 220 * (state.isMobile ? 0.8 : 1);
    const h = 130 * (state.isMobile ? 0.8 : 1);
    const x = tower.x - w / 2;
    const y = tower.y - 180;

    ctx.save();
    ctx.fillStyle = 'rgba(5, 10, 35, 0.92)';
    ctx.strokeStyle = '#3B6FE0';
    ctx.lineWidth = 2;
    this.roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    const scale = state.isMobile ? 0.8 : 1;
    const fs = Math.max(10, 12 * scale);
    ctx.font = `${fs}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#CCCCCC';
    ctx.textBaseline = 'top';

    let ty = y + 12 * scale;
    const tx = x + 12 * scale;
    ctx.fillText(`晶塔 Lv.${tower.level}`, tx, ty);
    ty += 20 * scale;
    const nextLv = tower.level + 1;
    let costText = '';
    if (tower.level === 1) costText = `升级 Lv.2 需 20 能量`;
    else if (tower.level === 2) costText = `升级 Lv.3 需 35 能量`;
    else costText = `已达最高等级`;
    ctx.fillText(costText, tx, ty);
    ty += 20 * scale;
    const bonus =
      tower.level === 1
        ? `攻击加成: +0%  (升级后+40%)`
        : tower.level === 2
        ? `攻击加成: +40%  (升级后+80%)`
        : `攻击加成: +80%`;
    ctx.fillText(bonus, tx, ty);
    ty += 22 * scale;

    if (tower.level < 3) {
      const cost = tower.level === 1 ? 20 : 35;
      const canUp = state.ui.energy >= cost;
      const bw = (w - 24 * scale) / 2 - 4 * scale;
      const bh = 26 * scale;
      this.roundRect(ctx, tx, ty, bw, bh, 4);
      ctx.fillStyle = canUp ? 'rgba(80, 180, 120, 0.55)' : 'rgba(120, 120, 120, 0.35)';
      ctx.fill();
      ctx.strokeStyle = canUp ? '#60E090' : '#888';
      ctx.stroke();
      ctx.fillStyle = canUp ? '#FFFFFF' : '#AAAAAA';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('升级', tx + bw / 2, ty + bh / 2);

      const bx = tx + bw + 8 * scale;
      this.roundRect(ctx, bx, ty, bw, bh, 4);
      ctx.fillStyle = 'rgba(180, 80, 80, 0.45)';
      ctx.fill();
      ctx.strokeStyle = '#E08080';
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('关闭', bx + bw / 2, ty + bh / 2);
      (state as RenderState & { _upgradePanel?: { x: number; y: number; w: number; h: number } })._upgradePanel = {
        x: tx, y: ty, w: bw, h: bh
      };
    } else {
      const bw = w - 24 * scale;
      const bh = 26 * scale;
      this.roundRect(ctx, tx, ty, bw, bh, 4);
      ctx.fillStyle = 'rgba(180, 80, 80, 0.45)';
      ctx.fill();
      ctx.strokeStyle = '#E08080';
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('关闭', tx + bw / 2, ty + bh / 2);
    }

    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  private drawGameEndOverlay(ui: UIData): void {
    if (ui.status === 'playing') return;
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, this.width, this.height);
    const cx = this.width / 2;
    const cy = this.height / 2;
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (ui.status === 'won') {
      ctx.fillStyle = '#80FFB0';
      ctx.fillText('胜利!', cx, cy - 20);
    } else {
      ctx.fillStyle = '#FF8080';
      ctx.fillText('游戏结束', cx, cy - 20);
    }
    ctx.font = '16px monospace';
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText('点击右下重新开始按钮再来一局', cx, cy + 30);
    ctx.restore();
  }
}
