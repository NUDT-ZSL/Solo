import { ParticleSystem } from './particle-system';

export interface Asteroid {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  hp: number;
  maxHp: number;
  vertices: number[];
  noise: number[];
  isFragment: boolean;
  fragmentLife: number;
  fragmentAge: number;
}

const MAX_ASTEROIDS = 80;
const VERTICES_MIN = 8;
const VERTICES_MAX = 14;

export class AsteroidManager {
  private asteroids: Asteroid[] = [];
  private nextId = 1;
  private spawnTimer = 0;
  private nextSpawnInterval = 5000;
  private canvasWidth = 0;
  private canvasHeight = 0;
  private particles: ParticleSystem;

  constructor(particles: ParticleSystem) {
    this.particles = particles;
    this.resetSpawnTimer();
    for (let i = 0; i < MAX_ASTEROIDS; i++) {
      this.asteroids.push(this.createEmpty());
    }
  }

  setCanvasSize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  private createEmpty(): Asteroid {
    return {
      id: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      radius: 0,
      rotation: 0,
      rotationSpeed: 0,
      hp: 0,
      maxHp: 0,
      vertices: [],
      noise: [],
      isFragment: false,
      fragmentLife: 0,
      fragmentAge: 0,
    };
  }

  private resetSpawnTimer(): void {
    this.nextSpawnInterval = 5000 + Math.random() * 10000;
    this.spawnTimer = 0;
  }

  private alloc(): Asteroid | null {
    for (let i = 0; i < this.asteroids.length; i++) {
      if (this.asteroids[i].id === 0) {
        return this.asteroids[i];
      }
    }
    return null;
  }

