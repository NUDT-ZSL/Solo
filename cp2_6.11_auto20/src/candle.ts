interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  life: number;
  maxLife: number;
  alpha: number;
  hue: number;
}

export class Candle {
  private ctx: CanvasRenderingContext2D;
  private x: number;
  private y: number;
  private baseWidth: number;
  private baseHeight: number;
  private scale: number;
  private isBlue: boolean;
  private blueTransition: number;
  private particles: Particle[];
  private maxParticles: number;
  private time: number;
  private flameHeight: number;
  private targetFlameHeight: number;
  private glowIntensity: number;

  constructor(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number = 1) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.baseWidth = 30;
    this.baseHeight = 50;
    this.scale = scale;
    this.isBlue = false;
    this.blueTransition = 0;
    this.particles = [];
    this.maxParticles = 25;
    this.time = Math.random() * 100;
    this.flameHeight = 30;
    this.targetFlameHeight = 30;
    this.glowIntensity = 0.8;

    this.initParticles();
  }

  private initParticles(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  private createParticle(initial: boolean = false): Particle {
    const width = this.baseWidth * this.scale;
    const height = this.flameHeight * this.scale;
    
    const life = initial ? Math.random() * 1 : 0;
    const maxLife = 0.8 + Math.random() * 0.6;
    
    return {
      x: this.x + (Math.random() - 0.5) * width * 0.4,
      y: this.y - Math.random() * height * 0.3,
      vx: (Math.random() - 0.5) * 8 * this.scale,
      vy: -(20 + Math.random() * 25) * this.scale,
      size: (3 + Math.random() * 5) * this.scale,
      baseSize: (3 + Math.random() * 5) * this.scale,
      life: life,
      maxLife: maxLife,
      alpha: 0,
      hue: this.isBlue ? 270 : 30
    };
  }

  public setPosition(x: number, y: number, scale: number): void {
    this.x = x;
    this.y = y;
    this.scale = scale;
  }

  public setBlue(isBlue: boolean): void {
    this.isBlue = isBlue;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    this.targetFlameHeight = 25 + Math.sin(this.time * 3 + Math.random() * 0.5) * 10 + Math.random() * 5;
    this.flameHeight += (this.targetFlameHeight - this.flameHeight) * deltaTime * 3;

    const targetTransition = this.isBlue ? 1 : 0;
    this.blueTransition += (targetTransition - this.blueTransition) * deltaTime * 1.5;

    this.glowIntensity = 0.7 + Math.sin(this.time * 2) * 0.2 + Math.random() * 0.1;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      p.life += deltaTime;
      
      if (p.life >= p.maxLife) {
        this.particles[i] = this.createParticle();
        continue;
      }

      const lifeRatio = p.life / p.maxLife;
      
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      
      p.vx += (Math.random() - 0.5) * 15 * this.scale * deltaTime;
      p.vy += -10 * this.scale * deltaTime;
      
      p.vx *= 0.98;
      p.vy *= 0.98;

      if (lifeRatio < 0.2) {
        p.alpha = lifeRatio / 0.2;
        p.size = p.baseSize * (lifeRatio / 0.2);
      } else if (lifeRatio > 0.7) {
        p.alpha = (1 - lifeRatio) / 0.3;
        p.size = p.baseSize * ((1 - lifeRatio) / 0.3);
      } else {
        p.alpha = 1;
        p.size = p.baseSize;
      }

      p.hue = this.isBlue 
        ? 260 + (1 - lifeRatio) * 40 
        : 25 + (1 - lifeRatio) * 20;
    }
  }

  public draw(): void {
    const ctx = this.ctx;
    const width = this.baseWidth * this.scale;
    const height = this.baseHeight * this.scale;

    this.drawGlow();
    this.drawFlame();
    this.drawCandleHolder();
  }

  private drawGlow(): void {
    const ctx = this.ctx;
    const glowSize = 80 * this.scale * this.glowIntensity;
    
    const gradient = ctx.createRadialGradient(
      this.x, this.y - 20 * this.scale,
      0,
      this.x, this.y - 20 * this.scale,
      glowSize
    );
    
    if (this.isBlue || this.blueTransition > 0) {
      const orangeAlpha = (1 - this.blueTransition) * 0.3;
      const blueAlpha = this.blueTransition * 0.4;
      
      gradient.addColorStop(0, `rgba(142, 45, 226, ${blueAlpha})`);
      gradient.addColorStop(0.3, `rgba(74, 0, 224, ${blueAlpha * 0.5})`);
      gradient.addColorStop(0.5, `rgba(255, 179, 71, ${orangeAlpha})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else {
      gradient.addColorStop(0, 'rgba(255, 179, 71, 0.3)');
      gradient.addColorStop(0.4, 'rgba(255, 109, 0, 0.15)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y - 20 * this.scale, glowSize, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawFlame(): void {
    const ctx = this.ctx;
    
    ctx.globalCompositeOperation = 'lighter';
    
    for (const p of this.particles) {
      if (p.alpha <= 0) continue;
      
      const saturation = this.isBlue ? 80 : 100;
      const lightness = 50 + (1 - p.life / p.maxLife) * 20;
      
      ctx.fillStyle = `hsla(${p.hue}, ${saturation}%, ${lightness}%, ${p.alpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalCompositeOperation = 'source-over';
    
    this.drawFlameCore();
  }

  private drawFlameCore(): void {
    const ctx = this.ctx;
    const flameHeight = this.flameHeight * this.scale;
    const flameWidth = 12 * this.scale;
    const baseY = this.y - 5 * this.scale;
    
    ctx.save();
    
    const sway = Math.sin(this.time * 4) * 2 * this.scale;
    
    const gradient = ctx.createLinearGradient(
      this.x, baseY - flameHeight,
      this.x, baseY
    );
    
    if (this.isBlue || this.blueTransition > 0) {
      const orangeHue1 = 'rgba(255, 200, 100, 1)';
      const orangeHue2 = 'rgba(255, 109, 0, 0.9)';
      const blueHue1 = `rgba(200, 150, 255, ${this.blueTransition})`;
      const blueHue2 = `rgba(100, 50, 200, ${this.blueTransition * 0.9})`;
      
      gradient.addColorStop(0, orangeHue1);
      gradient.addColorStop(0.3, orangeHue2);
      if (this.blueTransition > 0) {
        gradient.addColorStop(0.5, blueHue2);
        gradient.addColorStop(0.8, blueHue1);
        gradient.addColorStop(1, orangeHue1);
      }
    } else {
      gradient.addColorStop(0, 'rgba(255, 220, 150, 1)');
      gradient.addColorStop(0.2, 'rgba(255, 179, 71, 1)');
      gradient.addColorStop(0.5, 'rgba(255, 109, 0, 0.9)');
      gradient.addColorStop(1, 'rgba(255, 80, 0, 0.4)');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    
    ctx.moveTo(this.x, baseY);
    ctx.bezierCurveTo(
      this.x - flameWidth + sway * 0.5, baseY - flameHeight * 0.3,
      this.x - flameWidth * 0.6 + sway, baseY - flameHeight * 0.7,
      this.x + sway * 0.3, baseY - flameHeight
    );
    ctx.bezierCurveTo(
      this.x + flameWidth * 0.6 + sway, baseY - flameHeight * 0.7,
      this.x + flameWidth + sway * 0.5, baseY - flameHeight * 0.3,
      this.x, baseY
    );
    
    ctx.fill();
    
    const innerGradient = ctx.createLinearGradient(
      this.x, baseY - flameHeight * 0.6,
      this.x, baseY - flameHeight * 0.1
    );
    innerGradient.addColorStop(0, 'rgba(255, 255, 200, 0.9)');
    innerGradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
    
    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.moveTo(this.x, baseY - flameHeight * 0.1);
    ctx.bezierCurveTo(
      this.x - flameWidth * 0.4 + sway * 0.3, baseY - flameHeight * 0.3,
      this.x - flameWidth * 0.2 + sway * 0.5, baseY - flameHeight * 0.5,
      this.x + sway * 0.2, baseY - flameHeight * 0.6
    );
    ctx.bezierCurveTo(
      this.x + flameWidth * 0.2 + sway * 0.5, baseY - flameHeight * 0.5,
      this.x + flameWidth * 0.4 + sway * 0.3, baseY - flameHeight * 0.3,
      this.x, baseY - flameHeight * 0.1
    );
    ctx.fill();
    
    ctx.restore();
  }

  private drawCandleHolder(): void {
    const ctx = this.ctx;
    const width = this.baseWidth * this.scale;
    const height = this.baseHeight * this.scale;
    const baseY = this.y;

    ctx.save();

    const baseGradient = ctx.createLinearGradient(
      this.x - width / 2, baseY,
      this.x + width / 2, baseY
    );
    baseGradient.addColorStop(0, '#5a3d1a');
    baseGradient.addColorStop(0.3, '#8B6914');
    baseGradient.addColorStop(0.5, '#C9A227');
    baseGradient.addColorStop(0.7, '#8B6914');
    baseGradient.addColorStop(1, '#5a3d1a');

    ctx.fillStyle = baseGradient;
    
    ctx.beginPath();
    ctx.roundRect(
      this.x - width / 2, baseY - height * 0.15,
      width, height * 0.15,
      3 * this.scale
    );
    ctx.fill();

    const stemGradient = ctx.createLinearGradient(
      this.x - width * 0.3, baseY - height * 0.15,
      this.x + width * 0.3, baseY - height * 0.15
    );
    stemGradient.addColorStop(0, '#5a3d1a');
    stemGradient.addColorStop(0.5, '#B8860B');
    stemGradient.addColorStop(1, '#5a3d1a');

    ctx.fillStyle = stemGradient;
    ctx.beginPath();
    ctx.roundRect(
      this.x - width * 0.15, baseY - height * 0.6,
      width * 0.3, height * 0.45,
      2 * this.scale
    );
    ctx.fill();

    const cupGradient = ctx.createRadialGradient(
      this.x, baseY - height * 0.6,
      0,
      this.x, baseY - height * 0.6,
      width * 0.4
    );
    cupGradient.addColorStop(0, '#DAA520');
    cupGradient.addColorStop(0.5, '#B8860B');
    cupGradient.addColorStop(1, '#6B4F0E');

    ctx.fillStyle = cupGradient;
    ctx.beginPath();
    ctx.ellipse(
      this.x, baseY - height * 0.6,
      width * 0.4, height * 0.12,
      0, 0, Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = '#3D1C10';
    ctx.beginPath();
    ctx.ellipse(
      this.x, baseY - height * 0.6,
      width * 0.3, height * 0.08,
      0, 0, Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(
      this.x - 2 * this.scale, baseY - height * 0.65,
      4 * this.scale, height * 0.12
    );

    ctx.shadowColor = 'rgba(255, 179, 71, 0.6)';
    ctx.shadowBlur = 10 * this.scale;
    ctx.fillStyle = '#FFB347';
    ctx.beginPath();
    ctx.arc(this.x, baseY - height * 0.68, 2 * this.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  public getX(): number {
    return this.x;
  }

  public getY(): number {
    return this.y;
  }

  public getScale(): number {
    return this.scale;
  }
}
