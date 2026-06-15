import type { Particle } from '../../types';

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 200;
  
  addParticle(particle: Omit<Particle, 'life'>): void {
    if (this.particles.length >= this.maxParticles) {
      const reduction = Math.floor(this.maxParticles * 0.2);
      this.particles.splice(0, reduction);
    }
    
    this.particles.push({
      ...particle,
      life: particle.maxLife
    });
  }
  
  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime * 1000;
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      
      if (p.type !== 'shockwave') {
        p.vx *= 0.98;
        p.vy *= 0.98;
      }
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }
  
  getParticles(): Particle[] {
    return this.particles;
  }
  
  clear(): void {
    this.particles = [];
  }
  
  getCount(): number {
    return this.particles.length;
  }
  
  spawnFlameParticles(x: number, y: number, rotation: number, color: string, count: number = 3): void {
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 0.5;
      const angle = rotation + Math.PI + spread;
      const speed = 50 + Math.random() * 30;
      
      this.addParticle({
        x: x - Math.cos(rotation) * 15,
        y: y - Math.sin(rotation) * 15,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 20,
        vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 20,
        maxLife: 300,
        color,
        size: 3 + Math.random() * 2,
        type: 'flame'
      });
    }
  }
  
  spawnDebrisParticles(x: number, y: number, color: string, count: number = 4): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 40 + Math.random() * 20;
      
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        maxLife: 600,
        color,
        size: 4 + Math.random() * 3,
        type: 'debris'
      });
    }
  }
  
  spawnShockwave(x: number, y: number): void {
    this.addParticle({
      x,
      y,
      vx: 0,
      vy: 0,
      maxLife: 400,
      color: '#ffffff',
      size: 60,
      type: 'shockwave'
    });
  }
  
  spawnMeteorTrail(x: number, y: number, rotation: number): void {
    this.addParticle({
      x: x - Math.cos(rotation) * 10,
      y: y - Math.sin(rotation) * 10,
      vx: -Math.cos(rotation) * 20,
      vy: -Math.sin(rotation) * 20,
      maxLife: 200,
      color: '#ffd700',
      size: 2 + Math.random() * 2,
      type: 'meteor_trail'
    });
  }
}
