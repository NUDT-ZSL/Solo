import {
  GridNode,
  Particle,
  Config,
  Rgb,
  hexToRgb,
  lerpColor,
  rgbToString,
  dist,
  randomRange,
  SPRING_STIFFNESS,
  DAMPING,
  CUT_RECONNECT_DELAY,
  GLOW_BLUR,
  LINE_ALPHA,
  TRAIL_ALPHA,
  FLOW_SPEED,
  MAX_PARTICLES,
} from './utils';

export class Grid {
  nodes: GridNode[][] = [];
  cols = 0;
  rows = 0;
  particles: Particle[] = [];
  time = 0;
  private config: Config;
  private width: number;
  private height: number;

  constructor(width: number, height: number, config: Config) {
    this.width = width;
    this.height = height;
    this.config = config;
    this.buildGrid();
  }

  private buildGrid(): void {
    this.nodes = [];
    const density = this.config.density;
    const spacingX = this.width / (density + 1);
    const spacingY = this.height / (density + 1);
    this.cols = density + 2;
    this.rows = Math.max(1, Math.floor(this.height / spacingY)) + 2;

    for (let row = 0; row < this.rows; row++) {
      const nodeRow: GridNode[] = [];
      for (let col = 0; col < this.cols; col++) {
        const x = col * spacingX;
        const y = row * spacingY;
        nodeRow.push({
          x,
          y,
          originX: x,
          originY: y,
          vx: 0,
          vy: 0,
          cut: false,
          cutTime: 0,
        });
      }
      this.nodes.push(nodeRow);
    }
  }

  rebuild(width: number, height: number, config: Config): void {
    this.width = width;
    this.height = height;
    this.config = config;
    this.particles = [];
    this.buildGrid();
  }

  applyForce(fx: number, fy: number, mx: number, my: number, radius: number, strength: number): void {
    for (const row of this.nodes) {
      for (const node of row) {
        const d = dist(node.x, node.y, mx, my);
        if (d < radius && d > 0) {
          const factor = (1 - d / radius) * strength;
          node.vx += fx * factor;
          node.vy += fy * factor;
        }
      }
    }
  }

  cutAt(cx: number, cy: number, radius: number): void {
    const now = performance.now();
    for (const row of this.nodes) {
      for (const node of row) {
        const d = dist(node.x, node.y, cx, cy);
        if (d < radius) {
          node.cut = true;
          node.cutTime = now;
          const angle = Math.atan2(node.y - cy, node.x - cx);
          const force = (1 - d / radius) * 4;
          node.vx += Math.cos(angle) * force;
          node.vy += Math.sin(angle) * force;
        }
      }
    }
    this.spawnCutParticles(cx, cy);
  }

