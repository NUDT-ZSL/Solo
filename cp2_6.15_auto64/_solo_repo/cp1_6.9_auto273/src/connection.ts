import { Beacon } from './beacon';

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class Connection {
  beaconA: Beacon;
  beaconB: Beacon;
  private lightPosition: number = 0;
  private flowSpeed: number = 0.0003;
  private breaking: boolean = false;
  private breakProgress: number = 0;
  private breakDuration: number = 500;
  private breakStartTime: number = 0;
  private burstParticles: BurstParticle[] = [];
  private broken: boolean = false;
  private connected: boolean = true;
  id: string;

  constructor(beaconA: Beacon, beaconB: Beacon) {
    this.beaconA = beaconA;
    this.beaconB = beaconB;
    this.id = `conn-${beaconA.id}-${beaconB.id}`;
  }

  getDistance(): number {
    const dx = this.beaconB.x - this.beaconA.x;
    const dy = this.beaconB.y - this.beaconA.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  isBroken(): boolean {
    return this.broken;
  }

  isConnected(): boolean {
    return this.connected && !this.broken;
  }

  startBreak(time: number): void {
    if (this.breaking || this.broken) return;
    this.breaking = true;
    this.breakStartTime = time;
    this.connected = false;
    
    const midX = (this.beaconA.x + this.beaconB.x) / 2;
    const midY = (this.beaconA.y + this.beaconB.y) / 2;
    const count = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      const hue = Math.random() < 0.5 ? this.beaconA.hue : this.beaconB.hue;
      this.burstParticles.push({
        x: midX,
        y: midY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        hue,
        alpha: 1,
        life: 0,
        maxLife: 1000
      });
    }
  }

  update(deltaTime: number, time: number): void {
    this.lightPosition += this.flowSpeed * deltaTime;
    this.lightPosition = this.lightPosition % 1;

    if (this.getDistance() > 250 && this.connected && !this.breaking) {
      this.startBreak(time);
    }

    if (this.breaking) {
      this.breakProgress = Math.min(1, (time - this.breakStartTime) / this.breakDuration);
      if (this.breakProgress >= 1) {
        this.broken = true;
      }
    }

    for (const particle of this.burstParticles) {
      particle.life += deltaTime;
      const lifeProgress = particle.life / particle.maxLife;
      particle.alpha = Math.max(0, 1 - lifeProgress);
      particle.x += particle.vx * (deltaTime / 1000);
      particle.y += particle.vy * (deltaTime / 1000);
      particle.vx *= 0.98;
      particle.vy *= 0.98;
    }
    this.burstParticles = this.burstParticles.filter(p => p.life < p.maxLife);
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    const ax = this.beaconA.x;
    const ay = this.beaconA.y;
    const bx = this.beaconB.x;
    const by = this.beaconB.y;
    const distance = this.getDistance();
    
    const baseAlpha = this.breaking ? (1 - this.breakProgress) : 1;
    if (baseAlpha <= 0) {
      this.renderBurstParticles(ctx);
      return;
    }

    const dotSpacing = 8;
    const numDots = Math.max(2, Math.floor(distance / dotSpacing));
    
    const rgbA = this.beaconA.getColorRgb();
    const rgbB = this.beaconB.getColorRgb();

    ctx.save();
    ctx.globalAlpha = baseAlpha;

    for (let i = 0; i <= numDots; i++) {
      const t = i / numDots;
      const x = ax + (bx - ax) * t;
      const y = ay + (by - ay) * t;
      
      const r = Math.round(rgbA.r + (rgbB.r - rgbA.r) * t);
      const g = Math.round(rgbA.g + (rgbB.g - rgbA.g) * t);
      const b = Math.round(rgbA.b + (rgbB.b - rgbA.b) * t);
      
      const dotSize = 3;
      
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
      ctx.shadowBlur = 8;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }

    const flowT = this.lightPosition;
    const flowX = ax + (bx - ax) * flowT;
    const flowY = ay + (by - ay) * flowT;
    
    const flowR = Math.round(rgbA.r + (rgbB.r - rgbA.r) * flowT);
    const flowG = Math.round(rgbA.g + (rgbB.g - rgbA.g) * flowT);
    const flowB = Math.round(rgbA.b + (rgbB.b - rgbA.b) * flowT);
    
    const glowSize = 8;
    ctx.shadowColor = `rgba(255, 255, 255, 1)`;
    ctx.shadowBlur = 16;
    
    const flowGradient = ctx.createRadialGradient(flowX, flowY, 0, flowX, flowY, glowSize);
    flowGradient.addColorStop(0, `rgba(255, 255, 255, 1)`);
    flowGradient.addColorStop(0.3, `rgba(255, 255, 255, 0.8)`);
    flowGradient.addColorStop(0.6, `rgba(${flowR}, ${flowG}, ${flowB}, 0.6)`);
    flowGradient.addColorStop(1, `rgba(${flowR}, ${flowG}, ${flowB}, 0)`);
    
    ctx.fillStyle = flowGradient;
    ctx.beginPath();
    ctx.arc(flowX, flowY, glowSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    this.renderBurstParticles(ctx);
  }

  private renderBurstParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.burstParticles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = `hsla(${p.hue}, 80%, 70%, 1)`;
      ctx.shadowBlur = 10;
      ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, 1)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  isBurstComplete(): boolean {
    return this.broken && this.burstParticles.length === 0;
  }
}
