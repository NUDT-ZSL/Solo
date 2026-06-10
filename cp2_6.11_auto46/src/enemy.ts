import type { Fragment, Shockwave } from './particle';

export class Enemy {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  baseSpeed: number = 80;
  color: string;
  alpha: number = 0.4;
  isStunned: boolean = false;
  stunTimer: number = 0;
  showCore: boolean = false;
  coreRadius: number = 12;
  health: number = 1;
  flickerPhase: number;
  isAlive: boolean = true;

  constructor(x: number, y: number, vx: number, vy: number) {
    this.x = x;
    this.y = y;
    this.radius = 20;
    this.vx = vx;
    this.vy = vy;
    this.flickerPhase = Math.random() * Math.PI * 2;
    this.color = '#BD93F9';
  }

  update(dt: number, speedMultiplier: number): void {
    if (this.isStunned) {
      this.stunTimer -= dt;
      if (this.stunTimer <= 0) {
        this.isStunned = false;
        this.showCore = false;
      }
    } else {
      const speed = this.baseSpeed * speedMultiplier;
      const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (currentSpeed > 0) {
        this.vx = (this.vx / currentSpeed) * speed;
        this.vy = (this.vy / currentSpeed) * speed;
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
    this.flickerPhase += dt * 2;
    const flicker = (Math.sin(this.flickerPhase) + 1) / 2;
    this.color = this.lerpColor('#BD93F9', '#FF79C6', flicker);
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  render(ctx: CanvasRenderingContext2D, isSilentMode: boolean): void {
    if (!isSilentMode) {
      ctx.globalAlpha = this.alpha * 0.2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      
      ctx.globalAlpha = this.alpha * 0.35;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      
      ctx.globalAlpha = this.alpha * 0.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 1, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
    
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (this.showCore) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#FF5555';
      ctx.shadowColor = '#FF5555';
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.coreRadius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#FF8888';
      ctx.fill();
    }
  }

  hit(isCore: boolean): boolean {
    if (isCore) {
      this.isAlive = false;
      return true;
    }
    this.health--;
    if (this.health <= 0) {
      this.isAlive = false;
      return true;
    }
    return false;
  }

  stun(duration: number): void {
    this.isStunned = true;
    this.stunTimer = duration;
    this.showCore = true;
  }

  getFragments(): Array<Omit<Fragment, 'active' | 'spawnedShockwave'>> {
    const count = 12 + Math.floor(Math.random() * 5);
    const fragments: Array<Omit<Fragment, 'active' | 'spawnedShockwave'>> = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 80 + Math.random() * 120;
      fragments.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 4,
        color: this.color,
        life: 0.6,
        maxLife: 0.6
      });
    }
    return fragments;
  }

  getShockwave(): Omit<Shockwave, 'active' | 'radius' | 'life' | 'hitBullets'> {
    return {
      x: this.x,
      y: this.y,
      maxRadius: 60,
      maxLife: 0.4,
      color: '#8BE9FD'
    };
  }

  isOffScreen(width: number, height: number): boolean {
    return this.x < -100 || this.x > width + 100 || 
           this.y < -100 || this.y > height + 100;
  }
}