  private spawnCutParticles(cx: number, cy: number): void {
    const startRgb = hexToRgb(this.config.theme.startColor);
    const endRgb = hexToRgb(this.config.theme.endColor);
    const count = Math.min(20, MAX_PARTICLES - this.particles.length);
    for (let i = 0; i < count; i++) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(1, 4);
      const t = Math.random();
      const color = lerpColor(startRgb, endRgb, t);
      this.particles.push({
        x: cx + randomRange(-5, 5),
        y: cy + randomRange(-5, 5),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: randomRange(40, 80),
        color: rgbToString(color),
        size: randomRange(1.5, 3.5),
      });
    }
  }

  spawnDragParticles(x: number, y: number, dx: number, dy: number): void {
    const startRgb = hexToRgb(this.config.theme.startColor);
    const endRgb = hexToRgb(this.config.theme.endColor);
    const count = Math.min(3, MAX_PARTICLES - this.particles.length);
    for (let i = 0; i < count; i++) {
      const t = Math.random();
      const color = lerpColor(startRgb, endRgb, t);
      this.particles.push({
        x: x + randomRange(-3, 3),
        y: y + randomRange(-3, 3),
        vx: dx * randomRange(0.2, 0.6) + randomRange(-0.5, 0.5),
        vy: dy * randomRange(0.2, 0.6) + randomRange(-0.5, 0.5),
        life: 1,
        maxLife: randomRange(20, 50),
        color: rgbToString(color),
        size: randomRange(1, 2.5),
      });
    }
  }

  update(): void {
    this.time += FLOW_SPEED;
    const now = performance.now();
    const strength = this.config.distortionStrength;

    for (const row of this.nodes) {
      for (const node of row) {
        if (node.cut && now - node.cutTime > CUT_RECONNECT_DELAY) {
          node.cut = false;
        }

        const flowOffsetX = Math.sin(this.time + node.originY * 0.01) * 2 * strength;
        const flowOffsetY = Math.cos(this.time + node.originX * 0.01) * 1.5 * strength;
        const targetX = node.originX + flowOffsetX;
        const targetY = node.originY + flowOffsetY;

        node.vx += (targetX - node.x) * SPRING_STIFFNESS;
        node.vy += (targetY - node.y) * SPRING_STIFFNESS;
        node.vx *= DAMPING;
        node.vy *= DAMPING;
        node.x += node.vx;
        node.y += node.vy;
      }
    }

    this.updateParticles();
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life -= 1 / p.maxLife;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, this.width, this.height);

    this.renderLines(ctx);
    this.renderParticles(ctx);
    this.renderCutGlows(ctx);
  }

  private renderLines(ctx: CanvasRenderingContext2D): void {
    const startRgb = hexToRgb(this.config.theme.startColor);
    const endRgb = hexToRgb(this.config.theme.endColor);

    ctx.lineCap = 'round';

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const node = this.nodes[row][col];
        const t = this.cols > 1 ? col / (this.cols - 1) : 0;
        const color = lerpColor(startRgb, endRgb, t);

        this.drawLine(ctx, node, row, col + 1, row, color, t, 'h');
        this.drawLine(ctx, node, row, col, row + 1, color, t, 'v');
      }
    }
  }

  private drawLine(
    ctx: CanvasRenderingContext2D,
    fromNode: GridNode,
    toRow: number,
    toCol: number,
    color: Rgb,
    t: number,
    _direction: string,
  ): void {
    if (toRow < 0 || toRow >= this.rows || toCol < 0 || toCol >= this.cols) return;
    const toNode = this.nodes[toRow][toCol];

    if (fromNode.cut && toNode.cut) return;

    const alpha = fromNode.cut || toNode.cut
      ? LINE_ALPHA * 0.3
      : LINE_ALPHA;

    ctx.save();
    ctx.shadowColor = rgbToString(color, 0.5);
    ctx.shadowBlur = GLOW_BLUR;
    ctx.strokeStyle = rgbToString(color, alpha);
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.lineTo(toNode.x, toNode.y);
    ctx.stroke();

    ctx.shadowBlur = GLOW_BLUR * 2;
    ctx.strokeStyle = rgbToString(color, TRAIL_ALPHA);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.lineTo(toNode.x, toNode.y);
    ctx.stroke();

    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = p.life * 0.8;
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${alpha})`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderCutGlows(ctx: CanvasRenderingContext2D): void {
    const now = performance.now();
    const startRgb = hexToRgb(this.config.theme.startColor);
    const endRgb = hexToRgb(this.config.theme.endColor);

    const rendered = new Set<string>();
    for (const row of this.nodes) {
      for (const node of row) {
        if (!node.cut) continue;
        const key = `${Math.round(node.originX)}_${Math.round(node.originY)}`;
        if (rendered.has(key)) continue;
        rendered.add(key);

        const elapsed = now - node.cutTime;
        const progress = Math.min(elapsed / CUT_RECONNECT_DELAY, 1);
        const glowAlpha = (1 - progress) * 0.6;
        const glowRadius = 20 + progress * 30;
        const t = this.cols > 1 ? (node.originX / this.width) : 0.5;
        const color = lerpColor(startRgb, endRgb, t);

        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, glowRadius,
        );
        gradient.addColorStop(0, rgbToString(color, glowAlpha));
        gradient.addColorStop(1, rgbToString(color, 0));

        ctx.save();
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}
