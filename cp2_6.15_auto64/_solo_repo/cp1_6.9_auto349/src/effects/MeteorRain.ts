import Phaser from 'phaser';

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  diameter: number;
  rotation: number;
  rotationSpeed: number;
  color: number;
  active: boolean;
  flameParticles: FlameParticle[];
}

interface FlameParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: number;
  life: number;
  maxLife: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  active: boolean;
}

export interface ExplosionEvent {
  x: number;
  y: number;
  radius: number;
}

export class MeteorRain {
  private scene: Phaser.Scene;
  private meteors: Meteor[] = [];
  private shockwaves: Shockwave[] = [];
  private meteorGraphics: Phaser.GameObjects.Graphics;
  private shockwaveGraphics: Phaser.GameObjects.Graphics;
  private flameGraphics: Phaser.GameObjects.Graphics;
  
  private active: boolean = false;
  private meteorTimer: number = 0;
  private meteorSpawnInterval: number = 400;
  private meteorsSpawned: number = 0;
  private totalMeteors: number = 8;
  private duration: number = 5000;
  private stormTimer: number = 0;
  
  private readonly CANVAS_WIDTH: number = 1200;
  private readonly CANVAS_HEIGHT: number = 800;
  private readonly BASE_FALL_SPEED: number = 8;
  private readonly SHOCKWAVE_RADIUS: number = 30;
  private readonly SHOCKWAVE_DURATION: number = 400;
  
  public onExplosion: ((event: ExplosionEvent) => void) | null = null;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.meteorGraphics = new Phaser.GameObjects.Graphics(scene);
    this.shockwaveGraphics = new Phaser.GameObjects.Graphics(scene);
    this.flameGraphics = new Phaser.GameObjects.Graphics(scene);
    
    this.meteorGraphics.setDepth(850);
    this.shockwaveGraphics.setDepth(851);
    this.flameGraphics.setDepth(849);
    
