export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface Particle {
  id: number;
  nebulaId: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseColor: RGB;
  color: RGB;
  flashFrames: number;
  trail: TrailPoint[];
  isDragging: boolean;
}

export interface Fragment {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: RGB;
  life: number;
  maxLife: number;
}

export interface Nebula {
  id: number;
  centerX: number;
  centerY: number;
  particles: Particle[];
  isDragging: boolean;
  dragOffsetX: number;
  dragOffsetY: number;
}

const MAX_PARTICLES = 600;
const PARTICLES_PER_NEBULA = 80;
const FRAGMENTS_PER_FUSION = 8;
const COLLISION_FLASH_FRAMES = 3;
const FUSION_DISTANCE_THRESHOLD = 5;
const MAX_DRAG_BOOST = 5;
const TRAIL_LENGTH = 20;

let particleIdCounter = 0;
let nebulaIdCounter = 0;

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

function lerpColor(c1: RGB, c2: RGB, t: number): RGB {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t)
  };
}

function mixColor(c1: RGB, c2: RGB): RGB {
  return {
    r: Math.round((c1.r + c2.r) / 2),
    g: Math.round((c1.g + c2.g) / 2),
    b: Math.round((c1.b + c2.b) / 2)
  };
}

function gaussianRandom(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export class PhysicsEngine {
  public nebulas: Nebula[] = [];
  public fragments: Fragment[] = [];
  public fusionCount = 0;
  public flashAlpha = 0;
  public fullMessageTimer = 0;
  private readonly warmRed = hexToRgb('#ff6b6b');
  private readonly warmYellow = hexToRgb('#ffd93d');
  private readonly flashColor = hexToRgb('#48dbfb');

  get totalParticles(): number {
    let count = 0;
    for (const nebula of this.nebulas) {
      count += nebula.particles.length;
    }
    return count;
  }

  get nebulaCount(): number {
    return this.nebulas.length;
  }

  canCreateNebula(): boolean {
    return this.totalParticles + PARTICLES_PER_NEBULA <= MAX_PARTICLES;
  }

  createNebula(x: number, y: number): Nebula | null {
    if (!this.canCreateNebula()) {
      this.fullMessageTimer = 120;
      return null;
    }

    const nebulaId = nebulaIdCounter++;
    const particles: Particle[] = [];

    for (let i = 0; i < PARTICLES_PER_NEBULA; i++) {
      const color = lerpColor(this.warmRed, this.warmYellow, Math.random());
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.9;
      const gx = gaussianRandom() * 30;
      const gy = gaussianRandom() * 30;

      particles.push({
        id: particleIdCounter++,
        nebulaId,
        x: x + gx,
        y: y + gy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 5,
        baseColor: color,
        color,
        flashFrames: 0,
        trail: [],
        isDragging: false
      });
    }

    const nebula: Nebula = {
      id: nebulaId,
      centerX: x,
      centerY: y,
      particles,
      isDragging: false,
      dragOffsetX: 0,
      dragOffsetY: 0
    };

    this.nebulas.push(nebula);
    return nebula;
  }

  findNebulaAt(x: number, y: number): Nebula | null {
    for (let i = this.nebulas.length - 1; i >= 0; i--) {
      const nebula = this.nebulas[i];
      for (const p of nebula.particles) {
        const dx = x - p.x;
        const dy = y - p.y;
        if (dx * dx + dy * dy <= p.radius * p.radius * 4) {
          nebula.dragOffsetX = p.x - x;
          nebula.dragOffsetY = p.y - y;
          return nebula;
        }
      }
    }
    return null;
  }

  startDrag(nebula: Nebula): void {
    nebula.isDragging = true;
    for (const p of nebula.particles) {
      p.isDragging = true;
    }
  }

  dragTo(nebula: Nebula, x: number, y: number, prevX: number, prevY: number): void {
    const dx = x - prevX;
    const dy = y - prevY;

    nebula.centerX = x + nebula.dragOffsetX;
    nebula.centerY = y + nebula.dragOffsetY;

    for (const p of nebula.particles) {
      p.x += dx;
      p.y += dy;
    }
  }

  endDrag(nebula: Nebula, dx: number, dy: number): void {
    nebula.isDragging = false;

    let dist = Math.sqrt(dx * dx + dy * dy);
    let boostX = dx;
    let boostY = dy;

    if (dist > MAX_DRAG_BOOST && dist > 0) {
      const scale = MAX_DRAG_BOOST / dist;
      boostX *= scale;
      boostY *= scale;
    }

    for (const p of nebula.particles) {
      p.vx += boostX;
      p.vy += boostY;
      p.isDragging = false;
    }
  }

  private createFragments(x: number, y: number): void {
    for (let i = 0; i < FRAGMENTS_PER_FUSION; i++) {
      const angle = (i / FRAGMENTS_PER_FUSION) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 1 + Math.random() * 2;
      this.fragments.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1 + Math.random() * 2,
        color: {
          r: Math.floor(Math.random() * 256),
          g: Math.floor(Math.random() * 256),
          b: Math.floor(Math.random() * 256)
        },
        life: 60,
        maxLife: 60
      });
    }
  }

  private updateFragments(): void {
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i];
      f.x += f.vx;
      f.y += f.vy;
      f.vx *= 0.98;
      f.vy *= 0.98;
      f.life--;
      if (f.life <= 0) {
        this.fragments.splice(i, 1);
      }
    }
  }

  step(width: number, height: number): void {
    for (const nebula of this.nebulas) {
      for (const p of nebula.particles) {
        if (p.flashFrames > 0) {
          p.flashFrames--;
          p.color = this.flashColor;
        } else {
          p.color = p.baseColor;
        }

        p.trail.unshift({ x: p.x, y: p.y, alpha: 1 });
        if (p.trail.length > TRAIL_LENGTH) {
          p.trail.pop();
        }
        for (let i = 0; i < p.trail.length; i++) {
          p.trail[i].alpha = 1 - i / TRAIL_LENGTH;
        }

        if (!p.isDragging) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < p.radius) {
            p.x = p.radius;
            p.vx = Math.abs(p.vx) * 0.8;
          } else if (p.x > width - p.radius) {
            p.x = width - p.radius;
            p.vx = -Math.abs(p.vx) * 0.8;
          }
          if (p.y < p.radius) {
            p.y = p.radius;
            p.vy = Math.abs(p.vy) * 0.8;
          } else if (p.y > height - p.radius) {
            p.y = height - p.radius;
            p.vy = -Math.abs(p.vy) * 0.8;
          }
        }
      }
    }

    this.handleCollisions();

    this.updateFragments();

    if (this.flashAlpha > 0) {
      this.flashAlpha -= 0.005;
      if (this.flashAlpha < 0) this.flashAlpha = 0;
    }

    if (this.fullMessageTimer > 0) {
      this.fullMessageTimer--;
    }

    for (let i = this.nebulas.length - 1; i >= 0; i--) {
      if (this.nebulas[i].particles.length === 0) {
        this.nebulas.splice(i, 1);
      }
    }
  }

  private handleCollisions(): void {
    const allParticles: Particle[] = [];
    for (const nebula of this.nebulas) {
      allParticles.push(...nebula.particles);
    }

    const toRemove: Set<number> = new Set();
    const toAdd: Particle[] = [];

    for (let i = 0; i < allParticles.length; i++) {
      if (toRemove.has(allParticles[i].id)) continue;
      for (let j = i + 1; j < allParticles.length; j++) {
        if (toRemove.has(allParticles[j].id)) continue;

        const p1 = allParticles[i];
        const p2 = allParticles[j];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = p1.radius + p2.radius;

        if (dist < minDist && dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;

          const overlap = (minDist - dist) / 2 + 2 + Math.random() * 2;
          p1.x -= nx * overlap;
          p1.y -= ny * overlap;
          p2.x += nx * overlap;
          p2.y += ny * overlap;

          const tempVx = p1.vx;
          const tempVy = p1.vy;
          p1.vx = p2.vx;
          p1.vy = p2.vy;
          p2.vx = tempVx;
          p2.vy = tempVy;

          p1.flashFrames = COLLISION_FLASH_FRAMES;
          p2.flashFrames = COLLISION_FLASH_FRAMES;

          if (p1.nebulaId !== p2.nebulaId) {
            const newDist = Math.sqrt(
              (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2
            );
            if (newDist < FUSION_DISTANCE_THRESHOLD) {
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2;
              const newRadius = (p1.radius + p2.radius) * 0.8;
              const newColor = mixColor(p1.baseColor, p2.baseColor);
              const newVx = (p1.vx + p2.vx) / 2;
              const newVy = (p1.vy + p2.vy) / 2;

              this.createFragments(midX, midY);
              this.flashAlpha = 0.1;
              this.fusionCount++;

              toRemove.add(p1.id);
              toRemove.add(p2.id);

              toAdd.push({
                id: particleIdCounter++,
                nebulaId: p1.nebulaId,
                x: midX,
                y: midY,
                vx: newVx,
                vy: newVy,
                radius: newRadius,
                baseColor: newColor,
                color: newColor,
                flashFrames: 0,
                trail: [],
                isDragging: false
              });
            }
          }
        }
      }
    }

    for (const nebula of this.nebulas) {
      nebula.particles = nebula.particles.filter(p => !toRemove.has(p.id));
    }

    for (const newP of toAdd) {
      for (const nebula of this.nebulas) {
        if (nebula.id === newP.nebulaId) {
          nebula.particles.push(newP);
          break;
        }
      }
    }
  }
}
