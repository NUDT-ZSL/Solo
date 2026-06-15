import { Star } from './star';

export interface NoteInput {
  pitch: number;
  velocity: number;
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
  colorR: number;
  colorG: number;
  colorB: number;
}

interface Connection {
  starA: Star;
  starB: Star;
  alpha: number;
  elapsed: number;
  colorR: number;
  colorG: number;
  colorB: number;
}

const CELL_SIZE = 30;
const CONNECTION_DIST = 30;
const FUSION_DIST = 10;
const CONNECTION_DIST_SQ = CONNECTION_DIST * CONNECTION_DIST;
const FUSION_DIST_SQ = FUSION_DIST * FUSION_DIST;
const CONNECTION_DURATION = 0.5;

function lerpColor(velocity: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, velocity));
  const r = Math.round(0 + 255 * t);
  const g = Math.round(212 + (107 - 212) * t);
  const b = Math.round(255 + (53 - 255) * t);
  return [r, g, b];
}

function blendColor(
  a: [number, number, number],
  b: [number, number, number]
): [number, number, number] {
  return [
    Math.round((a[0] + b[0]) / 2),
    Math.round((a[1] + b[1]) / 2),
    Math.round((a[2] + b[2]) / 2),
  ];
}

class SpatialHash {
  private cells: Map<string, Star[]> = new Map();
  private cellSize: number;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  clear(): void {
    this.cells.clear();
  }

  private key(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  insert(star: Star): void {
    const k = this.key(star.x, star.y);
    let bucket = this.cells.get(k);
    if (!bucket) {
      bucket = [];
      this.cells.set(k, bucket);
    }
    bucket.push(star);
  }

  query(star: Star): Star[] {
    const result: Star[] = [];
    const cx = Math.floor(star.x / this.cellSize);
    const cy = Math.floor(star.y / this.cellSize);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const k = `${cx + dx},${cy + dy}`;
        const bucket = this.cells.get(k);
        if (bucket) {
          for (const s of bucket) {
            if (s !== star && s.alive) {
              result.push(s);
            }
          }
        }
      }
    }
    return result;
  }
}

export class Orchestrator {
  stars: Star[] = [];
  particles: Particle[] = [];
  connections: Connection[] = [];
  maxDensity: number = 50;
  decayTime: number = 10;
  canvasWidth: number = 0;
  canvasHeight: number = 0;
  private spatialHash: SpatialHash = new SpatialHash(CELL_SIZE);
  private connectionKeySet: Set<string> = new Set();

  setCanvasSize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  addStar(note: NoteInput): void {
    if (this.stars.length >= this.maxDensity) return;

    const [cr, cg, cb] = lerpColor(note.velocity);
    const speed = 120 + Math.random() * 60;
    const baseAngle = Math.random() * Math.PI * 2;
    const pitchBias = (note.pitch - 4) * 0.25;
    const angle = baseAngle + pitchBias;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const lifetime = Math.max(2, this.decayTime + (Math.random() * 4 - 2));
    const maxTrail = 8 + Math.floor(Math.random() * 5);

    const star = new Star(
      note.x, note.y,
      vx, vy,
      cr, cg, cb,
      lifetime,
      maxTrail
    );

    this.stars.push(star);
  }

