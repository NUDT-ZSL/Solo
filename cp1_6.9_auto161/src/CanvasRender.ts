import {
  GRID_SIZE,
  CELL_SIZE,
  GRID_PADDING,
  CRYSTAL_ENERGY_HATCH,
  CRYSTAL_PLACE_ANIM_DURATION,
  COLOR_HEX,
  COLOR_RGB,
  type RenderData,
  type Crystal,
  type Sprite,
  type EnergyPoint,
  type Particle,
  type ResonanceLine
} from './types';

export class CanvasRender {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private gridOffsetX: number;
  private gridOffsetY: number;
  private gridPixelSize: number;

  constructor(canvas: HTMLCanvasElement, containerWidth: number, containerHeight: number) {
    this.canvas = canvas;
    this.canvas.width = containerWidth;
    this.canvas.height = containerHeight;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.gridPixelSize = GRID_SIZE * CELL_SIZE;
    this.gridOffsetX = (containerWidth - this.gridPixelSize) / 2;
    this.gridOffsetY = (containerHeight - this.gridPixelSize) / 2;
  }

  public resize(containerWidth: number, containerHeight: number): void {
    this.canvas.width = containerWidth;
    this.canvas.height = containerHeight;
    this.gridPixelSize = GRID_SIZE * CELL_SIZE;
    this.gridOffsetX = (containerWidth - this.gridPixelSize) / 2;
    this.gridOffsetY = (containerHeight - this.gridPixelSize) / 2;
  }

  public screenToGrid(screenX: number, screenY: number): { row: number; col: number } | null {
    const x = screenX - this.gridOffsetX;
    const y = screenY - this.gridOffsetY;
    if (x < 0 || x >= this.gridPixelSize || y < 0 || y >= this.gridPixelSize) {
      return null;
    }
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    return { row, col };
  }

  public render(data: RenderData): void {
    const { ctx, canvas } = this;
    const { now, screenShake, crystals, sprites, energyPoints, particles, resonanceLines } = data;

    let shakeX = 0;
    let shakeY = 0;
    if (screenShake.active && now < screenShake.until) {
      const t = (screenShake.until - now) / 100;
      shakeX = (Math.random() - 0.5) * screenShake.intensity * t * 2;
      shakeY = (Math.random() - 0.5) * screenShake.intensity * t * 2;
    }

    this.drawBackground();

    ctx.save();
    ctx.translate(shakeX, shakeY);

    this.drawGrid();

    for (const line of resonanceLines) {
      this.drawResonanceLine(line, now);
    }

    for (const ep of energyPoints) {
      this.drawEnergyPoint(ep, now);
    }

    for (const crystal of crystals) {
      this.drawCrystal(crystal, now);
    }

    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      this.drawParticle(p);
    }
    ctx.globalCompositeOperation = 'source-over';

    for (const sprite of sprites) {
      this.drawSprite(sprite, now);
    }

