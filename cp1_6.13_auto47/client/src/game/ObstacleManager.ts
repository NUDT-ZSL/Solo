import { Debris, EnergyOrb, Vec2, Particle } from './types';

export class ObstacleManager {
  debris: Debris[] = [];
  orbs: EnergyOrb[] = [];
  private canvasW: number;
  private canvasH: number;
  private debrisTimer: number = 0;
  private orbTimer: number = 0;
  private baseDebrisInterval: number = 1.2;
  private baseOrbInterval: number = 2.5;
  debrisInterval: number = 1.2;
  orbInterval: number = 2.5;
  speedMultiplier: number = 1;

  constructor(canvasW: number, canvasH: number) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
  }

  reset(canvasW: number, canvasH: number) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.debris = [];
    this.orbs = [];
    this.debrisTimer = 0;
    this.orbTimer = 0;
    this.debrisInterval = this.baseDebrisInterval;
    this.orbInterval = this.baseOrbInterval;
    this.speedMultiplier = 1;
  }

  updateSpeedMultiplier(score: number) {
    const level = Math.floor(score / 50);
    this.speedMultiplier = 1 + level * 0.07;
    this.debrisInterval = this.baseDebrisInterval / this.speedMultiplier;
    this.orbInterval = this.baseOrbInterval / this.speedMultiplier;
  }

  getBaseSpeed(score: number): number {
    return 1 + (score / 200) * 0.5;
  }

  private generateDebrisVertices(size: number): Vec2[] {
    const numVerts = 5 + Math.floor(Math.random() * 4);
    const verts: Vec2[] = [];
    for (let i = 0; i < numVerts; i++) {
      const angle = (i / numVerts) * Math.PI * 2;
      const r = (size * 0.4) + Math.random() * (size * 0.3);
      verts.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
      });
    }
    return verts;
  }

  private computeBBox(verts: Vec2[]): { x: number; y: number; w: number; h: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const v of verts) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  spawnDebris(score: number) {
    const size = 16 + Math.random() * 64;
    const vertices = this.generateDebrisVertices(size);
    const bbox = this.computeBBox(vertices);
    const baseSpeed = this.getBaseSpeed(score);
    const speed = (baseSpeed + Math.random() * 1.5) * this.speedMultiplier;
    const colors = ['#4a5568', '#5a6577', '#6b7280', '#718096'];
    const d: Debris = {
      x: this.canvasW + size,
      y: Math.random() * this.canvasH,
      vx: -speed,
      vy: (Math.random() - 0.5) * 0.8,
      size,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: 0.01 + Math.random() * 0.02,
      vertices,
      color: colors[Math.floor(Math.random() * colors.length)],
      bbox,
    };
    this.debris.push(d);
  }

  spawnOrb() {
    const fromTop = Math.random() < 0.5;
    const orb: EnergyOrb = {
      x: fromTop ? Math.random() * this.canvasW : -10,
      y: fromTop ? -10 : Math.random() * this.canvasH,
      vx: 1.5 * this.speedMultiplier,
      vy: fromTop ? 0.5 + Math.random() : 0,
      radius: 10,
      color: '#10b981',
      pulsePhase: Math.random() * Math.PI * 2,
      alive: true,
    };
    this.orbs.push(orb);
  }

  update(dt: number, score: number): Particle[] {
    const explosionParticles: Particle[] = [];

    this.debrisTimer += dt;
    this.orbTimer += dt;

    if (this.debrisTimer >= this.debrisInterval) {
      this.spawnDebris(score);
      this.debrisTimer = 0;
    }

    if (this.orbTimer >= this.orbInterval) {
      this.spawnOrb();
      this.orbTimer = 0;
    }

    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.x += d.vx;
      d.y += d.vy;
      d.rotation += d.rotationSpeed;
      if (d.x < -d.size * 2 || d.x > this.canvasW + d.size * 2 ||
          d.y < -d.size * 2 || d.y > this.canvasH + d.size * 2) {
        this.debris.splice(i, 1);
      }
    }

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.x += o.vx;
      o.y += o.vy;
      o.pulsePhase += dt * 4;
      if (o.x > this.canvasW + 20 || o.y > this.canvasH + 20 || o.x < -20 || o.y < -20) {
        this.orbs.splice(i, 1);
      }
    }

    return explosionParticles;
  }

  createExplosionParticles(x: number, y: number): Particle[] {
    const particles: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.2,
        size: 2 + Math.random() * 3,
        color: '#ff6b35',
        alpha: 1,
      });
    }
    return particles;
  }

  drawDebris(ctx: CanvasRenderingContext2D) {
    for (const d of this.debris) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rotation);
      ctx.beginPath();
      ctx.moveTo(d.vertices[0].x, d.vertices[0].y);
      for (let i = 1; i < d.vertices.length; i++) {
        ctx.lineTo(d.vertices[i].x, d.vertices[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = d.color;
      ctx.fill();
      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }

  drawOrbs(ctx: CanvasRenderingContext2D, time: number) {
    for (const o of this.orbs) {
      if (!o.alive) continue;
      const pulse = 0.7 + 0.3 * Math.sin(o.pulsePhase);
      const r = o.radius * pulse;

      const glow = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, r * 2);
      glow.addColorStop(0, 'rgba(16,185,129,0.4)');
      glow.addColorStop(1, 'rgba(16,185,129,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(o.x, o.y, r * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
      ctx.fillStyle = o.color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(o.x - r * 0.25, o.y - r * 0.25, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fill();
    }
  }

  getDebrisBBoxes(): { bbox: { x: number; y: number; w: number; h: number }; debris: Debris }[] {
    return this.debris.map(d => {
      const halfW = d.bbox.w / 2;
      const halfH = d.bbox.h / 2;
      return {
        bbox: {
          x: d.x - halfW,
          y: d.y - halfH,
          w: d.bbox.w,
          h: d.bbox.h,
        },
        debris: d,
      };
    });
  }
}
