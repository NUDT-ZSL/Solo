export interface PooledParticle {
  active: boolean;
}

export interface Bullet extends PooledParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  trail: TrailPoint[];
  isReflected: boolean;
  reflectedAt: number;
  id: number;
}

export interface Fragment extends PooledParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  spawnedShockwave: boolean;
}

export interface Shockwave extends PooledParticle {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
  hitBullets: Set<number>;
}

export interface ThrusterParticle extends PooledParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface TrailPoint extends PooledParticle {
  x: number;
  y: number;
  alpha: number;
}

class ObjectPool<T extends PooledParticle> {
  private pool: T[];
  private factory: () => T;
  private maxSize: number;

  constructor(factory: () => T, initialSize: number, maxSize: number) {
    this.factory = factory;
    this.maxSize = maxSize;
    this.pool = [];
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  acquire(): T {
    const particle = this.pool.find(p => !p.active) || this.createNew();
    particle.active = true;
    return particle;
  }

  private createNew(): T {
    if (this.pool.length >= this.maxSize) {
      const oldest = this.pool.find(p => p.active);
      if (oldest) {
        oldest.active = false;
        return oldest;
      }
    }
    const newParticle = this.factory();
    this.pool.push(newParticle);
    return newParticle;
  }

  release(particle: T): void {
    particle.active = false;
  }

  getActive(): T[] {
    return this.pool.filter(p => p.active);
  }

  getAll(): T[] {
    return this.pool;
  }

  clear(): void {
    this.pool.forEach(p => p.active = false);
  }
}

const createBullet = (): Bullet => ({
  active: false,
  x: 0, y: 0, vx: 0, vy: 0,
  radius: 4,
  color: '#FFB86C',
  trail: [],
  isReflected: false,
  reflectedAt: 0,
  id: 0
});

const createFragment = (): Fragment => ({
  active: false,
  x: 0, y: 0, vx: 0, vy: 0,
  radius: 4,
  color: '#BD93F9',
  life: 0, maxLife: 0.6,
  spawnedShockwave: false
});

const createShockwave = (): Shockwave => ({
  active: false,
  x: 0, y: 0,
  radius: 0, maxRadius: 40,
  life: 0, maxLife: 0.3,
  color: '#8BE9FD',
  hitBullets: new Set<number>()
});

const createThruster = (): ThrusterParticle => ({
  active: false,
  x: 0, y: 0, vx: 0, vy: 0,
  life: 0, maxLife: 0.5,
  color: '#FFD700',
  size: 3
});

const createTrailPoint = (): TrailPoint => ({
  active: false,
  x: 0, y: 0, alpha: 0
});

export class ParticleSystem {
  private bulletPool: ObjectPool<Bullet>;
  private fragmentPool: ObjectPool<Fragment>;
  private shockwavePool: ObjectPool<Shockwave>;
  private thrusterPool: ObjectPool<ThrusterParticle>;
  private trailPool: ObjectPool<TrailPoint>;
  
  private maxParticles = 2000;
  private maxEnemies = 200;
  private bulletIdCounter = 0;

  constructor() {
    this.bulletPool = new ObjectPool<Bullet>(createBullet, 200, 500);
    this.fragmentPool = new ObjectPool<Fragment>(createFragment, 500, 1000);
    this.shockwavePool = new ObjectPool<Shockwave>(createShockwave, 100, 200);
    this.thrusterPool = new ObjectPool<ThrusterParticle>(createThruster, 300, 500);
    this.trailPool = new ObjectPool<TrailPoint>(createTrailPoint, 2000, 5000);
  }

  get bullets(): Bullet[] { return this.bulletPool.getActive(); }
  get fragments(): Fragment[] { return this.fragmentPool.getActive(); }
  get shockwaves(): Shockwave[] { return this.shockwavePool.getActive(); }
  get thrusters(): ThrusterParticle[] { return this.thrusterPool.getActive(); }

  update(dt: number): void {
    this.updateBullets(dt);
    this.updateFragments(dt);
    this.updateShockwaves(dt);
    this.updateThrusters(dt);
  }

