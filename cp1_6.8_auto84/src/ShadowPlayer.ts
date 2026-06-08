export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  scale: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export class ShadowPlayer {
  x: number = 100;
  y: number = 300;
  baseSpeed: number = 3;
  beatSpeed: number = 6;
  currentSpeed: number = 3;
  width: number = 28;
  height: number = 28;

  energy: number = 100;
  maxEnergy: number = 100;
  energyRegenOnBeat: number = 12;
  energyDrainInLight: number = 25;
  energyDrainOffBeat: number = 2;

  exposed: boolean = false;
  onBeat: boolean = false;
  beatWindowMs: number = 180;

  trail: TrailPoint[] = [];
  maxTrail: number = 12;

  particles: Particle[] = [];

  keys: Set<string> = new Set();

  pulsePhase: number = 0;

  constructor(startX: number = 100, startY: number = 300) {
    this.x = startX;
    this.y = startY;
  }

  handleKeyDown(key: string) {
    this.keys.add(key.toLowerCase());
  }

  handleKeyUp(key: string) {
    this.keys.delete(key.toLowerCase());
  }

  update(
    dt: number,
    isOnBeat: boolean,
    isInLight: boolean,
    canvasW: number,
    canvasH: number
  ) {
    this.onBeat = isOnBeat;
    this.currentSpeed = isOnBeat ? this.beatSpeed : this.baseSpeed;

    let dx = 0;
    let dy = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;

      const moveScale = dt / 16.67;
      this.x += dx * this.currentSpeed * moveScale;
      this.y += dy * this.currentSpeed * moveScale;

      this.x = Math.max(this.width / 2, Math.min(canvasW - this.width / 2, this.x));
      this.y = Math.max(this.height / 2, Math.min(canvasH - this.height / 2, this.y));

      this.trail.unshift({ x: this.x, y: this.y, alpha: 0.6, scale: 1 });
      if (this.trail.length > this.maxTrail) {
        this.trail.pop();
      }
    }

    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].alpha -= 0.04 * (dt / 16.67);
      this.trail[i].scale *= 0.97;
      if (this.trail[i].alpha <= 0) {
        this.trail.splice(i, 1);
      }
    }

    if (isInLight) {
      this.energy -= this.energyDrainInLight * (dt / 1000);
      this.exposed = true;
    } else {
      this.exposed = false;
      if (isOnBeat && (dx !== 0 || dy !== 0)) {
        this.energy += this.energyRegenOnBeat * (dt / 1000);
      } else {
        this.energy -= this.energyDrainOffBeat * (dt / 1000);
      }
    }

    this.energy = Math.max(0, Math.min(this.maxEnergy, this.energy));

    if (isOnBeat && (dx !== 0 || dy !== 0)) {
      this.spawnShadowParticles();
    }

    this.updateParticles(dt);
    this.pulsePhase += dt * 0.004;
  }

  spawnShadowParticles() {
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      this.particles.push({
        x: this.x + (Math.random() - 0.5) * this.width,
        y: this.y + (Math.random() - 0.5) * this.height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        size: 2 + Math.random() * 4,
      });
    }
  }

  spawnZoneClearEffect() {
    const count = 30;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.5,
        maxLife: 1.5,
        size: 3 + Math.random() * 6,
      });
    }
  }

  updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * (dt / 16.67);
      p.y += p.vy * (dt / 16.67);
      p.life -= dt / 1000;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.drawTrail(ctx);
    this.drawParticles(ctx);
    this.drawBody(ctx);
  }

  drawTrail(ctx: CanvasRenderingContext2D) {
    for (const t of this.trail) {
      ctx.save();
      ctx.globalAlpha = t.alpha * 0.5;
      ctx.fillStyle = '#1a0a2e';
      ctx.beginPath();
      const s = (this.width / 2) * t.scale;
      ctx.ellipse(t.x, t.y + s * 0.3, s, s * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.save();
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = '#0d001a';
      ctx.shadowColor = '#4a0e8f';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawBody(ctx: CanvasRenderingContext2D) {
    ctx.save();

    const pulse = Math.sin(this.pulsePhase) * 0.15 + 1;
    const baseR = this.width / 2;

    if (this.exposed) {
      ctx.shadowColor = '#ff2255';
      ctx.shadowBlur = 25;
    } else if (this.onBeat) {
      ctx.shadowColor = '#4488ff';
      ctx.shadowBlur = 18 * pulse;
    } else {
      ctx.shadowColor = '#6622aa';
      ctx.shadowBlur = 10;
    }

    const grad = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, baseR * pulse
    );
    if (this.exposed) {
      grad.addColorStop(0, 'rgba(180, 40, 80, 0.9)');
      grad.addColorStop(0.6, 'rgba(100, 10, 40, 0.7)');
      grad.addColorStop(1, 'rgba(40, 0, 20, 0)');
    } else if (this.onBeat) {
      grad.addColorStop(0, 'rgba(60, 40, 140, 0.95)');
      grad.addColorStop(0.5, 'rgba(30, 15, 80, 0.8)');
      grad.addColorStop(1, 'rgba(10, 0, 40, 0)');
    } else {
      grad.addColorStop(0, 'rgba(30, 15, 60, 0.85)');
      grad.addColorStop(0.6, 'rgba(15, 5, 35, 0.6)');
      grad.addColorStop(1, 'rgba(5, 0, 15, 0)');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, baseR * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = this.exposed ? '#ff6688' : '#c8a0ff';
    ctx.beginPath();
    ctx.arc(this.x, this.y - 2, 3, 0, Math.PI * 2);
    ctx.arc(this.x + 7, this.y - 2, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      w: this.width,
      h: this.height,
    };
  }
}
