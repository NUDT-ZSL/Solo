export type LootKind = 'pearl' | 'ingot' | 'jade';
export type ObstacleKind = 'kite' | 'sparrow';
export type ItemKind = LootKind | ObstacleKind;

export interface FloatingItem {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  points: number;
  isObstacle: boolean;
  glowPhase: number;
  active: boolean;
  spawnTime: number;
}

interface LootConfig {
  points: number;
  size: number;
  color: string;
  glowR: number;
  glowG: number;
  glowB: number;
}

interface ObstacleConfig {
  points: number;
  size: number;
  color: string;
}

const LOOT_CONFIGS: Record<LootKind, LootConfig> = {
  pearl: { points: 50, size: 18, color: '#c0e0ff', glowR: 160, glowG: 210, glowB: 255 },
  ingot: { points: 30, size: 22, color: '#ffd700', glowR: 255, glowG: 215, glowB: 0 },
  jade: { points: 20, size: 16, color: '#60ffa0', glowR: 80, glowG: 255, glowB: 140 },
};

const OBSTACLE_CONFIGS: Record<ObstacleKind, ObstacleConfig> = {
  kite: { points: -15, size: 24, color: '#ff5090' },
  sparrow: { points: -10, size: 14, color: '#a0784a' },
};

const LOOT_KINDS: LootKind[] = ['pearl', 'ingot', 'jade'];
const LOOT_WEIGHTS = [0.2, 0.4, 0.4];
const OBSTACLE_KINDS: ObstacleKind[] = ['kite', 'sparrow'];

export class FloatingLootManager {
  private items: FloatingItem[] = [];
  private nextId = 0;
  private spawnTimer = 0;
  private obstacleChance = 0.25;
  private baseInterval = 2.0;

  reset() {
    this.items = [];
    this.nextId = 0;
    this.spawnTimer = 0;
  }

  update(dt: number, canvasW: number, canvasH: number, difficulty: number) {
    this.spawnTimer -= dt;

    if (this.spawnTimer <= 0) {
      this.spawnItem(canvasW, canvasH);
      const interval = this.baseInterval / difficulty;
      this.spawnTimer = interval * (0.7 + Math.random() * 0.6);
      this.obstacleChance = Math.min(0.45, 0.25 + difficulty * 0.03);
    }

    for (const item of this.items) {
      if (!item.active) continue;

      item.glowPhase += dt * 3;
      item.x += item.vx * dt;
      item.vy += (item.isObstacle ? 0 : 60) * dt;
      item.y += item.vy * dt;

      if (item.kind === 'kite') {
        item.x += Math.sin(item.glowPhase * 1.5) * 30 * dt;
        item.vy = -40;
      } else if (item.kind === 'sparrow') {
        item.x += Math.sin(item.glowPhase * 3) * 50 * dt;
      }

      if (
        item.x < -80 ||
        item.x > canvasW + 80 ||
        item.y > canvasH + 80 ||
        item.y < -80
      ) {
        item.active = false;
      }
    }

    this.items = this.items.filter((i) => i.active);
  }