  private updateBullets(dt: number): void {
    const activeBullets = this.bulletPool.getActive();
    for (const bullet of activeBullets) {
      const trailPoint = this.trailPool.acquire();
      trailPoint.x = bullet.x;
      trailPoint.y = bullet.y;
      trailPoint.alpha = 0.7;
      trailPoint.active = true;
      
      bullet.trail.unshift(trailPoint);
      if (bullet.trail.length > 10) {
        const old = bullet.trail.pop();
        if (old) this.trailPool.release(old);
      }
      
      for (let j = 0; j < bullet.trail.length; j++) {
        const tp = bullet.trail[j]!;
        tp.alpha = 0.7 * (1 - j / 10);
      }
      
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      
      if (bullet.x < -50 || bullet.x > window.innerWidth + 50 ||
          bullet.y < -50 || bullet.y > window.innerHeight + 50) {
        this.releaseBullet(bullet);
      }
    }
  }

  private updateFragments(dt: number): void {
    const activeFragments = this.fragmentPool.getActive();
    for (const frag of activeFragments) {
      frag.x += frag.vx * dt;
      frag.y += frag.vy * dt;
      frag.vx *= 0.98;
      frag.vy *= 0.98;
      frag.life -= dt;
      
      if (frag.life <= 0 && !frag.spawnedShockwave) {
        frag.spawnedShockwave = true;
        this.addShockwave({
          x: frag.x, y: frag.y,
          maxRadius: 40,
          maxLife: 0.3,
          color: '#8BE9FD'
        });
      }
      
      if (frag.life <= -0.3) {
        this.fragmentPool.release(frag);
      }
    }
  }

  private updateShockwaves(dt: number): void {
    const activeShockwaves = this.shockwavePool.getActive();
    for (const sw of activeShockwaves) {
      sw.life -= dt;
      sw.radius = sw.maxRadius * (1 - sw.life / sw.maxLife);
      
      if (sw.life <= 0) {
        sw.hitBullets.clear();
        this.shockwavePool.release(sw);
      }
    }
  }

  private updateThrusters(dt: number): void {
    const activeThrusters = this.thrusterPool.getActive();
    for (const p of activeThrusters) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      
      if (p.life <= 0) {
        this.thrusterPool.release(p);
      }
    }
  }

  private releaseBullet(bullet: Bullet): void {
    for (const t of bullet.trail) {
      this.trailPool.release(t);
    }
    bullet.trail.length = 0;
    this.bulletPool.release(bullet);
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderShockwaves(ctx);
    this.renderFragments(ctx);
    this.renderBullets(ctx);
    this.renderThrusters(ctx);
  }

  private renderShockwaves(ctx: CanvasRenderingContext2D): void {
    const active = this.shockwavePool.getActive();
    if (active.length === 0) return;
    
    ctx.lineWidth = 2;
    for (const sw of active) {
      const alpha = sw.life / sw.maxLife;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color + Math.floor(alpha * 200).toString(16).padStart(2, '0');
      ctx.stroke();
    }
  }

  private renderFragments(ctx: CanvasRenderingContext2D): void {
    const active = this.fragmentPool.getActive();
    for (const frag of active) {
      if (frag.life <= 0) continue;
      const alpha = frag.life / frag.maxLife;
      ctx.beginPath();
      ctx.arc(frag.x, frag.y, frag.radius, 0, Math.PI * 2);
      ctx.fillStyle = frag.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();
    }
  }