    ctx.restore();
  }

  private drawBackground(): void {
    const { ctx, canvas } = this;
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0a0a2e');
    grad.addColorStop(1, '#1a1a4e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 60; i++) {
      const x = (i * 97) % canvas.width;
      const y = (i * 53) % canvas.height;
      const r = (i % 3) * 0.5 + 0.5;
      const a = 0.1 + (i % 5) * 0.05;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawGrid(): void {
    const { ctx } = this;
    const ox = this.gridOffsetX;
    const oy = this.gridOffsetY;
    const size = this.gridPixelSize;

    ctx.strokeStyle = 'rgba(42, 42, 90, 0.6)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= GRID_SIZE; i++) {
      const x = ox + i * CELL_SIZE;
      const y = oy + i * CELL_SIZE;

      ctx.beginPath();
      ctx.moveTo(x, oy);
      ctx.lineTo(x, oy + size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ox, y);
      ctx.lineTo(ox + size, y);
      ctx.stroke();
    }
  }

  private cellCenter(row: number, col: number): { x: number; y: number } {
    return {
      x: this.gridOffsetX + col * CELL_SIZE + CELL_SIZE / 2,
      y: this.gridOffsetY + row * CELL_SIZE + CELL_SIZE / 2
    };
  }

  private drawResonanceLine(line: ResonanceLine, now: number): void {
    const { ctx } = this;
    const progress = (line.expiresAt - now) / 300;
    if (progress <= 0) return;
    const from = this.cellCenter(line.fromRow, line.fromCol);
    const to = this.cellCenter(line.toRow, line.toCol);
    const color = COLOR_RGB[line.color];
    const alpha = progress * 0.9;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${alpha})`;
    ctx.lineWidth = 4 * progress + 1;
    ctx.shadowColor = COLOR_HEX[line.color];
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }

  private drawEnergyPoint(ep: EnergyPoint, now: number): void {
    const { ctx } = this;
    const { x, y } = this.cellCenter(ep.row, ep.col);
    const pulse = 0.8 + Math.sin(now / 150) * 0.2;
    const lifeProgress = Math.min(1, (ep.expiresAt - now) / 8000);
    const r = 8 * pulse;
    const alpha = 0.6 + lifeProgress * 0.3;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(0.3, `rgba(200,220,255,${alpha * 0.5})`);
    grad.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#aaccff';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawCrystal(crystal: Crystal, now: number): void {
    const { ctx } = this;
    const { x, y } = this.cellCenter(crystal.row, crystal.col);
    const color = COLOR_RGB[crystal.color];
    const hex = COLOR_HEX[crystal.color];

    let scale = 1;
    const age = now - crystal.placedAt;
    if (age < CRYSTAL_PLACE_ANIM_DURATION) {
      const t = age / CRYSTAL_PLACE_ANIM_DURATION;
      scale = 0.2 + t * 0.8;
    }

    const glowActive = now < crystal.glowUntil;
    const resonanceActive = now < crystal.resonanceUntil;

    const size = 22 * scale;

    if (age < CRYSTAL_PLACE_ANIM_DURATION || glowActive || resonanceActive) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const haloR = glowActive ? size * 3 : size * 2;
      const haloAlpha = glowActive ? 0.4 : resonanceActive ? 0.35 : 0.25;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, haloR);
      grad.addColorStop(0, `rgba(${color.r},${color.g},${color.b},${haloAlpha})`);
      grad.addColorStop(1, `rgba(${color.r},${color.g},${color.b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, haloR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);

    const bodyGrad = ctx.createLinearGradient(-size, -size, size, size);
    bodyGrad.addColorStop(0, `rgba(${color.r},${color.g},${color.b},0.85)`);
    bodyGrad.addColorStop(0.5, `rgba(${color.r},${color.g},${color.b},0.6)`);
    bodyGrad.addColorStop(1, `rgba(${color.r},${color.g},${color.b},0.85)`);

    ctx.shadowColor = hex;
    ctx.shadowBlur = glowActive ? 25 : 12;
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = `rgba(255,255,255,0.6)`;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.rect(-size / 2, -size / 2, size, size);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = `rgba(255,255,255,0.5)`;
    ctx.beginPath();
    ctx.rect(-size / 2 + 2, -size / 2 + 2, size / 3, size / 3);
    ctx.fill();

    ctx.restore();

    if (crystal.energy > 0) {
      const barW = 36;
      const barH = 4;
      const bx = x - barW / 2;
      const by = y + 30;
      const ratio = Math.min(1, crystal.energy / CRYSTAL_ENERGY_HATCH);

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
      ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},0.9)`;
      ctx.fillRect(bx, by, barW * ratio, barH);
    }
  }

  private drawParticle(p: Particle): void {
    const { ctx } = this;
    const alpha = Math.max(0, p.life / p.maxLife);
    const x = this.gridOffsetX + p.x * CELL_SIZE + CELL_SIZE / 2;
    const y = this.gridOffsetY + p.y * CELL_SIZE + CELL_SIZE / 2;

    if (p.type === 'halo' && p.angle !== undefined && p.radius !== undefined) {
      const hx = x + Math.cos(p.angle + p.vx * 1000) * p.radius * CELL_SIZE;
      const hy = y + Math.sin(p.angle + p.vy * 1000) * p.radius * CELL_SIZE;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(hx, hy, p.size, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x, y, p.size * alpha + 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawSprite(sprite: Sprite, now: number): void {
    const { ctx } = this;
    const baseCenter = this.cellCenter(sprite.row, sprite.col);
    const bob = Math.sin(sprite.bobPhase) * 2;
    const x = baseCenter.x;
    const y = baseCenter.y + bob;
    const color = COLOR_RGB[sprite.color];
    const hex = COLOR_HEX[sprite.color];

    const isRage = sprite.state === 'rage';
    const scale = isRage ? 1.5 : 1;
    const satBoost = isRage ? 0.2 : 0;

    const flashing = now < sprite.flashUntil;

    ctx.save();

    if (sprite.trail.length > 0) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < sprite.trail.length; i++) {
        const t = sprite.trail[i];
        const trailAge = now - t.time;
        const trailAlpha = Math.max(0, 1 - trailAge / 400);
        if (trailAlpha <= 0) continue;
        const tc = this.cellCenter(t.row, t.col);
        const trailBob = Math.sin(sprite.bobPhase - (i + 1) * 0.5) * 1.5;
        const tAlpha = (0.8 - (i / sprite.trail.length) * 0.8) * trailAlpha;

        const r = 6 * scale * (0.7 - i * 0.1);
        const grad = ctx.createRadialGradient(tc.x, tc.y + trailBob, 0, tc.x, tc.y + trailBob, r * 2);
        grad.addColorStop(0, `rgba(${color.r},${color.g},${color.b},${tAlpha})`);
        grad.addColorStop(1, `rgba(${color.r},${color.g},${color.b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(tc.x, tc.y + trailBob, r * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    if (isRage) {
      ctx.globalCompositeOperation = 'lighter';
      const haloCount = 12;
      for (let i = 0; i < haloCount; i++) {
        const angle = (now / 1000) * Math.PI * 2 + (Math.PI * 2 * i) / haloCount;
        const hr = 20;
        const hx = x + Math.cos(angle) * hr;
        const hy = y + Math.sin(angle) * hr;
        ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},0.6)`;
        ctx.shadowColor = hex;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(hx, hy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    const particleOffsets = [
      { dx: -6, dy: -6, phase: 0 },
      { dx: 6, dy: -5, phase: Math.PI * 0.5 },
      { dx: -5, dy: 6, phase: Math.PI },
      { dx: 6, dy: 5, phase: Math.PI * 1.5 }
    ];

    for (let i = 0; i < particleOffsets.length; i++) {
      const off = particleOffsets[i];
      const bounce = Math.sin(sprite.bobPhase + off.phase) * 2.5 * scale;
      const px = x + off.dx * scale;
      const py = y + off.dy * scale + bounce;
      const r = 6 * scale;

      let displayColor = hex;
      if (satBoost > 0 || flashing) {
        displayColor = flashing ? '#ffffff' : this.boostSaturation(color, satBoost);
      }

      ctx.shadowColor = hex;
      ctx.shadowBlur = flashing ? 30 : 16;
      ctx.fillStyle = displayColor;
      ctx.globalAlpha = flashing ? 1 : 0.92;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(px - r * 0.25, py - r * 0.25, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    const eyeR = 2 * scale;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 3 * scale, y - 1, eyeR, 0, Math.PI * 2);
    ctx.arc(x + 3 * scale, y - 1, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(x - 3 * scale, y - 1, eyeR * 0.55, 0, Math.PI * 2);
    ctx.arc(x + 3 * scale, y - 1, eyeR * 0.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private boostSaturation(rgb: { r: number; g: number; b: number }, boost: number): string {
    const max = Math.max(rgb.r, rgb.g, rgb.b);
    const r = Math.round(rgb.r + (max - rgb.r) * boost);
    const g = Math.round(rgb.g + (max - rgb.g) * boost);
    const b = Math.round(rgb.b + (max - rgb.b) * boost);
    return `rgb(${r},${g},${b})`;
  }
}
