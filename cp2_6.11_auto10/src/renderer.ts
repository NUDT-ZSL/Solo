export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type: 'hatch' | 'evolution' | 'weather' | 'mutation' | 'shell' | 'trail' | 'glow';
  rotation?: number;
  rotationSpeed?: number;
  angle?: number;
  radius?: number;
  centerX?: number;
  centerY?: number;
}

export interface ShellFragment {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
  pixelPattern: number[][];
}

export interface DrawCall {
  count: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private baseWidth: number = 640;
  private baseHeight: number = 480;
  public scale: number = 1;
  public particles: Particle[] = [];
  public shellFragments: ShellFragment[] = [];
  private maxParticles: number = 500;
  private offscreenGrass: HTMLCanvasElement | null = null;
  public drawCalls: DrawCall = { count: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.setupResponsive();
  }

  private setupResponsive(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const resize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight - 48;
      const scaleX = vw / this.baseWidth;
      const scaleY = vh / this.baseHeight;
      this.scale = Math.max(1, Math.floor(Math.min(scaleX, scaleY)));
      
      const w = this.baseWidth * this.scale;
      const h = this.baseHeight * this.scale;
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;
      
      this.ctx.imageSmoothingEnabled = false;
    };

    window.addEventListener('resize', resize);
    resize();
  }

  public clear(): void {
    this.drawCalls.count = 0;
    this.ctx.fillStyle = '#1B2838';
    this.ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);
    this.drawCalls.count++;
  }

  public setPixelated(): void {
    this.ctx.imageSmoothingEnabled = false;
  }

  public fillRect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
    this.drawCalls.count++;
  }

  public drawPixel(x: number, y: number, size: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
  }

  public drawPixelGrid(
    grid: (string | null)[][],
    x: number,
    y: number,
    pixelSize: number = 1,
    alpha: number = 1
  ): void {
    if (alpha < 1) {
      this.ctx.globalAlpha = alpha;
    }
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const color = grid[row][col];
        if (color) {
          this.ctx.fillStyle = color;
          this.ctx.fillRect(
            Math.floor(x + col * pixelSize),
            Math.floor(y + row * pixelSize),
            pixelSize,
            pixelSize
          );
        }
      }
    }
    if (alpha < 1) {
      this.ctx.globalAlpha = 1;
    }
    this.drawCalls.count++;
  }

  public drawCachedGrass(cachedCanvas: HTMLCanvasElement, offsetY: number): void {
    this.ctx.drawImage(cachedCanvas, 0, offsetY);
    this.drawCalls.count++;
  }

  public addHatchParticles(cx: number, cy: number, color: string, count: number = 25): void {
    const actualCount = Math.min(count, this.maxParticles - this.particles.length);
    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2.5;
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 2,
        y: cy + (Math.random() - 0.5) * 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 2,
        life: 500,
        maxLife: 500,
        type: 'hatch'
      });
    }
  }

  public addEvolutionParticles(cx: number, cy: number, dt: number): void {
    const colors = ['#F5D442', '#E25822', '#FF6B9D', '#4ECDC4', '#A78BFA', '#34D399'];
    const batchSize = Math.min(8, this.maxParticles - this.particles.length);
    for (let i = 0; i < batchSize; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 10 + Math.random() * 60;
      const rotSpeed = (Math.random() - 0.5) * 0.08;
      this.particles.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.floor(Math.random() * 3),
        life: 2000,
        maxLife: 2000,
        type: 'evolution',
        angle,
        radius,
        centerX: cx,
        centerY: cy,
        rotationSpeed: rotSpeed
      });
    }
    void dt;
  }

  public addWeatherParticles(weather: string, dt: number): void {
    if (this.particles.filter(p => p.type === 'weather').length >= 120) return;
    
    if (weather === 'cloudy') {
      if (Math.random() < 0.3) {
        this.particles.push({
          x: Math.random() * this.baseWidth,
          y: Math.random() * (this.baseHeight * 0.6),
          vx: (Math.random() - 0.3) * 0.3,
          vy: 0.05,
          color: `rgba(150, 150, 160, ${0.2 + Math.random() * 0.3})`,
          size: 4 + Math.floor(Math.random() * 6),
          life: 8000,
          maxLife: 8000,
          type: 'weather'
        });
      }
    } else if (weather === 'rain') {
      const batch = Math.min(5, this.maxParticles - this.particles.length);
      for (let i = 0; i < batch; i++) {
        this.particles.push({
          x: Math.random() * this.baseWidth,
          y: -4,
          vx: -0.5,
          vy: 6 + Math.random() * 3,
          color: '#4A90D9',
          size: 1,
          life: 3000,
          maxLife: 3000,
          type: 'weather'
        });
      }
    } else if (weather === 'snow') {
      if (Math.random() < 0.7) {
        this.particles.push({
          x: Math.random() * this.baseWidth,
          y: -3,
          vx: (Math.random() - 0.5) * 1,
          vy: 1 + Math.random() * 2,
          color: '#FFFFFF',
          size: 2 + Math.floor(Math.random() * 2),
          life: 10000,
          maxLife: 10000,
          type: 'weather'
        });
      }
    }
    void dt;
  }

  public addMutationParticles(cx: number, cy: number): void {
    const colors = ['#F5D442', '#FFFFFF', '#FFE066'];
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 2;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2,
        life: 300,
        maxLife: 300,
        type: 'mutation'
      });
    }
  }

  public addTrailParticles(x: number, y: number): void {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 0.2,
      vy: 0.3,
      color: 'rgba(245, 212, 66, 0.6)',
      size: 3,
      life: 500,
      maxLife: 500,
      type: 'trail'
    });
  }

  public addGlowParticles(cx: number, cy: number, radius: number): void {
    const count = this.particles.filter(p => p.type === 'glow').length;
    if (count >= 40) return;
    
    const angle = Math.random() * Math.PI * 2;
    this.particles.push({
      x: cx + Math.cos(angle) * (radius * 0.6),
      y: cy + Math.sin(angle) * (radius * 0.6),
      vx: 0,
      vy: 0,
      angle,
      centerX: cx,
      centerY: cy,
      radius: radius * 0.6,
      rotationSpeed: 0.02,
      color: 'rgba(255, 230, 102, 0.5)',
      size: 2,
      life: 2000,
      maxLife: 2000,
      type: 'glow'
    });
  }

  public createShellFragments(cx: number, cy: number, eggSize: number, color: string): void {
    const patternSize = 8;
    for (let i = 0; i < 8; i++) {
      const pattern: number[][] = [];
      for (let r = 0; r < patternSize; r++) {
        const row: number[] = [];
        for (let c = 0; c < patternSize; c++) {
          row.push(Math.random() > 0.4 ? 1 : 0);
        }
        pattern.push(row);
      }
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 2 + Math.random() * 3;
      this.shellFragments.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: eggSize / patternSize,
        color,
        life: 1000,
        maxLife: 1000,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        pixelPattern: pattern
      });
    }
  }

  public updateParticles(dt: number): void {
    const dtFactor = dt / 16.67;
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.type === 'evolution' && p.centerX !== undefined && p.centerY !== undefined) {
        p.angle = (p.angle || 0) + (p.rotationSpeed || 0) * dtFactor;
        p.radius = (p.radius || 0) + 0.15 * dtFactor;
        p.x = p.centerX + Math.cos(p.angle) * p.radius;
        p.y = p.centerY + Math.sin(p.angle) * p.radius;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx * dtFactor;
        p.y += p.vy * dtFactor;
      } else if (p.type === 'glow' && p.centerX !== undefined && p.centerY !== undefined) {
        p.angle = (p.angle || 0) + (p.rotationSpeed || 0) * dtFactor;
        p.x = p.centerX + Math.cos(p.angle) * (p.radius || 20);
        p.y = p.centerY + Math.sin(p.angle) * (p.radius || 20);
      } else {
        p.x += p.vx * dtFactor;
        p.y += p.vy * dtFactor;
        
        if (p.type === 'hatch' || p.type === 'mutation' || p.type === 'trail') {
          p.vy += 0.05 * dtFactor;
        }
      }

      if (p.type === 'weather' && p.y > this.baseHeight) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.shellFragments.length - 1; i >= 0; i--) {
      const s = this.shellFragments[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.shellFragments.splice(i, 1);
        continue;
      }
      s.x += s.vx * dtFactor;
      s.y += s.vy * dtFactor;
      s.vy += 0.15 * dtFactor;
      s.rotation += s.rotationSpeed * dtFactor;
    }
  }

  public drawParticles(): void {
    const hatchParticles = this.particles.filter(p => p.type === 'hatch' || p.type === 'mutation');
    const evolutionParticles = this.particles.filter(p => p.type === 'evolution');
    const weatherParticles = this.particles.filter(p => p.type === 'weather');
    const trailParticles = this.particles.filter(p => p.type === 'trail');
    const glowParticles = this.particles.filter(p => p.type === 'glow');

    if (hatchParticles.length > 0) {
      for (const p of hatchParticles) {
        const alpha = p.life / p.maxLife;
        this.ctx.globalAlpha = Math.max(0, alpha);
        this.drawPixel(p.x, p.y, p.size, p.color);
      }
      this.ctx.globalAlpha = 1;
      this.drawCalls.count++;
    }

    if (evolutionParticles.length > 0) {
      for (const p of evolutionParticles) {
        const alpha = p.life / p.maxLife;
        this.ctx.globalAlpha = Math.max(0, alpha);
        this.drawPixel(p.x, p.y, p.size, p.color);
      }
      this.ctx.globalAlpha = 1;
      this.drawCalls.count++;
    }

    if (weatherParticles.length > 0) {
      for (const p of weatherParticles) {
        this.ctx.fillStyle = p.color;
        if (p.size <= 1) {
          this.ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 4);
        } else {
          this.ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
        }
      }
      this.drawCalls.count++;
    }

    if (trailParticles.length > 0) {
      for (const p of trailParticles) {
        const alpha = p.life / p.maxLife;
        this.ctx.globalAlpha = Math.max(0, alpha);
        this.drawPixel(p.x, p.y, p.size, p.color);
      }
      this.ctx.globalAlpha = 1;
      this.drawCalls.count++;
    }

    if (glowParticles.length > 0) {
      for (const p of glowParticles) {
        const alpha = p.life / p.maxLife;
        this.ctx.globalAlpha = Math.max(0, alpha * 0.7);
        this.drawPixel(p.x, p.y, p.size, p.color);
      }
      this.ctx.globalAlpha = 1;
      this.drawCalls.count++;
    }

    if (this.shellFragments.length > 0) {
      for (const s of this.shellFragments) {
        const alpha = s.life / s.maxLife;
        this.ctx.globalAlpha = Math.max(0, alpha);
        this.ctx.save();
        this.ctx.translate(s.x, s.y);
        this.ctx.rotate(s.rotation);
        for (let r = 0; r < s.pixelPattern.length; r++) {
          for (let c = 0; c < s.pixelPattern[r].length; c++) {
            if (s.pixelPattern[r][c]) {
              this.ctx.fillStyle = s.color;
              this.ctx.fillRect(
                Math.floor(c * s.size - (s.pixelPattern[r].length * s.size) / 2),
                Math.floor(r * s.size - (s.pixelPattern.length * s.size) / 2),
                Math.ceil(s.size),
                Math.ceil(s.size)
              );
            }
          }
        }
        this.ctx.restore();
      }
      this.ctx.globalAlpha = 1;
      this.drawCalls.count++;
    }
  }

  public getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / this.scale,
      y: (clientY - rect.top) / this.scale
    };
  }

  public getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  public getBaseDimensions(): { w: number; h: number } {
    return { w: this.baseWidth, h: this.baseHeight };
  }
}
