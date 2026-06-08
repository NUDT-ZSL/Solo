export interface Genome {
  springLength: number;
  particleDistance: number;
  moveSpeed: number;
  sensitivity: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  oldX: number;
  oldY: number;
}

interface Spring {
  a: number;
  b: number;
  restLength: number;
  stiffness: number;
}

export class Blob {
  public particles: Particle[] = [];
  public springs: Spring[] = [];
  public genome: Genome;
  public fitness: number = 0;
  public foodEaten: number = 0;
  public collisionCount: number = 0;
  public survivalTime: number = 0;
  public alive: boolean = true;
  public mass: number = 100;
  public baseMass: number = 100;
  public id: number;
  public centerX: number = 0;
  public centerY: number = 0;
  public targetX: number = 0;
  public targetY: number = 0;
  public hue: number;

  private static nextId: number = 0;
  private readonly particleCount: number;
  private readonly gravity: number = 0.15;
  private readonly damping: number = 0.985;
  private readonly repulsionStrength: number = 80;
  private readonly attractionStrength: number = 0.5;
  private readonly springStiffness: number = 0.4;

  constructor(
    x: number,
    y: number,
    genome: Genome,
    particleCount: number = 150
  ) {
    this.id = Blob.nextId++;
    this.genome = { ...genome };
    this.particleCount = particleCount;
    this.hue = 170 + Math.random() * 20;
    this.createParticles(x, y);
    this.createSprings();
  }

  private createParticles(centerX: number, centerY: number): void {
    const baseRadius = 3;
    const ringSpacing = baseRadius * 2.5 * this.genome.particleDistance;
    
    const particlesInRing = Math.floor(this.particleCount * 0.6);
    const innerCount = this.particleCount - particlesInRing;
    
    for (let i = 0; i < particlesInRing; i++) {
      const angle = (i / particlesInRing) * Math.PI * 2;
      const radius = ringSpacing * 2 + Math.random() * 2;
      const px = centerX + Math.cos(angle) * radius;
      const py = centerY + Math.sin(angle) * radius;
      this.particles.push({
        x: px,
        y: py,
        oldX: px,
        oldY: py,
        vx: 0,
        vy: 0,
        radius: baseRadius
      });
    }

    for (let i = 0; i < innerCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * ringSpacing * 1.5;
      const px = centerX + Math.cos(angle) * radius;
      const py = centerY + Math.sin(angle) * radius;
      this.particles.push({
        x: px,
        y: py,
        oldX: px,
        oldY: py,
        vx: 0,
        vy: 0,
        radius: baseRadius
      });
    }
  }

