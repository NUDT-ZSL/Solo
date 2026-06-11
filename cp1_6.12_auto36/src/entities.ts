export interface Vec2 {
  x: number;
  y: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export class CelestialBody {
  name: string;
  mass: number;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  color: string;
  isStar: boolean;
  trail: TrailPoint[];
  maxTrailLen: number;
  collisionRadius: number;
  isAsteroid: boolean;
  isStableOrbit: boolean;
  highlighted: boolean;
  orbitAngleSum: number;
  lastAngle: number;
  orbitPeriod: number;
  orbitStartTime: number;
  completedOrbits: number;

  constructor(
    name: string,
    mass: number,
    pos: Vec2,
    vel: Vec2,
    radius: number,
    color: string,
    isStar: boolean = false,
    isAsteroid: boolean = false
  ) {
    this.name = name;
    this.mass = mass;
    this.pos = { ...pos };
    this.vel = { ...vel };
    this.radius = radius;
    this.color = color;
    this.isStar = isStar;
    this.trail = [];
    this.maxTrailLen = 200;
    this.collisionRadius = radius * 1.5;
    this.isAsteroid = isAsteroid;
    this.isStableOrbit = false;
    this.highlighted = false;
    this.orbitAngleSum = 0;
    this.lastAngle = Math.atan2(pos.y, pos.x);
    this.orbitPeriod = 0;
    this.orbitStartTime = 0;
    this.completedOrbits = 0;
  }

  addTrailPoint(): void {
    this.trail.push({
      x: this.pos.x,
      y: this.pos.y,
      alpha: 1.0,
    });
    if (this.trail.length > this.maxTrailLen) {
      this.trail.shift();
    }
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = (i + 1) / this.trail.length;
    }
  }

  clearTrail(): void {
    this.trail = [];
  }

  speed(): number {
    return Math.sqrt(this.vel.x * this.vel.x + this.vel.y * this.vel.y);
  }

  distanceTo(other: CelestialBody): number {
    const dx = this.pos.x - other.pos.x;
    const dy = this.pos.y - other.pos.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  orbitalRadius(star: CelestialBody): number {
    return this.distanceTo(star);
  }
}

export class Particle {
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  color: string;
  radius: number;

  constructor(pos: Vec2, vel: Vec2, life: number, color: string, radius: number = 2) {
    this.pos = { ...pos };
    this.vel = { ...vel };
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.radius = radius;
  }

  update(dt: number): void {
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.life -= dt;
  }

  isAlive(): boolean {
    return this.life > 0;
  }

  alpha(): number {
    return Math.max(0, this.life / this.maxLife);
  }
}

export class SimulationState {
  bodies: CelestialBody[];
  particles: Particle[];
  G: number;
  timeScale: number;
  trailEnabled: boolean;
  trailLength: number;
  selectedBody: CelestialBody | null;
  cameraTarget: CelestialBody | null;
  cameraPos: Vec2;
  cameraTransitionStart: number;
  cameraTransitionDuration: number;
  cameraFrom: Vec2;

  constructor() {
    this.bodies = [];
    this.particles = [];
    this.G = 1.0;
    this.timeScale = 1;
    this.trailEnabled = true;
    this.trailLength = 200;
    this.selectedBody = null;
    this.cameraTarget = null;
    this.cameraPos = { x: 0, y: 0 };
    this.cameraTransitionStart = 0;
    this.cameraTransitionDuration = 500;
    this.cameraFrom = { x: 0, y: 0 };
  }

  addBody(body: CelestialBody): void {
    this.bodies.push(body);
  }

  removeAsteroids(): void {
    this.bodies = this.bodies.filter((b) => !b.isAsteroid);
  }

  spawnCollisionParticles(pos: Vec2, color: string, count: number = 30): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 120;
      const vel: Vec2 = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      };
      const life = 0.5 + Math.random() * 0.5;
      this.particles.push(new Particle(pos, vel, life, color, 1.5 + Math.random() * 2));
    }
  }

  updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.update(dt);
    }
    this.particles = this.particles.filter((p) => p.isAlive());
  }
}