  private renderBullets(ctx: CanvasRenderingContext2D): void {
    const active = this.bulletPool.getActive();
    
    for (const bullet of active) {
      for (let i = bullet.trail.length - 1; i >= 0; i--) {
        const t = bullet.trail[i]!;
        const size = bullet.radius * (1 - i / bullet.trail.length * 0.5);
        ctx.beginPath();
        ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
        ctx.fillStyle = bullet.color + Math.floor(t.alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }
    }
    
    ctx.shadowBlur = 8;
    for (const bullet of active) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fillStyle = bullet.color;
      ctx.shadowColor = bullet.color;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  private renderThrusters(ctx: CanvasRenderingContext2D): void {
    const active = this.thrusterPool.getActive();
    for (const p of active) {
      if (p.life <= 0) continue;
      const alpha = p.life / p.maxLife;
      const size = p.size * alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();
    }
  }

  addBullet(data: Omit<Bullet, 'active' | 'trail' | 'isReflected' | 'reflectedAt' | 'id'>): void {
    const b = this.bulletPool.acquire();
    b.x = data.x;
    b.y = data.y;
    b.vx = data.vx;
    b.vy = data.vy;
    b.radius = data.radius;
    b.color = data.color;
    if (b.trail.length > 0) {
      for (const t of b.trail) {
        this.trailPool.release(t);
      }
      b.trail.length = 0;
    }
    b.isReflected = false;
    b.reflectedAt = this.bulletIdCounter++;
    b.id = this.bulletIdCounter++;
  }

  addFragments(fragments: Array<Omit<Fragment, 'active' | 'spawnedShockwave'>>): void {
    for (const f of fragments) {
      const frag = this.fragmentPool.acquire();
      frag.x = f.x;
      frag.y = f.y;
      frag.vx = f.vx;
      frag.vy = f.vy;
      frag.radius = f.radius;
      frag.color = f.color;
      frag.life = f.life;
      frag.maxLife = f.maxLife;
      frag.spawnedShockwave = false;
    }
  }

  addShockwave(data: Omit<Shockwave, 'active' | 'radius' | 'life' | 'hitBullets'>): void {
    const sw = this.shockwavePool.acquire();
    sw.x = data.x;
    sw.y = data.y;
    sw.maxRadius = data.maxRadius;
    sw.maxLife = data.maxLife;
    sw.color = data.color;
    sw.radius = 0;
    sw.life = data.maxLife;
    sw.hitBullets.clear();
  }

  addThrusterParticle(data: Omit<ThrusterParticle, 'active'>): void {
    const p = this.thrusterPool.acquire();
    p.x = data.x;
    p.y = data.y;
    p.vx = data.vx;
    p.vy = data.vy;
    p.life = data.life;
    p.maxLife = data.maxLife;
    p.color = data.color;
    p.size = data.size;
  }

  checkBulletShockwaveCollisions(): void {
    const activeShockwaves = this.shockwavePool.getActive();
    const activeBullets = this.bulletPool.getActive();
    
    for (const sw of activeShockwaves) {
      for (const bullet of activeBullets) {
        if (!bullet.active) continue;
        if (sw.hitBullets.has(bullet.id)) continue;
        
        const dx = bullet.x - sw.x;
        const dy = bullet.y - sw.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= sw.radius + bullet.radius + 2 && dist >= sw.radius - 10) {
          sw.hitBullets.add(bullet.id);
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = dx / len;
          const ny = dy / len;
          const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy) * 1.3;
          bullet.vx = nx * speed;
          bullet.vy = ny * speed;
          bullet.isReflected = true;
          bullet.color = '#A78BFA';
          bullet.reflectedAt = this.bulletIdCounter++;
          bullet.id = this.bulletIdCounter++;
        }
      }
    }
  }

  checkBulletEnemyCollision(bullet: Bullet, enemyX: number, enemyY: number, enemyRadius: number): boolean {
    const dx = bullet.x - enemyX;
    const dy = bullet.y - enemyY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist <= enemyRadius + bullet.radius + 2;
  }

  checkBulletCoreCollision(bullet: Bullet, coreX: number, coreY: number, coreRadius: number): boolean {
    const dx = bullet.x - coreX;
    const dy = bullet.y - coreY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist <= coreRadius + bullet.radius + 2;
  }

  checkCircleRectCollision(
    cx: number, cy: number, cr: number,
    rx: number, ry: number, rw: number, rh: number
  ): boolean {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) <= (cr + 2) * (cr + 2);
  }

  removeBullet(bullet: Bullet): void {
    this.releaseBullet(bullet);
  }

  getTotalParticles(): number {
    return this.bullets.length + this.fragments.length + 
           this.shockwaves.length + this.thrusters.length;
  }

  getMaxEnemies(): number {
    return this.maxEnemies;
  }

  getMaxParticles(): number {
    return this.maxParticles;
  }

  clear(): void {
    this.bulletPool.clear();
    this.fragmentPool.clear();
    this.shockwavePool.clear();
    this.thrusterPool.clear();
    this.trailPool.clear();
  }
}