  private createSprings(): void {
    const outerCount = Math.floor(this.particleCount * 0.6);
    
    for (let i = 0; i < outerCount; i++) {
      const next = (i + 1) % outerCount;
      this.springs.push({
        a: i,
        b: next,
        restLength: this.genome.springLength * 8,
        stiffness: this.springStiffness
      });
    }

    const innerStart = outerCount;
    for (let i = 0; i < outerCount; i++) {
      const nearestInner = innerStart + Math.floor((i / outerCount) * (this.particleCount - outerCount));
      if (nearestInner < this.particles.length) {
        this.springs.push({
          a: i,
          b: nearestInner,
          restLength: this.genome.springLength * 6,
          stiffness: this.springStiffness * 0.7
        });
      }
    }

    for (let i = innerStart; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.genome.springLength * 10) {
          this.springs.push({
            a: i,
            b: j,
            restLength: dist,
            stiffness: this.springStiffness * 0.5
          });
        }
      }
    }
  }

  public update(dt: number, bounds: { w: number; h: number }): void {
    if (!this.alive) return;

    this.survivalTime += dt;
    this.updateCenter();
    this.aiMove(dt);

    for (let iter = 0; iter < 3; iter++) {
      this.applyForces(bounds);
      this.satisfyConstraints();
    }

    this.checkBounds(bounds);
  }

  private updateCenter(): void {
    if (this.particles.length === 0) return;
    let sx = 0, sy = 0;
    for (const p of this.particles) {
      sx += p.x || 0;
      sy += p.y || 0;
    }
    this.centerX = sx / this.particles.length;
    this.centerY = sy / this.particles.length;
    if (isNaN(this.centerX)) this.centerX = 0;
    if (isNaN(this.centerY)) this.centerY = 0;
  }

  private aiMove(dt: number): void {
    const speed = this.genome.moveSpeed * 0.3;
    const dx = this.targetX - this.centerX;
    const dy = this.targetY - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 5) {
      const forceX = (dx / dist) * speed * this.genome.sensitivity;
      const forceY = (dy / dist) * speed * this.genome.sensitivity;
      
      for (let i = 0; i < this.particles.length; i++) {
        const factor = i < Math.floor(this.particleCount * 0.6) ? 1 : 0.5;
        this.particles[i].vx += forceX * factor * dt * 0.1;
        this.particles[i].vy += forceY * factor * dt * 0.1;
      }
    }
  }

  private clampVelocity(v: number): number {
    const maxV = 20;
    if (!isFinite(v)) return 0;
    return Math.max(-maxV, Math.min(maxV, v));
  }

  private clampPosition(v: number, max: number): number {
    if (!isFinite(v)) return max / 2;
    return Math.max(0, Math.min(max, v));
  }

  private applyForces(bounds: { w: number; h: number }): void {
    for (const p of this.particles) {
      p.vx = this.clampVelocity(p.vx);
      p.vy = this.clampVelocity(p.vy);
      p.vy += this.gravity;
      p.vx *= this.damping;
      p.vy *= this.damping;
      p.oldX = p.x;
      p.oldY = p.y;
      p.x += p.vx;
      p.y += p.vy;
      p.x = this.clampPosition(p.x, bounds.w);
      p.y = this.clampPosition(p.y, bounds.h);
    }

    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distSq = dx * dx + dy * dy;
        const minDist = (p1.radius + p2.radius) * 1.5;
        
        if (distSq < minDist * minDist && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const force = (this.repulsionStrength * (minDist - dist)) / minDist;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          p1.vx = this.clampVelocity(p1.vx - fx * 0.01);
          p1.vy = this.clampVelocity(p1.vy - fy * 0.01);
          p2.vx = this.clampVelocity(p2.vx + fx * 0.01);
          p2.vy = this.clampVelocity(p2.vy + fy * 0.01);
        } else if (distSq < 400 && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const force = this.attractionStrength / distSq;
          const fx = dx * force;
          const fy = dy * force;
          
          p1.vx = this.clampVelocity(p1.vx + fx);
          p1.vy = this.clampVelocity(p1.vy + fy);
          p2.vx = this.clampVelocity(p2.vx - fx);
          p2.vy = this.clampVelocity(p2.vy - fy);
        }
      }
    }
  }

  private satisfyConstraints(): void {
    for (const spring of this.springs) {
      const p1 = this.particles[spring.a];
      const p2 = this.particles[spring.b];
      if (!p1 || !p2) continue;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 0.01) continue;

      const diff = (dist - spring.restLength) / dist;
      const offset = diff * spring.stiffness * 0.5;
      
      const ox = dx * offset;
      const oy = dy * offset;
      
      p1.x += ox;
      p1.y += oy;
      p2.x -= ox;
      p2.y -= oy;
      
      p1.vx += (p1.x - p1.oldX) * 0.5;
      p1.vy += (p1.y - p1.oldY) * 0.5;
      p2.vx += (p2.x - p2.oldX) * 0.5;
      p2.vy += (p2.y - p2.oldY) * 0.5;
    }
  }

  private checkBounds(bounds: { w: number; h: number }): void {
    for (const p of this.particles) {
      const bounce = 0.4;
      if (p.x - p.radius < 0) {
        p.x = p.radius;
        p.vx = -p.vx * bounce;
      }
      if (p.x + p.radius > bounds.w) {
        p.x = bounds.w - p.radius;
        p.vx = -p.vx * bounce;
      }
      if (p.y - p.radius < 0) {
        p.y = p.radius;
        p.vy = -p.vy * bounce;
      }
      if (p.y + p.radius > bounds.h) {
        p.y = bounds.h - p.radius;
        p.vy = -p.vy * bounce;
      }
    }
  }

  public setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  public eatFood(): void {
    this.foodEaten++;
    this.mass *= 1.01;
    const scale = Math.pow(1.01, 1 / 3);
    for (const p of this.particles) {
      p.radius += 0.1;
    }
    for (const s of this.springs) {
      s.restLength *= scale;
    }
  }

  public takeDamage(): void {
    this.collisionCount++;
    this.mass *= 0.9;
    for (const p of this.particles) {
      p.radius = Math.max(1.5, p.radius - 0.05);
    }
    if (this.mass < this.baseMass * 0.3) {
      this.alive = false;
    }
  }

  public calculateFitness(): number {
    const foodScore = this.foodEaten * 100;
    const survivalScore = this.survivalTime * 2;
    const collisionPenalty = this.collisionCount * 50;
    const massBonus = (this.mass / this.baseMass) * 50;
    
    this.fitness = Math.max(0, foodScore + survivalScore + massBonus - collisionPenalty);
    return this.fitness;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;
    if (this.particles.length === 0) return;

    this.updateCenter();

    const outerCount = Math.floor(this.particleCount * 0.6);
    const outerParticles = this.particles.slice(0, Math.min(outerCount, this.particles.length));

    if (outerParticles.length < 3) return;

    ctx.save();

    ctx.beginPath();
    for (let i = 0; i < outerParticles.length; i++) {
      const p = outerParticles[i];
      const pNext = outerParticles[(i + 1) % outerParticles.length];
      const midX = (p.x + pNext.x) / 2;
      const midY = (p.y + pNext.y) / 2;
      
      if (i === 0) {
        ctx.moveTo(midX, midY);
      } else {
        ctx.quadraticCurveTo(p.x, p.y, midX, midY);
      }
    }
    ctx.closePath();

    const px0 = isFinite(this.particles[0].x) ? this.particles[0].x : 100;
    const py0 = isFinite(this.particles[0].y) ? this.particles[0].y : 100;
    const cx = isFinite(this.centerX) ? this.centerX : px0;
    const cy = isFinite(this.centerY) ? this.centerY : py0;
    const gradient = ctx.createRadialGradient(
      cx, cy, 5,
      cx, cy, 60
    );
    
    const avgSpeed = this.getAverageSpeed();
    const t = Math.min(1, Math.max(0, avgSpeed / 5));
    const hue = 170 - t * 50;
    const saturation = 80;
    const lightness = 55 + t * 10;
    
    gradient.addColorStop(0, `hsla(${hue + 20}, ${saturation}%, ${lightness + 10}%, 0.7)`);
    gradient.addColorStop(0.5, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.5)`);
    gradient.addColorStop(1, `hsla(${hue - 10}, ${saturation}%, ${lightness - 15}%, 0.3)`);

    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness + 20}%, 0.4)`;
    ctx.lineWidth = 2;
    ctx.stroke();

    for (const p of this.particles) {
      const speed = Math.sqrt(Math.max(0, p.vx * p.vx + p.vy * p.vy));
      const tp = Math.min(1, Math.max(0, speed / 5));
      const pHue = 170 - tp * 50;
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.radius * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${pHue}, 90%, 70%, 0.6)`;
      ctx.fill();
    }

    ctx.restore();
  }

  private getAverageSpeed(): number {
    if (this.particles.length === 0) return 0;
    let total = 0;
    for (const p of this.particles) {
      const vx = isFinite(p.vx) ? p.vx : 0;
      const vy = isFinite(p.vy) ? p.vy : 0;
      total += Math.sqrt(Math.max(0, vx * vx + vy * vy));
    }
    const avg = total / this.particles.length;
    return isFinite(avg) ? avg : 0;
  }

  public containsPoint(x: number, y: number): boolean {
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    return Math.sqrt(dx * dx + dy * dy) < 50;
  }

  public getBoundingRadius(): number {
    if (this.particles.length === 0) return 20;
    let maxDist = 0;
    for (const p of this.particles) {
      const dx = (p.x || 0) - (this.centerX || 0);
      const dy = (p.y || 0) - (this.centerY || 0);
      const dist = Math.sqrt(Math.max(0, dx * dx + dy * dy));
      if (dist > maxDist) maxDist = dist;
    }
    return Math.max(10, maxDist);
  }
}
