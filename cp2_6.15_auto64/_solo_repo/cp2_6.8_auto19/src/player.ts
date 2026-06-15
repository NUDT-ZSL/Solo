import type { PhysicsBody } from './engine';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export class Player implements PhysicsBody {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  jumpsLeft: number;
  wasOnGround: boolean;
  facing: 1 | -1;
  crouching: boolean;
  blinkTimer: number;
  invulnerable: number;
  particles: Particle[];
  eyeBlink: number;
  squash: number;
  stretch: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.w = 40;
    this.h = 48;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.jumpsLeft = 2;
    this.wasOnGround = false;
    this.facing = 1;
    this.crouching = false;
    this.blinkTimer = 0;
    this.invulnerable = 0;
    this.particles = [];
    this.eyeBlink = 0;
    this.squash = 1;
    this.stretch = 1;
  }

  update(dt: number): void {
    if (this.invulnerable > 0) {
      this.invulnerable -= dt;
    }

    this.blinkTimer += dt;
    if (this.blinkTimer > 3) {
      this.blinkTimer = 0;
      this.eyeBlink = 0.15;
    }
    if (this.eyeBlink > 0) {
      this.eyeBlink -= dt;
    }

    if (this.vx > 10) this.facing = 1;
    else if (this.vx < -10) this.facing = -1;

    if (!this.wasOnGround && this.onGround && Math.abs(this.vy) < 1) {
      this.spawnLandParticles();
      this.squash = 0.7;
      this.stretch = 1.3;
    }

    this.squash += (1 - this.squash) * Math.min(1, dt * 12);
    this.stretch += (1 - this.stretch) * Math.min(1, dt * 12);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  spawnLandParticles(): void {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.8;
      const speed = 80 + Math.random() * 120;
      this.particles.push({
        x: this.x + this.w / 2 + (Math.random() - 0.5) * this.w * 0.6,
        y: this.y + this.h,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.4,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6,
        size: 2 + Math.random() * 4,
        color: `rgba(${180 + Math.random() * 50}, ${140 + Math.random() * 40}, ${100 + Math.random() * 30}, 1)`,
      });
    }
  }

  spawnJumpParticles(): void {
    const count = 4;
    for (let i = 0; i < count; i++) {
      const angle = Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.5;
      const speed = 60 + Math.random() * 80;
      this.particles.push({
        x: this.x + this.w / 2 + (Math.random() - 0.5) * this.w * 0.5,
        y: this.y + this.h - 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + Math.random() * 0.15,
        maxLife: 0.4,
        size: 2 + Math.random() * 3,
        color: `rgba(150, 180, 255, 1)`,
      });
    }
  }

  spawnDoubleJumpParticles(): void {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 100 + Math.random() * 60;
      this.particles.push({
        x: this.x + this.w / 2,
        y: this.y + this.h / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        size: 2 + Math.random() * 3,
        color: `rgba(255, 220, 100, 1)`,
      });
    }
  }

  spawnCoinParticles(x: number, y: number): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 100;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 2 + Math.random() * 3,
        color: `rgba(255, ${200 + Math.random() * 55}, ${50 + Math.random() * 50}, 1)`,
      });
    }
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.jumpsLeft = 2;
    this.wasOnGround = false;
    this.facing = 1;
    this.crouching = false;
    this.invulnerable = 1.5;
    this.particles = [];
    this.squash = 1;
    this.stretch = 1;
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${alpha})`);
      ctx.beginPath();
      ctx.arc(p.x - cameraX, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.invulnerable > 0 && Math.floor(this.invulnerable * 12) % 2 === 0) {
      return;
    }

    const cx = this.x + this.w / 2 - cameraX;
    const cy = this.y + this.h / 2;
    const drawW = this.w * this.squash;
    const drawH = this.h * this.stretch;

    ctx.save();
    ctx.translate(cx, cy);

    const radius = 10;
    ctx.fillStyle = '#4fc3f7';
    this.roundRect(ctx, -drawW / 2, -drawH / 2, drawW, drawH, radius);
    ctx.fill();

    ctx.fillStyle = '#29b6f6';
    this.roundRect(ctx, -drawW / 2, -drawH / 2 + drawH * 0.5, drawW, drawH * 0.5, radius);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    this.roundRect(ctx, -drawW / 2 + 4, -drawH / 2 + 4, drawW * 0.35, drawH * 0.25, 6);
    ctx.fill();

    const eyeY = -drawH * 0.1;
    const eyeOffset = drawW * 0.2;
    const eyeW = 7;
    const eyeH = this.eyeBlink > 0 ? 1 : 9;
    const pupilOffset = this.facing === 1 ? 1.5 : -1.5;

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-eyeOffset, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(eyeOffset, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.eyeBlink <= 0) {
      ctx.fillStyle = '#1a237e';
      ctx.beginPath();
      ctx.arc(-eyeOffset + pupilOffset, eyeY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeOffset + pupilOffset, eyeY, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
