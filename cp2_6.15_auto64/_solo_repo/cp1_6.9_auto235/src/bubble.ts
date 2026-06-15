export class Bubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  scale: number;
  birthTime: number;
  isAttracted: boolean;
  attractDeform: number;
  attractAngle: number;
  fadeAlpha: number;
  dying: boolean;
  private _animTime: number;
  private _hueShift: number;

  constructor(x: number, y: number, now: number) {
    this.x = x;
    this.y = y;
    const speed = 0.1 + Math.random() * 0.2;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 5 + Math.random() * 4;
    this.scale = 0;
    this.birthTime = now;
    this.isAttracted = false;
    this.attractDeform = 0;
    this.attractAngle = 0;
    this.fadeAlpha = 1;
    this.dying = false;
    this._animTime = 0;
    this._hueShift = Math.random() * 20 - 10;
  }

  update(dt: number, canvasW: number, canvasH: number, now: number): boolean {
    this._animTime += dt;

    const age = (now - this.birthTime) / 1000;
    if (age < 0.3) {
      const t = age / 0.3;
      const elastic = 1 + 0.2 * Math.sin(t * Math.PI);
      this.scale = t * elastic;
      if (this.scale > 1.2) this.scale = 1.2 - (this.scale - 1.2) * 0.5;
    } else {
      this.scale += (1 - this.scale) * Math.min(1, dt * 8);
    }

    if (this.dying) {
      this.fadeAlpha -= dt * 1.8;
      this.scale *= 0.985;
      if (this.fadeAlpha <= 0) return false;
    }

    this.attractDeform += ((this.isAttracted ? 0.55 : 0) - this.attractDeform) * Math.min(1, dt * 6);
    this.isAttracted = false;

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    this.vx *= 0.998;
    this.vy *= 0.998;

    const speedMag = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speedMag < 0.1) {
      const boost = (0.1 - speedMag) * 0.1;
      this.vx += (Math.random() - 0.5) * boost;
      this.vy += (Math.random() - 0.5) * boost;
    } else if (speedMag > 0.5) {
      const scale = 0.5 / speedMag;
      this.vx *= scale;
      this.vy *= scale;
    }

    const padding = this.radius * 2;
    if (this.x < padding) { this.x = padding; this.vx = Math.abs(this.vx) * 0.6; }
    if (this.x > canvasW - padding) { this.x = canvasW - padding; this.vx = -Math.abs(this.vx) * 0.6; }
    if (this.y < padding) { this.y = padding; this.vy = Math.abs(this.vy) * 0.6; }
    if (this.y > canvasH - padding) { this.y = canvasH - padding; this.vy = -Math.abs(this.vy) * 0.6; }

    return true;
  }

  applyRepulsion(other: Bubble, _now: number): { triggered: boolean; otherX: number; otherY: number } {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    const distSq = dx * dx + dy * dy;
    const threshold = 30;
    const thresholdSq = threshold * threshold;

    if (distSq < thresholdSq && distSq > 0.01) {
      const dist = Math.sqrt(distSq);
      const force = (threshold - dist) / threshold * 0.25;
      const nx = dx / dist;
      const ny = dy / dist;

      this.vx -= nx * force;
      this.vy -= ny * force;
      other.vx += nx * force;
      other.vy += ny * force;

      return { triggered: true, otherX: other.x, otherY: other.y };
    }
    return { triggered: false, otherX: 0, otherY: 0 };
  }

  applyAttraction(mx: number, my: number, _dt: number): void {
    const dx = mx - this.x;
    const dy = my - this.y;
    const distSq = dx * dx + dy * dy;
    const threshold = 60;
    const thresholdSq = threshold * threshold;

    if (distSq < thresholdSq && distSq > 0.01) {
      const dist = Math.sqrt(distSq);
      const strength = 0.1 * (threshold - dist) / threshold;
      const nx = dx / dist;
      const ny = dy / dist;

      this.vx += nx * strength;
      this.vy += ny * strength;

      this.isAttracted = true;
      this.attractAngle = Math.atan2(ny, nx);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const r = this.radius * this.scale;
    if (r <= 0.1) return;

    ctx.save();
    ctx.globalAlpha = this.fadeAlpha;
    ctx.translate(this.x, this.y);

    let scaleX = 1;
    let scaleY = 1;
    if (this.attractDeform > 0.01) {
      ctx.rotate(this.attractAngle);
      const d = this.attractDeform;
      scaleX = 1 + d * 0.4;
      scaleY = 1 - d * 0.25;
    }
    ctx.scale(scaleX, scaleY);

    const glowR = r * 2.2;
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
    glow.addColorStop(0, `hsla(${210 + this._hueShift}, 100%, 75%, 0.35)`);
    glow.addColorStop(0.4, `hsla(${200 + this._hueShift}, 100%, 65%, 0.12)`);
    glow.addColorStop(1, `hsla(${200 + this._hueShift}, 100%, 60%, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.05, 0, 0, r);
    body.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    body.addColorStop(0.25, 'rgba(235, 248, 255, 0.85)');
    body.addColorStop(0.55, `hsla(${205 + this._hueShift}, 100%, 82%, 0.55)`);
    body.addColorStop(0.85, `hsla(${210 + this._hueShift}, 100%, 68%, 0.22)`);
    body.addColorStop(1, `hsla(${215 + this._hueShift}, 100%, 60%, 0.08)`);

    ctx.shadowBlur = r * 1.6;
    ctx.shadowColor = `hsla(${200 + this._hueShift}, 100%, 70%, 0.55)`;

    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = this.fadeAlpha * 0.7;
    const highlight = ctx.createRadialGradient(-r * 0.35, -r * 0.45, 0, -r * 0.25, -r * 0.3, r * 0.5);
    highlight.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 0.25, r * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  startDying(): void {
    if (!this.dying) {
      this.dying = true;
    }
  }
}