  private spawnItem(canvasW: number, canvasH: number) {
    const isObstacle = Math.random() < this.obstacleChance;
    const elapsed = performance.now() / 1000;

    if (isObstacle) {
      const kind = OBSTACLE_KINDS[Math.floor(Math.random() * OBSTACLE_KINDS.length)];
      const cfg = OBSTACLE_CONFIGS[kind];
      const fromLeft = Math.random() < 0.5;

      let x: number, y: number, vx: number, vy: number;
      if (kind === 'kite') {
        x = 60 + Math.random() * (canvasW - 120);
        y = canvasH + 20;
        vx = (Math.random() - 0.5) * 40;
        vy = -60 - Math.random() * 40;
      } else {
        x = fromLeft ? -20 : canvasW + 20;
        y = 60 + Math.random() * (canvasH * 0.5);
        vx = fromLeft ? 120 + Math.random() * 80 : -(120 + Math.random() * 80);
        vy = (Math.random() - 0.3) * 60;
      }

      this.items.push({
        id: this.nextId++,
        kind,
        x, y, vx, vy,
        size: cfg.size,
        points: cfg.points,
        isObstacle: true,
        glowPhase: Math.random() * Math.PI * 2,
        active: true,
        spawnTime: elapsed,
      });
    } else {
      const r = Math.random();
      let cumWeight = 0;
      let kind: LootKind = 'ingot';
      for (let i = 0; i < LOOT_KINDS.length; i++) {
        cumWeight += LOOT_WEIGHTS[i];
        if (r < cumWeight) {
          kind = LOOT_KINDS[i];
          break;
        }
      }

      const cfg = LOOT_CONFIGS[kind];
      const fromLeft = Math.random() < 0.5;
      const x = fromLeft ? -30 : canvasW + 30;
      const baseY = 40 + Math.random() * (canvasH * 0.45);
      const vx = fromLeft
        ? 80 + Math.random() * 60
        : -(80 + Math.random() * 60);
      const vy = -120 - Math.random() * 80;

      this.items.push({
        id: this.nextId++,
        kind,
        x, y: baseY, vx, vy,
        size: cfg.size,
        points: cfg.points,
        isObstacle: false,
        glowPhase: Math.random() * Math.PI * 2,
        active: true,
        spawnTime: elapsed,
      });
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.save();

    for (const item of this.items) {
      if (!item.active) continue;

      if (!item.isObstacle) {
        const cfg = LOOT_CONFIGS[item.kind as LootKind];
        const glowSize = item.size + 10 + Math.sin(item.glowPhase) * 5;
        const grad = ctx.createRadialGradient(
          item.x, item.y, item.size * 0.3,
          item.x, item.y, glowSize
        );
        const pulse = 0.3 + Math.sin(item.glowPhase) * 0.15;
        grad.addColorStop(0, `rgba(${cfg.glowR},${cfg.glowG},${cfg.glowB},${pulse})`);
        grad.addColorStop(1, `rgba(${cfg.glowR},${cfg.glowG},${cfg.glowB},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(item.x, item.y, glowSize, 0, Math.PI * 2);
        ctx.fill();
      }

      this.drawItem(ctx, item);
    }

    ctx.restore();
  }

  private drawItem(ctx: CanvasRenderingContext2D, item: FloatingItem) {
    const { x, y, size, kind, isObstacle, glowPhase } = item;

    if (isObstacle) {
      if (kind === 'kite') {
        this.drawKite(ctx, x, y, size, glowPhase);
      } else {
        this.drawSparrow(ctx, x, y, size, glowPhase);
      }
    } else {
      if (kind === 'pearl') {
        this.drawPearl(ctx, x, y, size);
      } else if (kind === 'ingot') {
        this.drawIngot(ctx, x, y, size);
      } else {
        this.drawJade(ctx, x, y, size);
      }
    }
  }

  private drawPearl(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
    const grad = ctx.createRadialGradient(x - s * 0.25, y - s * 0.25, 0, x, y, s);
    grad.addColorStop(0, '#e0f0ff');
    grad.addColorStop(0.5, '#a0d0ff');
    grad.addColorStop(1, '#6090c0');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(x - s * 0.3, y - s * 0.3, s * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawIngot(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
    ctx.save();
    ctx.translate(x, y);
    const grad = ctx.createLinearGradient(-s, -s * 0.4, s, s * 0.4);
    grad.addColorStop(0, '#ffe060');
    grad.addColorStop(0.5, '#ffc800');
    grad.addColorStop(1, '#cc9900');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(-s, s * 0.1);
    ctx.quadraticCurveTo(-s * 0.5, -s * 0.6, 0, -s * 0.4);
    ctx.quadraticCurveTo(s * 0.5, -s * 0.6, s, s * 0.1);
    ctx.quadraticCurveTo(s * 0.5, s * 0.5, 0, s * 0.4);
    ctx.quadraticCurveTo(-s * 0.5, s * 0.5, -s, s * 0.1);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,200,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.1, s * 0.4, s * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawJade(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
    const grad = ctx.createRadialGradient(x - s * 0.2, y - s * 0.2, 0, x, y, s);
    grad.addColorStop(0, '#a0ffc0');
    grad.addColorStop(0.6, '#40d080');
    grad.addColorStop(1, '#208040');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a5030';
    ctx.beginPath();
    ctx.arc(x, y, s * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(200,255,220,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.65, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawKite(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, phase: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(phase * 1.5) * 0.15);

    const colors = ['#ff3060', '#ffaa20', '#40a0ff', '#40e060'];
    ctx.fillStyle = colors[Math.floor(phase) % colors.length];
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.7, 0);
    ctx.lineTo(0, s * 0.6);
    ctx.lineTo(-s * 0.7, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(0, s * 0.6);
    ctx.moveTo(-s * 0.7, 0);
    ctx.lineTo(s * 0.7, 0);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(200,200,200,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.6);
    ctx.quadraticCurveTo(4, s * 0.9, -3, s * 1.2);
    ctx.quadraticCurveTo(2, s * 1.5, -2, s * 1.8);
    ctx.stroke();

    ctx.restore();
  }

  private drawSparrow(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, phase: number) {
    ctx.save();
    ctx.translate(x, y);

    const wingAngle = Math.sin(phase * 8) * 0.4;

    ctx.fillStyle = '#8b6914';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.5, s * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#6b5020';
    ctx.beginPath();
    ctx.ellipse(s * 0.35, -s * 0.05, s * 0.25, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#a0784a';
    ctx.save();
    ctx.rotate(wingAngle);
    ctx.beginPath();
    ctx.ellipse(-s * 0.1, -s * 0.3, s * 0.4, s * 0.15, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(s * 0.55, -s * 0.05);
    ctx.lineTo(s * 0.75, 0);
    ctx.lineTo(s * 0.55, s * 0.05);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  getActiveItems(): FloatingItem[] {
    return this.items.filter((i) => i.active);
  }

  removeItem(id: number) {
    const item = this.items.find((i) => i.id === id);
    if (item) item.active = false;
  }

  clear() {
    this.items = [];
    this.nextId = 0;
    this.spawnTimer = 0;
  }
}
