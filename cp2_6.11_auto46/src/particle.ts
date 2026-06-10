export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  trail: { x: number; y: number; alpha: number }[];
  isReflected: boolean;
  reflectedAt: number;
}

export interface Fragment {
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

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
  hitBullets: Set<number>;
}

export interface ThrusterParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

let bulletIdCounter = 0;

export class ParticleSystem {
  bullets: Bullet[] = [];
  fragments: Fragment[] = [];
  shockwaves: Shockwave[] = [];
  thrusters: ThrusterParticle[] = [];
  private maxParticles = 2000;
  private maxEnemies = 200;
  private bulletIdCounter = 0;

  update(dt: number): void {
    this.updateBullets(dt);
    this.updateFragments(dt);
    this.updateShockwaves(dt);
    this.updateThrusters(dt);
    this.cleanOldParticles();
  }

  private updateBullets(dt: number): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i]!;
      bullet.trail.unshift({ x: bullet.x, y: bullet.y, alpha: 0.7 });
      if (bullet.trail.length > 10) {
        bullet.trail.pop();
      }
      for (let j = 0; j < bullet.trail.length; j++) {
        bullet.trail[j]!.alpha = 0.7 * (1 - j / 10);
      }
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
    }
  }

  private updateFragments(dt: number): void {
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const frag = this.fragments[i]!;
      frag.x += frag.vx * dt;
      frag.y += frag.vy * dt;
      frag.vx *= 0.98;
      frag.vy *= 0.98;
      frag.life -= dt;
      if (frag.life <= 0 && !frag.spawnedShockwave) {
        frag.spawnedShockwave = true;
        this.addShockwave({
          x: frag.x,
          y: frag.y,
          radius: 0,
          maxRadius: 40,
          life: 0.3,
          maxLife: 0.3,
          color: '#8BE9FD',
          hitBullets: new Set<number>()
        });
      }
    }
  }

  private updateShockwaves(dt: number): void {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i]!;
      sw.life -= dt;
      sw.radius = sw.maxRadius * (1 - sw.life / sw.maxLife);
    }
  }

  private updateThrusters(dt: number): void {
    for (let i = this.thrusters.length - 1; i >= 0; i--) {
      const p = this.thrusters[i]!;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderShockwaves(ctx);
    this.renderFragments(ctx);
    this.renderBullets(ctx);
    this.renderThrusters(ctx);
  }

  private renderShockwaves(ctx: CanvasRenderingContext2D): void {
    for (const sw of this.shockwaves) {
      const alpha = sw.life / sw.maxLife;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color + Math.floor(alpha * 200).toString(16).padStart(2, '0');
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private renderFragments(ctx: CanvasRenderingContext2D): void {
    for (const frag of this.fragments) {
      if (frag.life <= 0) continue;
      const alpha = frag.life / frag.maxLife;
      ctx.beginPath();
      ctx.arc(frag.x, frag.y, frag.radius, 0, Math.PI * 2);
      ctx.fillStyle = frag.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();
    }
  }

  private renderBullets(ctx: CanvasRenderingContext2D): void {
    for (const bullet of this.bullets) {
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
    for (const bullet of this.bullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fillStyle = bullet.color;
      ctx.shadowColor = bullet.color;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  private renderThrusters(ctx: CanvasRenderingContext2D): void {
    for (const p of this.thrusters) {
      if (p.life <= 0) continue;
      const alpha = p.life / p.maxLife;
      const size = p.size * alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();
    }
  }

  addBullet(bullet: Omit<Bullet, 'trail' | 'isReflected' | 'reflectedAt'>): void {
    const b: Bullet = {
      ...bullet,
      trail: [],
      isReflected: false,
      reflectedAt: this.bulletIdCounter++
    };
    this.bullets.push(b);
  }

  addFragments(fragments: Omit<Fragment, 'spawnedShockwave'>[]): void {
    for (const f of fragments) {
      this.fragments.push({ ...f, spawnedShockwave: false });
    }
  }

  addShockwave(shockwave: Shockwave): void {
    this.shockwaves.push(shockwave);
  }

  addThrusterParticle(particle: ThrusterParticle): void {
    this.thrusters.push(particle);
  }

  checkBulletShockwaveCollisions(): void {
    for (const sw of this.shockwaves) {
      for (const bullet of this.bullets) {
        if (sw.hitBullets.has(bullet.reflectedAt)) continue;
        const dx = bullet.x - sw.x;
        const dy = bullet.y - sw.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= sw.radius + 2 && dist >= sw.radius - 8) {
          sw.hitBullets.add(bullet.reflectedAt);
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = dx / len;
          const ny = dy / len;
          const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy) * 1.3;
          bullet.vx = nx * speed;
          bullet.vy = ny * speed;
          bullet.isReflected = true;
          bullet.color = '#A78BFA';
          bullet.reflectedAt = this.bulletIdCounter++;
        }
      }
    }
  }

  private cleanOldParticles(): void {
    this.bullets = this.bullets.filter(b => 
      b.x > -50 && b.x < window.innerWidth + 50 && 
      b.y > -50 && b.y < window.innerHeight + 50
    );
    this.fragments = this.fragments.filter(f => f.life > -0.3);
    this.shockwaves = this.shockwaves.filter(s => s.life > 0);
    this.thrusters = this.thrusters.filter(p => p.life > 0);

    const total = this.bullets.length + this.fragments.length + 
                  this.shockwaves.length + this.thrusters.length;
    if (total > this.maxParticles) {
      const excess = total - this.maxParticles;
      for (let i = 0; i < excess; i++) {
        if (this.thrusters.length > 0) {
          this.thrusters.shift();
        } else if (this.fragments.length > 0) {
          this.fragments.shift();
        } else if (this.shockwaves.length > 0) {
          this.shockwaves.shift();
        } else if (this.bullets.length > 0) {
          this.bullets.shift();
        }
      }
    }
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
}
