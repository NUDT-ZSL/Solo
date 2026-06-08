export interface Collectible {
  x: number;
  y: number;
  radius: number;
  phase: number;
  collected: boolean;
  collectAnim: number;
  ringRadius: number;
  ringAlpha: number;
}

export interface CollectEffect {
  x: number;
  y: number;
  timer: number;
  maxTimer: number;
}

const SPAWN_INTERVAL = 2.5;
const COLLECTIBLE_SPEED = 200;
const ENERGY_PER_CHIME = 15;
const COLLECT_ANIM_DURATION = 0.5;

export class CollectibleManager {
  collectibles: Collectible[] = [];
  effects: CollectEffect[] = [];
  private canvasWidth: number;
  private canvasHeight: number;
  private spawnTimer: number = SPAWN_INTERVAL;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  reset(): void {
    this.collectibles = [];
    this.effects = [];
    this.spawnTimer = SPAWN_INTERVAL;
  }

  resize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  update(dt: number): number {
    let energyGained = 0;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawn();
      this.spawnTimer = SPAWN_INTERVAL + Math.random() * 1.5;
    }

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];

      if (c.collected) {
        c.collectAnim += dt;
        c.ringRadius += dt * 80;
        c.ringAlpha = 1 - c.collectAnim / COLLECT_ANIM_DURATION;
        if (c.collectAnim >= COLLECT_ANIM_DURATION) {
          this.collectibles.splice(i, 1);
        }
        continue;
      }

      c.x -= COLLECTIBLE_SPEED * dt;
      c.phase += dt * 4;

      if (c.x + c.radius < -20) {
        this.collectibles.splice(i, 1);
      }
    }

    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].timer -= dt;
      if (this.effects[i].timer <= 0) {
        this.effects.splice(i, 1);
      }
    }

    return energyGained;
  }

  private spawn(): void {
    const y = 80 + Math.random() * (this.canvasHeight - 180);
    this.collectibles.push({
      x: this.canvasWidth + 30,
      y,
      radius: 18,
      phase: Math.random() * Math.PI * 2,
      collected: false,
      collectAnim: 0,
      ringRadius: 0,
      ringAlpha: 1,
    });
  }

  checkCollection(kiteHitbox: { x: number; y: number; w: number; h: number }): number {
    let energyGained = 0;
    const kcx = kiteHitbox.x + kiteHitbox.w / 2;
    const kcy = kiteHitbox.y + kiteHitbox.h / 2;
    const kr = Math.max(kiteHitbox.w, kiteHitbox.h) / 2;

    for (const c of this.collectibles) {
      if (c.collected) continue;
      const dx = kcx - c.x;
      const dy = kcy - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < kr + c.radius) {
        c.collected = true;
        c.collectAnim = 0;
        c.ringRadius = c.radius;
        energyGained += ENERGY_PER_CHIME;

        this.effects.push({
          x: c.x,
          y: c.y,
          timer: 0.8,
          maxTimer: 0.8,
        });
      }
    }
    return energyGained;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const c of this.collectibles) {
      if (c.collected) {
        this.drawCollectAnimation(ctx, c);
        continue;
      }
      this.drawWindChime(ctx, c);
    }

    for (const e of this.effects) {
      const alpha = e.timer / e.maxTimer;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '16px "Ma Shan Zheng", serif';
      ctx.fillStyle = '#c0392b';
      ctx.textAlign = 'center';
      ctx.fillText(`+${ENERGY_PER_CHIME}`, e.x, e.y - 30 + (1 - alpha) * -20);
      ctx.restore();
    }
  }

  private drawWindChime(ctx: CanvasRenderingContext2D, c: Collectible): void {
    const bobY = Math.sin(c.phase) * 5;

    ctx.save();
    ctx.translate(c.x, c.y + bobY);

    ctx.beginPath();
    ctx.arc(0, -8, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#8b6914';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(-8, 10);
    ctx.lineTo(0, 6);
    ctx.lineTo(8, 10);
    ctx.closePath();
    const grad = ctx.createLinearGradient(-8, -4, 8, 10);
    grad.addColorStop(0, '#d4a843');
    grad.addColorStop(0.5, '#f0c850');
    grad.addColorStop(1, '#b8922a');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-8, 10);
    ctx.lineTo(-6, 16);
    ctx.lineTo(0, 12);
    ctx.lineTo(6, 16);
    ctx.lineTo(8, 10);
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    const glowAlpha = 0.3 + Math.sin(c.phase * 2) * 0.2;
    ctx.beginPath();
    ctx.arc(0, 3, c.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(240, 200, 80, ${glowAlpha})`;
    ctx.fill();

    ctx.restore();
  }

  private drawCollectAnimation(ctx: CanvasRenderingContext2D, c: Collectible): void {
    ctx.save();
    ctx.globalAlpha = c.ringAlpha;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#f0c850';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  getHitboxes(): Array<{ x: number; y: number; r: number }> {
    return this.collectibles
      .filter((c) => !c.collected)
      .map((c) => ({ x: c.x, y: c.y, r: c.radius }));
  }
}
