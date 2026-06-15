interface NebulaParticle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  hue: number;
  speedX: number;
  speedY: number;
  angle: number;
  angleSpeed: number;
  driftOffset: number;
}

export class Nebula {
  private particles: NebulaParticle[] = [];
  private width: number = 0;
  private height: number = 0;
  private centerX: number = 0;
  private centerY: number = 0;
  private rotation: number = 0;

  constructor(width: number, height: number) {
    this.resize(width, height);
    this.initParticles();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
  }

  private initParticles(): void {
    this.particles = [];
    const count = 150;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * Math.max(this.width, this.height) * 0.6;
      const hue = 210 + Math.random() * 60;
      const size = 3 + Math.random() * 5;
      const alpha = 0.1 + Math.random() * 0.2;
      const speed = 0.2 + Math.random() * 0.3;
      
      this.particles.push({
        x: this.centerX + Math.cos(angle) * radius,
        y: this.centerY + Math.sin(angle) * radius,
        size,
        alpha,
        hue,
        speedX: (Math.random() - 0.5) * speed,
        speedY: (Math.random() - 0.5) * speed,
        angle,
        angleSpeed: (Math.random() - 0.5) * 0.0003,
        driftOffset: Math.random() * Math.PI * 2
      });
    }
  }

  update(deltaTime: number, time: number): void {
    this.rotation += 0.00005 * deltaTime;
    
    for (const p of this.particles) {
      p.angle += p.angleSpeed * deltaTime;
      const radius = Math.sqrt(
        Math.pow(p.x - this.centerX, 2) + Math.pow(p.y - this.centerY, 2)
      );
      const baseAngle = Math.atan2(p.y - this.centerY, p.x - this.centerX);
      const newAngle = baseAngle + p.angleSpeed * deltaTime * 0.5;
      
      p.x = this.centerX + Math.cos(newAngle) * radius + p.speedX * deltaTime * 0.06;
      p.y = this.centerY + Math.sin(newAngle) * radius + p.speedY * deltaTime * 0.06;
      
      const drift = Math.sin(time * 0.0003 + p.driftOffset) * 0.3;
      p.x += Math.cos(time * 0.0001 + p.driftOffset) * drift;
      p.y += Math.sin(time * 0.00015 + p.driftOffset) * drift;
      
      if (p.x < -50) p.x = this.width + 50;
      if (p.x > this.width + 50) p.x = -50;
      if (p.y < -50) p.y = this.height + 50;
      if (p.y > this.height + 50) p.y = -50;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      gradient.addColorStop(0, `hsla(${p.hue}, 70%, 60%, 1)`);
      gradient.addColorStop(0.5, `hsla(${p.hue}, 60%, 40%, 0.5)`);
      gradient.addColorStop(1, `hsla(${p.hue}, 50%, 20%, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
