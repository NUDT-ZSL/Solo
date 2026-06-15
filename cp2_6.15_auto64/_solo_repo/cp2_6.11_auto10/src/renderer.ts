export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type: 'hatch' | 'evolution' | 'weather' | 'mutation' | 'shell' | 'trail' | 'glow';
  startX: number;
  startY: number;
  rotation?: number;
  rotationSpeed?: number;
  angle?: number;
  radius?: number;
  centerX?: number;
  centerY?: number;
  colorStart?: string;
  colorEnd?: string;
}

export interface ShellFragment {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  startX: number;
  startY: number;
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
  private maxParticles: number = 600;
  public drawCalls: DrawCall = { count: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D 上下文初始化失败');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.setupResponsive();
  }

  private setupResponsive(): void {
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
    if (alpha < 1) this.ctx.globalAlpha = alpha;
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
    if (alpha < 1) this.ctx.globalAlpha = 1;
    this.drawCalls.count++;
  }

  public drawCachedGrass(cachedCanvas: HTMLCanvasElement, offsetY: number): void {
    this.ctx.drawImage(cachedCanvas, 0, offsetY);
    this.drawCalls.count++;
  }

  public addHatchParticles(cx: number, cy: number, color: string, count: number = 25): void {
    const actualCount = Math.min(count, this.maxParticles - this.particles.length);
    const colors = [color, '#FFFFFF', this.lightenColor(color, 0.3), this.darkenColor(color, 0.2)];
    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 2.8;
      const offsetX = (Math.random() - 0.5) * 2;
      const offsetY = (Math.random() - 0.5) * 2;
      const startX = cx + offsetX;
      const startY = cy + offsetY;
      this.particles.push({
        x: startX,
        y: startY,
        startX,
        startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.floor(Math.random() * 2),
        life: 500,
        maxLife: 500,
        type: 'hatch'
      });
    }
  }

  public addEvolutionParticles(cx: number, cy: number): void {
    const palette = ['#F5D442', '#E25822', '#FF6B9D', '#4ECDC4', '#A78BFA', '#34D399', '#FBBF24', '#F87171'];
    const batchSize = Math.min(10, this.maxParticles - this.particles.length);
    for (let i = 0; i < batchSize; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 8 + Math.random() * 70;
      const rotSpeed = (Math.random() > 0.5 ? 1 : -1) * (0.03 + Math.random() * 0.08);
      const ci = Math.floor(Math.random() * palette.length);
      this.particles.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        startX: cx,
        startY: cy,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        color: palette[ci],
        colorStart: palette[ci],
        colorEnd: palette[(ci + 3) % palette.length],
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
  }

  public triggerEvolutionStorm(cx: number, cy: number): void {
    for (let i = 0; i < 120; i++) {
      setTimeout(() => {
        this.addEvolutionParticles(cx, cy);
      }, i * 15);
    }
  }

  public addWeatherParticles(weather: string, dt: number): void {
    const weatherCount = this.particles.filter(p => p.type === 'weather').length;
    if (weather === 'cloudy') {
      if (weatherCount < 80 && Math.random() < 0.4 * (dt / 16)) {
        const x = Math.random() * this.baseWidth;
        const y = Math.random() * (this.baseHeight * 0.55);
        this.particles.push({
          x, y, startX: x, startY: y,
          vx: (Math.random() - 0.4) * 0.25,
          vy: 0.02,
          color: `rgba(160, 160, 170, ${0.22 + Math.random() * 0.28})`,
          size: 4 + Math.floor(Math.random() * 7),
          life: 9000,
          maxLife: 9000,
          type: 'weather'
        });
      }
    } else if (weather === 'rain') {
      const spawn = Math.min(Math.ceil(6 * dt / 16), this.maxParticles - this.particles.length);
      for (let i = 0; i < spawn; i++) {
        if (weatherCount + i >= 180) break;
        const x = Math.random() * this.baseWidth;
        this.particles.push({
          x, y: -4, startX: x, startY: -4,
          vx: -0.4,
          vy: 5.5 + Math.random() * 3.5,
          color: '#5B9BD9',
          size: 1,
          life: 3500,
          maxLife: 3500,
          type: 'weather'
        });
      }
    } else if (weather === 'snow') {
      if (weatherCount < 140 && Math.random() < 0.85 * (dt / 16)) {
        const x = Math.random() * this.baseWidth;
        this.particles.push({
          x, y: -3, startX: x, startY: -3,
          vx: (Math.random() - 0.5) * 0.9,
          vy: 0.6 + Math.random() * 1.8,
          color: Math.random() > 0.3 ? '#FFFFFF' : '#F0F4FF',
          size: 2 + Math.floor(Math.random() * 2),
          life: 12000,
          maxLife: 12000,
          type: 'weather'
        });
      }
    }
  }

  public addMutationParticles(cx: number, cy: number): void {
    const colors = ['#F5D442', '#FFFFFF', '#FFE066', '#FFF3B0'];
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 2.2;
      this.particles.push({
        x: cx, y: cy, startX: cx, startY: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.floor(Math.random() * 2),
        life: 300,
        maxLife: 300,
        type: 'mutation'
      });
    }
  }

  public addTrailParticles(x: number, y: number): void {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 5,
      y: y + (Math.random() - 0.5) * 5,
      startX: x, startY: y,
      vx: (Math.random() - 0.5) * 0.2,
      vy: 0.25,
      color: 'rgba(245, 212, 66, 0.6)',
      size: 3,
      life: 500,
      maxLife: 500,
      type: 'trail'
    });
  }

  public addGlowParticles(cx: number, cy: number, radius: number): void {
    const count = this.particles.filter(p => p.type === 'glow').length;
    if (count >= 45) return;
    const angle = Math.random() * Math.PI * 2;
    const r = radius * (0.45 + Math.random() * 0.25);
    this.particles.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      startX: cx, startY: cy,
      vx: 0, vy: 0,
      angle,
      centerX: cx, centerY: cy,
      radius: r,
      rotationSpeed: 0.015 + Math.random() * 0.01,
      color: Math.random() > 0.5 ? 'rgba(255, 230, 102, 0.55)' : 'rgba(245, 212, 66, 0.45)',
      size: 2,
      life: 2200,
      maxLife: 2200,
      type: 'glow'
    });
  }

  public createShellFragments(cx: number, cy: number, eggSize: number, color: string): void {
    const ps = 8;
    for (let i = 0; i < 8; i++) {
      const pattern: number[][] = [];
      for (let r = 0; r < ps; r++) {
        const row: number[] = [];
        for (let c = 0; c < ps; c++) row.push(Math.random() > 0.38 ? 1 : 0);
        pattern.push(row);
      }
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.35;
      const speed = 2.2 + Math.random() * 3.2;
      this.shellFragments.push({
        x: cx, y: cy, startX: cx, startY: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.4,
        size: eggSize / ps,
        color,
        life: 1000,
        maxLife: 1000,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.22,
        pixelPattern: pattern
      });
    }
  }

  public updateParticles(dt: number): void {
    const f = dt / 16.67;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }

      if (p.type === 'evolution' && p.centerX !== undefined && p.centerY !== undefined) {
        p.angle = (p.angle || 0) + (p.rotationSpeed || 0) * f;
        p.radius = (p.radius || 0) + 0.18 * f;
        p.x = p.centerX + Math.cos(p.angle) * p.radius;
        p.y = p.centerY + Math.sin(p.angle) * p.radius;
        p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx * f; p.y += p.vy * f;
        if (p.colorStart && p.colorEnd) {
          const t = 1 - p.life / p.maxLife;
          p.color = this.interpolateColor(p.colorStart, p.colorEnd, t);
        }
      } else if (p.type === 'glow' && p.centerX !== undefined && p.centerY !== undefined) {
        p.angle = (p.angle || 0) + (p.rotationSpeed || 0) * f;
        p.x = p.centerX + Math.cos(p.angle) * (p.radius || 20);
        p.y = p.centerY + Math.sin(p.angle) * (p.radius || 20);
      } else {
        p.x += p.vx * f;
        p.y += p.vy * f;
        if (p.type === 'hatch' || p.type === 'mutation' || p.type === 'trail') {
          p.vy += 0.055 * f;
        }
      }
      if (p.type === 'weather' && p.y > this.baseHeight + 10) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.shellFragments.length - 1; i >= 0; i--) {
      const s = this.shellFragments[i];
      s.life -= dt;
      if (s.life <= 0) { this.shellFragments.splice(i, 1); continue; }
      s.x += s.vx * f;
      s.y += s.vy * f;
      s.vy += 0.16 * f;
      s.rotation += s.rotationSpeed * f;
    }
  }

  public drawParticles(): void {
    const hatch = this.particles.filter(p => p.type === 'hatch' || p.type === 'mutation');
    const evo = this.particles.filter(p => p.type === 'evolution');
    const weather = this.particles.filter(p => p.type === 'weather');
    const trail = this.particles.filter(p => p.type === 'trail');
    const glow = this.particles.filter(p => p.type === 'glow');

    if (hatch.length > 0) {
      for (const p of hatch) {
        this.ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        this.drawPixel(p.x, p.y, p.size, p.color);
      }
      this.ctx.globalAlpha = 1;
      this.drawCalls.count++;
    }
    if (evo.length > 0) {
      for (const p of evo) {
        this.ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        this.drawPixel(p.x, p.y, p.size, p.color);
      }
      this.ctx.globalAlpha = 1;
      this.drawCalls.count++;
    }
    if (weather.length > 0) {
      for (const p of weather) {
        this.ctx.fillStyle = p.color;
        if (p.size <= 1) this.ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 5);
        else this.ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
      }
      this.drawCalls.count++;
    }
    if (trail.length > 0) {
      for (const p of trail) {
        this.ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        this.drawPixel(p.x, p.y, p.size, p.color);
      }
      this.ctx.globalAlpha = 1;
      this.drawCalls.count++;
    }
    if (glow.length > 0) {
      for (const p of glow) {
        this.ctx.globalAlpha = Math.max(0, (p.life / p.maxLife) * 0.75);
        this.drawPixel(p.x, p.y, p.size, p.color);
      }
      this.ctx.globalAlpha = 1;
      this.drawCalls.count++;
    }
    if (this.shellFragments.length > 0) {
      for (const s of this.shellFragments) {
        this.ctx.globalAlpha = Math.max(0, s.life / s.maxLife);
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
                Math.ceil(s.size), Math.ceil(s.size)
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

  private lightenColor(hex: string, amt: number): string {
    const n = parseInt(hex.replace('#', ''), 16);
    const a = Math.round(255 * amt);
    const R = Math.min(255, (n >> 16) + a);
    const G = Math.min(255, ((n >> 8) & 0xFF) + a);
    const B = Math.min(255, (n & 0xFF) + a);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  private darkenColor(hex: string, amt: number): string {
    const n = parseInt(hex.replace('#', ''), 16);
    const a = Math.round(255 * amt);
    const R = Math.max(0, (n >> 16) - a);
    const G = Math.max(0, ((n >> 8) & 0xFF) - a);
    const B = Math.max(0, (n & 0xFF) - a);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  private interpolateColor(c1: string, c2: string, t: number): string {
    const n1 = parseInt(c1.replace('#', ''), 16);
    const n2 = parseInt(c2.replace('#', ''), 16);
    const r = Math.floor(((n1 >> 16) * (1 - t) + (n2 >> 16) * t));
    const g = Math.floor((((n1 >> 8) & 0xFF) * (1 - t) + ((n2 >> 8) & 0xFF) * t));
    const b = Math.floor(((n1 & 0xFF) * (1 - t) + ((n2 & 0xFF) * t)));
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  }

  public getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / this.scale,
      y: (clientY - rect.top) / this.scale
    };
  }

  public getContext(): CanvasRenderingContext2D { return this.ctx; }
  public getBaseDimensions(): { w: number; h: number } { return { w: this.baseWidth, h: this.baseHeight }; }
}
