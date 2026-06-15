import Phaser from 'phaser';

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: number;
}

export class DustStorm {
  private scene: Phaser.Scene;
  private particles: DustParticle[] = [];
  private stormGraphics: Phaser.GameObjects.Graphics;
  private fogGraphics: Phaser.GameObjects.Graphics;
  
  private active: boolean = false;
  private stormTimer: number = 0;
  private readonly PARTICLE_COUNT: number = 200;
  private readonly DURATION: number = 8000;
  private readonly CANVAS_WIDTH: number = 1200;
  private readonly CANVAS_HEIGHT: number = 800;
  private readonly FOG_MARGIN: number = 100;
  
  private fadeIn: boolean = false;
  private fadeOut: boolean = false;
  private fadeProgress: number = 0;
  private readonly FADE_DURATION: number = 800;
  
  private windAngle: number = 0;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.stormGraphics = new Phaser.GameObjects.Graphics(scene);
    this.fogGraphics = new Phaser.GameObjects.Graphics(scene);
    this.stormGraphics.setDepth(900);
    this.fogGraphics.setDepth(899);
    scene.add.existing(this.stormGraphics);
    scene.add.existing(this.fogGraphics);
  }
  
  isActive(): boolean {
    return this.active;
  }
  
  start(): void {
    if (this.active) return;
    
    this.active = true;
    this.fadeIn = true;
    this.fadeOut = false;
    this.fadeProgress = 0;
    this.stormTimer = this.DURATION;
    this.windAngle = Math.random() * Math.PI * 2;
    
    this.particles = [];
    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      this.particles.push(this.createParticle(true));
    }
  }
  
  private createParticle(randomPos: boolean = false): DustParticle {
    const angle = this.windAngle + (Math.random() - 0.5) * 0.5;
    const speed = 4 + Math.random() * 4;
    
    let x: number, y: number;
    if (randomPos) {
      x = Math.random() * this.CANVAS_WIDTH;
      y = Math.random() * this.CANVAS_HEIGHT;
    } else {
      const spawnEdge = Math.floor(Math.random() * 4);
      switch (spawnEdge) {
        case 0:
          x = Math.random() * this.CANVAS_WIDTH;
          y = -10;
          break;
        case 1:
          x = this.CANVAS_WIDTH + 10;
          y = Math.random() * this.CANVAS_HEIGHT;
          break;
        case 2:
          x = Math.random() * this.CANVAS_WIDTH;
          y = this.CANVAS_HEIGHT + 10;
          break;
        default:
          x = -10;
          y = Math.random() * this.CANVAS_HEIGHT;
      }
    }
    
    const colors = [0xD2B48C, 0xDEB887, 0xD2691E, 0xCD853F, 0xBC8F8F];
    
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 3,
      alpha: 0.5 + Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
  }
  
  update(delta: number): void {
    if (!this.active) return;
    
    if (this.fadeIn) {
      this.fadeProgress = Math.min(1, this.fadeProgress + delta / this.FADE_DURATION);
      if (this.fadeProgress >= 1) this.fadeIn = false;
    }
    
    this.stormTimer -= delta;
    if (this.stormTimer <= 0 && !this.fadeOut) {
      this.fadeOut = true;
      this.fadeProgress = 1;
    }
    
    if (this.fadeOut) {
      this.fadeProgress = Math.max(0, this.fadeProgress - delta / this.FADE_DURATION);
      if (this.fadeProgress <= 0) {
        this.active = false;
        this.stormGraphics.clear();
        this.fogGraphics.clear();
        return;
      }
    }
    
    const intensity = this.fadeProgress;
    
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx * (delta / 16);
      p.y += p.vy * (delta / 16);
      
      if (p.x < -20 || p.x > this.CANVAS_WIDTH + 20 ||
          p.y < -20 || p.y > this.CANVAS_HEIGHT + 20) {
        this.particles[i] = this.createParticle(false);
      }
    }
    
    this.draw(intensity);
  }
  
  private draw(intensity: number): void {
    const sg = this.stormGraphics;
    sg.clear();
    
    for (const p of this.particles) {
      sg.fillStyle(p.color, p.alpha * intensity);
      sg.fillCircle(p.x, p.y, p.size);
      
      sg.lineStyle(p.size * 0.6, p.color, p.alpha * intensity * 0.4);
      sg.lineBetween(p.x, p.y, p.x - p.vx * 1.5, p.y - p.vy * 1.5);
    }
    
    const fg = this.fogGraphics;
    fg.clear();
    
    const m = this.FOG_MARGIN;
    const w = this.CANVAS_WIDTH;
    const h = this.CANVAS_HEIGHT;
    const alpha = 0.3 * intensity;
    
    const gradientSteps = 10;
    for (let i = 0; i < gradientSteps; i++) {
      const t = i / gradientSteps;
      const stepAlpha = alpha * (1 - t);
      const margin = m * t;
      
      fg.fillStyle(0xDEB887, stepAlpha * 0.3);
      fg.fillRect(margin, 0, w - margin * 2, margin);
      fg.fillRect(margin, h - margin, w - margin * 2, margin);
      fg.fillRect(0, margin, margin, h - margin * 2);
      fg.fillRect(w - margin, margin, margin, h - margin * 2);
    }
    
    const corners = [
      { cx: 0, cy: 0 },
      { cx: w, cy: 0 },
      { cx: 0, cy: h },
      { cx: w, cy: h }
    ];
    
    for (const c of corners) {
      for (let i = 0; i < 8; i++) {
        const t = i / 8;
        fg.fillStyle(0xD2B48C, alpha * (1 - t) * 0.25);
        fg.fillCircle(c.cx, c.cy, m * (1 - t * 0.5));
      }
    }
  }
  
  destroy(): void {
    this.stormGraphics.destroy();
    this.fogGraphics.destroy();
  }
}