    scene.add.existing(this.meteorGraphics);
    scene.add.existing(this.shockwaveGraphics);
    scene.add.existing(this.flameGraphics);
  }
  
  isActive(): boolean {
    return this.active || this.meteors.some(m => m.active) || this.shockwaves.some(s => s.active);
  }
  
  start(meteorCount: number = 8): void {
    if (this.active) return;
    
    this.active = true;
    this.meteorsSpawned = 0;
    this.totalMeteors = meteorCount;
    this.meteorTimer = 0;
    this.stormTimer = this.duration;
    this.meteorSpawnInterval = this.duration / meteorCount;
  }
  
  private spawnMeteor(): void {
    const diameter = 10 + Math.random() * 10;
    const x = Math.random() * (this.CANVAS_WIDTH - 100) + 50;
    const colors = [0x808080, 0x696969, 0xa0a0a0, 0x909090];
    
    const meteor: Meteor = {
      x,
      y: -diameter * 2,
      vx: (Math.random() - 0.5) * 2,
      vy: this.BASE_FALL_SPEED + Math.random() * 2,
      diameter,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
      active: true,
      flameParticles: []
    };
    
    for (let i = 0; i < 6; i++) {
      meteor.flameParticles.push(this.createFlameParticle(meteor));
    }
    
    this.meteors.push(meteor);
  }
  
  private createFlameParticle(meteor: Meteor): FlameParticle {
    const colors = [0xff4500, 0xff6347, 0xffd700, 0xffa500, 0xff8c00];
    const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    const speed = 2 + Math.random() * 3;
    
    return {
      x: meteor.x + (Math.random() - 0.5) * meteor.diameter * 0.5,
      y: meteor.y - meteor.diameter * 0.5,
      vx: Math.cos(angle) * speed - meteor.vx * 0.3,
      vy: Math.sin(angle) * speed - meteor.vy * 0.5,
      size: 2 + Math.random() * 4,
      alpha: 0.8 + Math.random() * 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 300 + Math.random() * 200,
      maxLife: 500
    };
  }
  
  update(delta: number, roverX: number, roverY: number): void {
    if (this.active) {
      this.stormTimer -= delta;
      this.meteorTimer += delta;
      
      while (this.meteorTimer >= this.meteorSpawnInterval && this.meteorsSpawned < this.totalMeteors) {
        this.spawnMeteor();
        this.meteorsSpawned++;
        this.meteorTimer -= this.meteorSpawnInterval;
      }
      
      if (this.stormTimer <= 0) {
        this.active = false;
      }
    }
    
    for (const meteor of this.meteors) {
      if (!meteor.active) continue;
      
      meteor.x += meteor.vx * (delta / 16);
      meteor.y += meteor.vy * (delta / 16);
      meteor.rotation += meteor.rotationSpeed * (delta / 16);
      
      for (let i = 0; i < meteor.flameParticles.length; i++) {
        const fp = meteor.flameParticles[i];
        fp.x += fp.vx * (delta / 16);
        fp.y += fp.vy * (delta / 16);
        fp.life -= delta;
        fp.alpha = (fp.life / fp.maxLife) * 0.9;
        fp.size *= 0.99;
        
        if (fp.life <= 0) {
          meteor.flameParticles[i] = this.createFlameParticle(meteor);
        }
      }
      
      if (meteor.y >= this.CANVAS_HEIGHT - 20) {
        this.createExplosion(meteor.x, this.CANVAS_HEIGHT - 20, roverX, roverY);
        meteor.active = false;
      }
    }
    
    for (const sw of this.shockwaves) {
      if (!sw.active) continue;
      
      const progress = sw.radius / sw.maxRadius;
      sw.radius = Math.min(sw.maxRadius, sw.radius + (this.SHOCKWAVE_RADIUS * 2.5) * (delta / this.SHOCKWAVE_DURATION));
      sw.alpha = Math.max(0, 1 - progress);
      
      if (sw.radius >= sw.maxRadius) {
        sw.active = false;
      }
    }
    
    this.draw();
    
    this.meteors = this.meteors.filter(m => m.active || m.flameParticles.some(fp => fp.life > 0));
    this.shockwaves = this.shockwaves.filter(s => s.active);
  }
  
  private createExplosion(x: number, y: number, roverX: number, roverY: number): void {
    const shockwave: Shockwave = {
      x,
      y,
      radius: 5,
      maxRadius: this.SHOCKWAVE_RADIUS * 2.5,
      alpha: 1,
      active: true
    };
    this.shockwaves.push(shockwave);
    
    const distToRover = Phaser.Math.Distance.Between(x, y, roverX, roverY);
    if (distToRover <= this.SHOCKWAVE_RADIUS) {
      if (this.onExplosion) {
        this.onExplosion({ x, y, radius: this.SHOCKWAVE_RADIUS });
      }
    }
    
    this.createExplosionParticles(x, y);
  }
  
  private explosionParticlePool: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: number; life: number }[] = [];
  
  private createExplosionParticles(x: number, y: number): void {
    const count = 25;
    const colors = [0xff4500, 0xffd700, 0xff6347, 0xffa500, 0xffffff];
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 2 + Math.random() * 5;
      
      this.explosionParticlePool.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 5,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 500 + Math.random() * 300
      });
    }
  }
  
  private draw(): void {
    const fg = this.flameGraphics;
    fg.clear();
    
    for (const p of this.explosionParticlePool) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= 16;
      p.alpha = Math.max(0, p.life / 800);
      p.size *= 0.97;
      
      if (p.alpha > 0.01) {
        fg.fillStyle(p.color, p.alpha);
        fg.fillCircle(p.x, p.y, p.size);
      }
    }
    this.explosionParticlePool = this.explosionParticlePool.filter(p => p.alpha > 0.01);
    
    for (const meteor of this.meteors) {
      for (const fp of meteor.flameParticles) {
        fg.fillStyle(fp.color, fp.alpha);
        fg.fillCircle(fp.x, fp.y, fp.size);
      }
    }
    
    const mg = this.meteorGraphics;
    mg.clear();
    
    for (const meteor of this.meteors) {
      if (!meteor.active) continue;
      
      mg.save();
      mg.translateCanvas(meteor.x, meteor.y);
      mg.rotate(meteor.rotation);
      
      const r = meteor.diameter / 2;
      const gradColor1 = 0xff4500;
      const gradColor2 = meteor.color;
      
      mg.fillStyle(gradColor1, 0.8);
      mg.fillCircle(-r * 0.2, -r * 0.8, r * 0.4);
      
      mg.fillStyle(gradColor2, 1);
      mg.beginPath();
      mg.arc(0, 0, r, 0, Math.PI * 2);
      mg.closePath();
      mg.fillPath();
      
      mg.fillStyle(0x333333, 0.4);
      mg.beginPath();
      mg.arc(r * 0.3, r * 0.2, r * 0.25, 0, Math.PI * 2);
      mg.closePath();
      mg.fillPath();
      
      mg.fillStyle(0x222222, 0.3);
      mg.beginPath();
      mg.arc(-r * 0.4, -r * 0.1, r * 0.15, 0, Math.PI * 2);
      mg.closePath();
      mg.fillPath();
      
      mg.fillStyle(0xffffff, 0.25);
      mg.beginPath();
      mg.arc(-r * 0.35, -r * 0.35, r * 0.2, 0, Math.PI * 2);
      mg.closePath();
      mg.fillPath();
      
      mg.restore();
    }
    
    const sg = this.shockwaveGraphics;
    sg.clear();
    
    for (const sw of this.shockwaves) {
      if (!sw.active) continue;
      
      for (let i = 0; i < 4; i++) {
        const r = sw.radius * (1 - i * 0.15);
        const a = sw.alpha * (0.6 - i * 0.12);
        if (a > 0) {
          sg.lineStyle(3 - i * 0.5, 0xffd700, a);
          sg.beginPath();
          sg.arc(sw.x, sw.y, r, 0, Math.PI * 2);
          sg.closePath();
          sg.strokePath();
        }
      }
      
      sg.fillStyle(0xff4500, sw.alpha * 0.2);
      sg.fillCircle(sw.x, sw.y, sw.radius * 0.5);
    }
  }
  
  destroy(): void {
    this.meteorGraphics.destroy();
    this.shockwaveGraphics.destroy();
    this.flameGraphics.destroy();
  }
}