  spawnWave(targetX: number, targetY: number): void {
    const count = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      this.spawnSingle(targetX, targetY);
    }
  }

  private spawnSingle(tx: number, ty: number): void {
    const a = this.alloc();
    if (!a) return;

    const edge = Math.floor(Math.random() * 4);
    const margin = 60;
    switch (edge) {
      case 0:
        a.x = Math.random() * this.canvasWidth;
        a.y = -margin;
        break;
      case 1:
        a.x = this.canvasWidth + margin;
        a.y = Math.random() * this.canvasHeight;
        break;
      case 2:
        a.x = Math.random() * this.canvasWidth;
        a.y = this.canvasHeight + margin;
        break;
      default:
        a.x = -margin;
        a.y = Math.random() * this.canvasHeight;
        break;
    }

    a.radius = 10 + Math.random() * 20;
    const dx = tx + (Math.random() - 0.5) * 200 - a.x;
    const dy = ty + (Math.random() - 0.5) * 200 - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const baseSpeed = 40 + Math.random() * 40;
    const vx = (dx / dist) * baseSpeed;
    const vy = (dy / dist) * baseSpeed;
    a.vx = vx + (Math.random() - 0.5) * 10;
    a.vy = vy + (Math.random() - 0.5) * 10;

    a.ax = -vx * 0.0003;
    a.ay = -vy * 0.0003;

    a.rotation = Math.random() * Math.PI * 2;
    a.rotationSpeed = (Math.random() - 0.5) * 1.5;

    a.maxHp = Math.ceil(a.radius / 5);
    a.hp = a.maxHp;

    const n = VERTICES_MIN + Math.floor(Math.random() * (VERTICES_MAX - VERTICES_MIN));
    a.vertices = new Array(n);
    a.noise = new Array(n);
    for (let i = 0; i < n; i++) {
      a.vertices[i] = 0.7 + Math.random() * 0.5;
      a.noise[i] = Math.random();
    }

    a.isFragment = false;
    a.fragmentLife = 0;
    a.fragmentAge = 0;
    a.id = this.nextId++;
  }

  fragment(parent: Asteroid): void {
    const fragments = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < fragments; i++) {
      const a = this.alloc();
      if (!a) continue;
      a.id = this.nextId++;
      a.x = parent.x + (Math.random() - 0.5) * parent.radius * 0.5;
      a.y = parent.y + (Math.random() - 0.5) * parent.radius * 0.5;
      const dir = (Math.PI * 2 * i) / fragments + Math.random() * 0.5;
      const speed = 60 + Math.random() * 80;
      a.vx = Math.cos(dir) * speed + parent.vx * 0.3;
      a.vy = Math.sin(dir) * speed + parent.vy * 0.3;
      a.ax = -a.vx * 0.0005;
      a.ay = -a.vy * 0.0005 + 0.02;
      a.radius = parent.radius * (0.18 + Math.random() * 0.18);
      a.rotation = Math.random() * Math.PI * 2;
      a.rotationSpeed = (Math.random() - 0.5) * 4;
      a.maxHp = 1;
      a.hp = 1;
      const n = 6 + Math.floor(Math.random() * 4);
      a.vertices = new Array(n);
      a.noise = new Array(n);
      for (let k = 0; k < n; k++) {
        a.vertices[k] = 0.6 + Math.random() * 0.6;
        a.noise[k] = Math.random();
      }
      a.isFragment = true;
      a.fragmentLife = 1200 + Math.random() * 800;
      a.fragmentAge = 0;
    }
  }

  damage(a: Asteroid, amount: number): boolean {
    a.hp -= amount;
    if (a.hp <= 0) {
      if (!a.isFragment) {
        this.fragment(a);
      }
      this.particles.emitExplosion(a.x, a.y, '#ff8844');
      if (!a.isFragment) {
        this.particles.emitDebris(a.x, a.y, Math.floor(a.radius / 4));
      }
      a.id = 0;
      return true;
    }
    return false;
  }

  update(dt: number, fleetCenterX: number, fleetCenterY: number): void {
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.nextSpawnInterval) {
      this.spawnTimer = 0;
      this.spawnWave(fleetCenterX, fleetCenterY);
      this.resetSpawnTimer();
    }

    for (let i = 0; i < this.asteroids.length; i++) {
      const a = this.asteroids[i];
      if (a.id === 0) continue;

      a.vx += a.ax * dt;
      a.vy += a.ay * dt;
      a.x += a.vx * (dt / 1000);
      a.y += a.vy * (dt / 1000);
      a.rotation += a.rotationSpeed * (dt / 1000);

      if (a.isFragment) {
        a.fragmentAge += dt;
        if (a.fragmentAge >= a.fragmentLife) {
          a.id = 0;
          continue;
        }
      }

      const margin = 120;
      if (a.x < -margin || a.x > this.canvasWidth + margin ||
          a.y < -margin || a.y > this.canvasHeight + margin) {
        if (!a.isFragment) {
          a.id = 0;
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    for (let i = 0; i < this.asteroids.length; i++) {
      const a = this.asteroids[i];
      if (a.id === 0) continue;
      if (a.x + a.radius < 0 || a.x - a.radius > this.canvasWidth ||
          a.y + a.radius < 0 || a.y - a.radius > this.canvasHeight) {
        continue;
      }

      let alpha = 1;
      if (a.isFragment) {
        const t = a.fragmentAge / a.fragmentLife;
        alpha = 1 - t * t;
        if (alpha <= 0) continue;
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rotation);

      ctx.beginPath();
      const n = a.vertices.length;
      for (let k = 0; k < n; k++) {
        const angle = (Math.PI * 2 * k) / n;
        const r = a.radius * a.vertices[k];
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      const grad = ctx.createRadialGradient(-a.radius * 0.3, -a.radius * 0.3, a.radius * 0.1, 0, 0, a.radius);
      if (a.isFragment) {
        grad.addColorStop(0, '#aa8866');
        grad.addColorStop(0.6, '#664433');
        grad.addColorStop(1, '#332211');
      } else {
        grad.addColorStop(0, '#998877');
        grad.addColorStop(0.5, '#665544');
        grad.addColorStop(1, '#332211');
      }
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      for (let k = 0; k < n; k++) {
        if (a.noise[k] > 0.55) {
          const angle = (Math.PI * 2 * k) / n;
          const r = a.radius * a.vertices[k] * (0.3 + a.noise[k] * 0.3);
          const cx = Math.cos(angle) * r;
          const cy = Math.sin(angle) * r;
          const cr = a.radius * 0.06 * a.noise[k];
          ctx.beginPath();
          ctx.arc(cx, cy, cr, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fill();
        }
      }

      if (!a.isFragment && a.hp < a.maxHp) {
        ctx.rotate(-a.rotation);
        const barW = a.radius * 1.6;
        const barH = 3;
        const bx = -barW / 2;
        const by = -a.radius - 8;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx, by, barW, barH);
        ctx.fillStyle = '#ff6644';
        ctx.fillRect(bx, by, barW * (a.hp / a.maxHp), barH);
      }

      ctx.restore();

      if (a.radius > 20 && !a.isFragment) {
        ctx.save();
        ctx.globalAlpha = 0.12 * (0.7 + 0.3 * Math.sin(time * 0.002 + a.id));
        const halo = ctx.createRadialGradient(a.x, a.y, a.radius * 0.5, a.x, a.y, a.radius * 1.8);
        halo.addColorStop(0, 'rgba(120,100,80,0.4)');
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  forEach(callback: (a: Asteroid) => void): void {
    for (let i = 0; i < this.asteroids.length; i++) {
      if (this.asteroids[i].id !== 0) {
        callback(this.asteroids[i]);
      }
    }
  }

  findNearest(x: number, y: number, maxDist: number): Asteroid | null {
    let best: Asteroid | null = null;
    let bestDist = maxDist * maxDist;
    for (let i = 0; i < this.asteroids.length; i++) {
      const a = this.asteroids[i];
      if (a.id === 0) continue;
      const dx = a.x - x;
      const dy = a.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = a;
      }
    }
    return best;
  }

  checkCollision(x: number, y: number, radius: number): Asteroid | null {
    for (let i = 0; i < this.asteroids.length; i++) {
      const a = this.asteroids[i];
      if (a.id === 0) continue;
      const dx = a.x - x;
      const dy = a.y - y;
      const r = a.radius + radius;
      if (dx * dx + dy * dy < r * r) {
        return a;
      }
    }
    return null;
  }

  getActiveCount(): number {
    let n = 0;
    for (let i = 0; i < this.asteroids.length; i++) {
      if (this.asteroids[i].id !== 0) n++;
    }
    return n;
  }
}