  private spawnFusionParticles(x: number, y: number): void {
    const count = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      const radius = 3 + Math.random() * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius,
        alpha: 1.0,
        life: 0,
        maxLife: 2,
        colorR: 255,
        colorG: 220,
        colorB: 120,
      });
    }
  }

  private connKey(a: Star, b: Star): string {
    return a === b ? '' :
      a < b ? `${a.x},${a.y}-${b.x},${b.y}` : `${b.x},${b.y}-${a.x},${a.y}`;
  }

  private checkCollisionsSpatial(): void {
    this.spatialHash.clear();
    for (const star of this.stars) {
      if (star.alive) {
        this.spatialHash.insert(star);
      }
    }

    const checked = new Set<Star>();
    const newConnections: Connection[] = [];
    const toMerge: [Star, Star][] = [];

    for (const star of this.stars) {
      if (!star.alive) continue;
      const neighbors = this.spatialHash.query(star);

      for (const other of neighbors) {
        if (checked.has(other)) continue;
        const dx = star.x - other.x;
        const dy = star.y - other.y;
        const dsq = dx * dx + dy * dy;

        if (dsq < FUSION_DIST_SQ) {
          toMerge.push([star, other]);
        } else if (dsq < CONNECTION_DIST_SQ) {
          const existing = this.connections.find(
            (c) =>
              (c.starA === star && c.starB === other) ||
              (c.starA === other && c.starB === star)
          );
          if (!existing) {
            const [cr, cg, cb] = blendColor(
              [star.colorR, star.colorG, star.colorB],
              [other.colorR, other.colorG, other.colorB]
            );
            newConnections.push({
              starA: star,
              starB: other,
              alpha: 0.6,
              elapsed: 0,
              colorR: cr,
              colorG: cg,
              colorB: cb,
            });
          }
        }
      }
      checked.add(star);
    }

    for (const conn of newConnections) {
      this.connections.push(conn);
    }

    const merged = new Set<Star>();
    for (const [a, b] of toMerge) {
      if (merged.has(a) || merged.has(b)) continue;
      if (!a.alive || !b.alive) continue;

      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const [cr, cg, cb] = blendColor(
        [a.colorR, a.colorG, a.colorB],
        [b.colorR, b.colorG, b.colorB]
      );
      const mvx = ((a.vx + b.vx) / 2) * 0.7;
      const mvy = ((a.vy + b.vy) / 2) * 0.7;
      const remainingLife = Math.max(
        2,
        this.decayTime + (Math.random() * 4 - 2) - Math.min(a.age, b.age)
      );
      const newTrailLen = Math.min(
        18,
        Math.round(Math.max(a.maxTrailLength, b.maxTrailLength) * 1.5)
      );

      const mergedStar = new Star(
        mx, my, mvx, mvy,
        cr, cg, cb,
        remainingLife,
        newTrailLen
      );
      mergedStar.radius = Math.min(12, Math.max(a.radius, b.radius) * 2);
      mergedStar.brightness = Math.max(a.brightness, b.brightness);

      a.alive = false;
      b.alive = false;
      merged.add(a);
      merged.add(b);

      this.spawnFusionParticles(mx, my);
      this.stars.push(mergedStar);
    }

    this.stars = this.stars.filter((s) => s.alive);
  }

  update(dt: number): void {
    for (const star of this.stars) {
      star.update(dt);
    }

    this.checkCollisionsSpatial();

    for (const conn of this.connections) {
      conn.elapsed += dt;
      if (conn.elapsed >= CONNECTION_DURATION) {
        const fadeRate = 0.6 / 0.3;
        conn.alpha -= fadeRate * dt;
      }
    }
    this.connections = this.connections.filter(
      (c) => c.alpha > 0 && c.starA.alive && c.starB.alive
    );

    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
    this.particles = this.particles.filter((p) => p.alpha > 0.01);

    this.stars = this.stars.filter((s) => s.alive);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const conn of this.connections) {
      ctx.beginPath();
      ctx.moveTo(conn.starA.x, conn.starA.y);
      ctx.lineTo(conn.starB.x, conn.starB.y);
      ctx.strokeStyle = `rgba(${conn.colorR},${conn.colorG},${conn.colorB},${(conn.alpha * 0.3).toFixed(3)})`;
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(conn.starA.x, conn.starA.y);
      ctx.lineTo(conn.starB.x, conn.starB.y);
      ctx.strokeStyle = `rgba(${conn.colorR},${conn.colorG},${conn.colorB},${conn.alpha.toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (const star of this.stars) {
      star.draw(ctx);
    }

    for (const p of this.particles) {
      const glowR = p.radius * 3;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
      grad.addColorStop(0, `rgba(${p.colorR},${p.colorG},${p.colorB},${(p.alpha * 0.9).toFixed(3)})`);
      grad.addColorStop(0.5, `rgba(${p.colorR},${p.colorG},${p.colorB},${(p.alpha * 0.3).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${p.colorR},${p.colorG},${p.colorB},0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * p.alpha, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.colorR},${p.colorG},${p.colorB},${p.alpha.toFixed(3)})`;
      ctx.fill();
    }
  }

  reset(): void {
    this.stars = [];
    this.particles = [];
    this.connections = [];
  }
}
