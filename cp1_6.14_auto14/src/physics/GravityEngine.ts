export interface Vec2 {
  x: number;
  y: number;
}

export interface CelestialBody {
  id: string;
  x: number;
  y: number;
  mass: number;
  radius: number;
  type: 'planet' | 'asteroid';
  color: string;
  gravityRadius: number;
}

export interface Wormhole {
  x: number;
  y: number;
  radius: number;
  rotation: number;
}

export interface ProbeState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fuel: number;
  maxFuel: number;
  launched: boolean;
  alive: boolean;
  trail: TrailPoint[];
  trajectory: Vec2[];
}

export interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

export interface PhysicsState {
  probe: ProbeState;
  bodies: CelestialBody[];
  wormhole: Wormhole;
  time: number;
}

const G_BASE = 600;
const MAX_TRAIL_PARTICLES = 20;
const MAX_TRAJECTORY_POINTS = 200;
const TRAIL_ADD_INTERVAL = 0.05;
const FUEL_CONSUMPTION_RATE = 2;

export default class GravityEngine {
  private probe: ProbeState;
  private bodies: CelestialBody[];
  private wormhole: Wormhole;
  private time: number = 0;
  private trailTimer: number = 0;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.probe = this.createDefaultProbe();
    this.bodies = [];
    this.wormhole = { x: 0, y: 0, radius: 25, rotation: 0 };
  }

  private createDefaultProbe(): ProbeState {
    return {
      x: 100,
      y: 0,
      vx: 0,
      vy: 0,
      fuel: 100,
      maxFuel: 100,
      launched: false,
      alive: true,
      trail: [],
      trajectory: [],
    };
  }

  loadLevel(config: {
    bodies: CelestialBody[];
    wormhole: Wormhole;
    probeStart: Vec2;
    fuel: number;
    width: number;
    height: number;
  }) {
    this.width = config.width;
    this.height = config.height;
    this.bodies = config.bodies;
    this.wormhole = config.wormhole;
    this.probe = {
      x: config.probeStart.x,
      y: config.probeStart.y,
      vx: 0,
      vy: 0,
      fuel: config.fuel,
      maxFuel: config.fuel,
      launched: false,
      alive: true,
      trail: [],
      trajectory: [],
    };
    this.time = 0;
    this.trailTimer = 0;
  }

  launch(vx: number, vy: number) {
    if (!this.probe.launched && this.probe.alive) {
      this.probe.vx = vx;
      this.probe.vy = vy;
      this.probe.launched = true;
    }
  }

  update(dt: number): PhysicsState {
    if (!this.probe.launched || !this.probe.alive) {
      this.wormhole.rotation += dt * (Math.PI * 2 / 0.3);
      this.time += dt;
      return this.getState();
    }

    this.time += dt;
    this.wormhole.rotation += dt * (Math.PI * 2 / 0.3);

    this.probe.fuel -= FUEL_CONSUMPTION_RATE * dt;
    if (this.probe.fuel <= 0) {
      this.probe.fuel = 0;
      this.probe.alive = false;
      return this.getState();
    }

    let ax = 0;
    let ay = 0;

    for (const body of this.bodies) {
      const dx = body.x - this.probe.x;
      const dy = body.y - this.probe.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      if (dist < body.radius + 4) {
        if (body.type === 'asteroid') {
          this.probe.alive = false;
          return this.getState();
        }
        continue;
      }

      const force = (G_BASE * body.mass) / Math.max(distSq, 1000);
      ax += force * (dx / dist);
      ay += force * (dy / dist);
    }

    this.probe.vx += ax * dt;
    this.probe.vy += ay * dt;
    this.probe.x += this.probe.vx * dt;
    this.probe.y += this.probe.vy * dt;

    this.trailTimer += dt;
    if (this.trailTimer >= TRAIL_ADD_INTERVAL) {
      this.trailTimer = 0;
      this.probe.trail.push({ x: this.probe.x, y: this.probe.y, age: 0 });
      if (this.probe.trail.length > MAX_TRAIL_PARTICLES) {
        this.probe.trail.shift();
      }
    }

    for (const t of this.probe.trail) {
      t.age += dt;
    }

    this.probe.trajectory.push({ x: this.probe.x, y: this.probe.y });
    if (this.probe.trajectory.length > MAX_TRAJECTORY_POINTS) {
      this.probe.trajectory.shift();
    }

    const wdx = this.wormhole.x - this.probe.x;
    const wdy = this.wormhole.y - this.probe.y;
    const wDist = Math.sqrt(wdx * wdx + wdy * wdy);
    if (wDist < this.wormhole.radius + 4) {
      return this.getState();
    }

    const margin = 200;
    if (
      this.probe.x < -margin ||
      this.probe.x > this.width + margin ||
      this.probe.y < -margin ||
      this.probe.y > this.height + margin
    ) {
      this.probe.alive = false;
    }

    return this.getState();
  }

  predictTrajectory(vx: number, vy: number, steps: number = 120): Vec2[] {
    const points: Vec2[] = [];
    let px = this.probe.x;
    let py = this.probe.y;
    let pvx = vx;
    let pvy = vy;
    const simDt = 0.016;

    for (let i = 0; i < steps; i++) {
      let ax = 0;
      let ay = 0;
      for (const body of this.bodies) {
        const dx = body.x - px;
        const dy = body.y - py;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        if (dist < body.radius) break;
        const force = (G_BASE * body.mass) / Math.max(distSq, 1000);
        ax += force * (dx / dist);
        ay += force * (dy / dist);
      }
      pvx += ax * simDt;
      pvy += ay * simDt;
      px += pvx * simDt;
      py += pvy * simDt;
      points.push({ x: px, y: py });
    }

    return points;
  }

  getGravityVectors(): { body: CelestialBody; fx: number; fy: number; mag: number }[] {
    if (!this.probe.launched) return [];
    const vectors: { body: CelestialBody; fx: number; fy: number; mag: number }[] = [];
    for (const body of this.bodies) {
      const dx = body.x - this.probe.x;
      const dy = body.y - this.probe.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);
      const force = (G_BASE * body.mass) / Math.max(distSq, 1000);
      const fx = force * (dx / dist);
      const fy = force * (dy / dist);
      vectors.push({ body, fx, fy, mag: Math.sqrt(fx * fx + fy * fy) });
    }
    return vectors;
  }

  getState(): PhysicsState {
    return {
      probe: { ...this.probe, trail: [...this.probe.trail], trajectory: [...this.probe.trajectory] },
      bodies: [...this.bodies],
      wormhole: { ...this.wormhole },
      time: this.time,
    };
  }

  reset(config: {
    bodies: CelestialBody[];
    wormhole: Wormhole;
    probeStart: Vec2;
    fuel: number;
  }) {
    this.bodies = config.bodies;
    this.wormhole = config.wormhole;
    this.probe = {
      x: config.probeStart.x,
      y: config.probeStart.y,
      vx: 0,
      vy: 0,
      fuel: config.fuel,
      maxFuel: config.fuel,
      launched: false,
      alive: true,
      trail: [],
      trajectory: [],
    };
    this.time = 0;
    this.trailTimer = 0;
  }
}
