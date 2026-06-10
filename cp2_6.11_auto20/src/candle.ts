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
  
  private static readonly MIN_FLAME_HEIGHT = 20;
  private static readonly MAX_FLAME_HEIGHT = 40;
  private static readonly ORANGE_START = { r: 255, g: 179, b: 71 };
  private static readonly ORANGE_END = { r: 255, g: 109, b: 0 };
  private static readonly BLUE_START = { r: 142, g: 45, b: 226 };
  private static readonly BLUE_END = { r: 74, g: 0, b: 224 };

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
    const flameHeight = this.flameHeight * this.scale;
    
    const life = initial ? Math.random() * 1 : 0;
    const maxLife = 0.8 + Math.random() * 0.6;
    
    return {
      x: this.x + (Math.random() - 0.5) * 12 * this.scale,
      y: this.y - Math.random() * flameHeight * 0.3,
      vx: (Math.random() - 0.5) * 8 * this.scale,
      vy: -(20 + Math.random() * 25) * this.scale,
      size: (3 + Math.random() * 5) * this.scale,
      baseSize: (3 + Math.random() * 5) * this.scale,
      life: life,
      maxLife: maxLife,
      alpha: 0
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

    const minH = Candle.MIN_FLAME_HEIGHT;
    const maxH = Candle.MAX_FLAME_HEIGHT;
    this.targetFlameHeight = minH + (Math.sin(this.time * 3 + Math.random() * 0.5) + 1) * 0.5 * (maxH - minH) * 0.8 + Math.random() * 3;
    this.targetFlameHeight = Math.max(minH, Math.min(maxH, this.targetFlameHeight));
    
    this.flameHeight += (this.targetFlameHeight - this.flameHeight) * deltaTime * 3;
    this.flameHeight = Math.max(minH, Math.min(maxH, this.flameHeight));

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
    }
  }

  private lerpColor(color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }, t: number): string {
    const r = Math.round(color1.r + (color2.r - color1.r) * t);
    const g = Math.round(color1.g + (color2.g - color1.g) * t);
    const b = Math.round(color1.b + (color2.b - color1.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private getFlameColor(lifeRatio: number, alpha: number): string {
    if (this.blueTransition > 0) {
      const orangeColor = this.lerpColor(Candle.ORANGE_START, Candle.ORANGE_END, 1 - lifeRatio);
      const blueColor = this.lerpColor(Candle.BLUE_START, Candle.BLUE_END, 1 - lifeRatio);
      
      const orangeMatch = orangeColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      const blueMatch = blueColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      
      if (orangeMatch && blueMatch) {
        const or = parseInt(orangeMatch[1]);
        const og = parseInt(orangeMatch[2]);
        const ob = parseInt(orangeMatch[3]);
        const br = parseInt(blueMatch[1]);
        const bg = parseInt(blueMatch[2]);
        const bb = parseInt(blueMatch[3]);
        
        const r = Math.round(or + (br - or) * this.blueTransition);
        const g = Math.round(og + (bg - og) * this.blueTransition);
        const b = Math.round(ob + (bb - ob) * this.blueTransition);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }
    
    const baseColor = this.lerpColor(Candle.ORANGE_START, Candle.ORANGE_END, 1 - lifeRatio);
    const match = baseColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
    }
    return `rgba(255, 179, 71, ${alpha})`;
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
      
      const lifeRatio = p.life / p.maxLife;
      ctx.fillStyle = this.getFlameColor(lifeRatio, p.alpha * 0.8);
      
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
      const orange1 = 'rgba(255, 220, 150, 1)';
      const orange2 = 'rgba(255, 179, 71, 1)';
      const orange3 = 'rgba(255, 109, 0, 0.9)';
      
      const blue1 = `rgba(200, 150, 255, ${this.blueTransition})`;
      const blue2 = `rgba(142, 45, 226, ${this.blueTransition * 0.9})`;
      const blue3 = `rgba(74, 0, 224, ${this.blueTransition * 0.8})`;
      
      gradient.addColorStop(0, orange1);
      gradient.addColorStop(0.2, orange2);
      gradient.addColorStop(0.4, orange3);
      if (this.blueTransition > 0) {
        gradient.addColorStop(0.6, blue3);
        gradient.addColorStop(0.8, blue2);
        gradient.addColorStop(1, blue1);
      }
    } else {
      gradient.addColorStop(0, 'rgba(255, 220, 150, 1)');
      gradient.addColorStop(0.3, 'rgba(255, 179, 71, 1)');
      gradient.addColorStop(0.6, 'rgba(255, 109, 0, 0.9)');
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
    
    this.roundRect(
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
    this.roundRect(
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

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
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
