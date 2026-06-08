export interface EngineParams {
  flowSpeed: number;
  density: number;
  glowIntensity: number;
}

export interface FlareInfo {
  id: number;
  position: [number, number, number];
  normal: [number, number, number];
  temperature: number;
  velocity: number;
  energy: string;
  intensity: number;
  age: number;
  maxAge: number;
}

export interface CMEEventData {
  flareId: number;
  position: [number, number, number];
  temperature: number;
  velocity: number;
  energy: string;
}

interface CMEParticle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; maxLife: number; size: number;
}

type Listener = (...args: any[]) => void;

export const SUN_RADIUS = 5;
const MAX_FLARES = 5;
const MAX_CME_PARTICLES = 3000;
const CME_PARTICLES_PER_FLARE = 300;

export class SunEngine {
  params: EngineParams;
  time: number;
  flares: FlareInfo[];
  private cmePool: CMEParticle[];
  private activeCMECount: number;
  private nextId: number;
  private listeners: Map<string, Listener[]>;
  private flareSpawnTimer: number;

  cmePositions: Float32Array;
  cmeSizes: Float32Array;
  cmeOpacities: Float32Array;

  constructor() {
    this.params = {
      flowSpeed: 1.0,
      density: 1.0,
      glowIntensity: 1.0,
    };
    this.time = 0;
    this.flares = [];
    this.cmePool = new Array(MAX_CME_PARTICLES);
    this.activeCMECount = 0;
    this.nextId = 1;
    this.listeners = new Map();
    this.flareSpawnTimer = 0;

    this.cmePositions = new Float32Array(MAX_CME_PARTICLES * 3);
    this.cmeSizes = new Float32Array(MAX_CME_PARTICLES);
    this.cmeOpacities = new Float32Array(MAX_CME_PARTICLES);
  }

  on(event: string, fn: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(fn);
  }

  off(event: string, fn: Listener) {
    const arr = this.listeners.get(event);
    if (arr) {
      const idx = arr.indexOf(fn);
      if (idx >= 0) arr.splice(idx, 1);
    }
  }

  emit(event: string, ...args: any[]) {
    const arr = this.listeners.get(event);
    if (arr) arr.forEach(fn => fn(...args));
  }

  update(dt: number) {
    const clampedDt = Math.min(dt, 0.05);
    this.time += clampedDt;
    this.updateFlareSpawning(clampedDt);
    this.updateFlareAging(clampedDt);
    this.updateCMEPhysics(clampedDt);
    this.syncCMEBuffers();
  }

  private updateFlareSpawning(dt: number) {
    this.flareSpawnTimer += dt;
    const interval = 3.5 / Math.max(0.1, this.params.density);
    if (this.flareSpawnTimer >= interval && this.flares.length < MAX_FLARES) {
      this.flareSpawnTimer = 0;
      this.spawnFlare();
    }
  }

  private spawnFlare() {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = SUN_RADIUS;
    const nx = Math.sin(phi) * Math.cos(theta);
    const ny = Math.sin(phi) * Math.sin(theta);
    const nz = Math.cos(phi);
    const x = r * nx;
    const y = r * ny;
    const z = r * nz;

    const roll = Math.random();
    const energy = roll < 0.55 ? 'C' : roll < 0.85 ? 'M' : 'X';
    const tempBase = energy === 'C' ? 5 : energy === 'M' ? 15 : 30;
    const temp = tempBase + Math.random() * tempBase;
    const velBase = energy === 'C' ? 200 : energy === 'M' ? 800 : 1500;
    const vel = velBase + Math.random() * velBase;

    const flare: FlareInfo = {
      id: this.nextId++,
      position: [x, y, z],
      normal: [nx, ny, nz],
      temperature: Math.round(temp * 100) / 100,
      velocity: Math.round(vel),
      energy,
      intensity: 0,
      age: 0,
      maxAge: 5 + Math.random() * 8,
    };

    this.flares.push(flare);
    this.emit('flareSpawned', flare);
  }

  private updateFlareAging(dt: number) {
    for (let i = this.flares.length - 1; i >= 0; i--) {
      const f = this.flares[i];
      f.age += dt;
      const t = f.age / f.maxAge;
      f.intensity = t < 0.15
        ? t / 0.15
        : t > 0.8
          ? (1.0 - t) / 0.2
          : 1.0;
      f.intensity = Math.max(0, Math.min(1, f.intensity));

      if (f.age >= f.maxAge) {
        const removed = this.flares.splice(i, 1)[0];
        this.emit('flareExpired', removed.id);
      }
    }
  }

  triggerCME(flareId: number): CMEEventData | null {
    const flare = this.flares.find(f => f.id === flareId);
    if (!flare) return null;

    const [ox, oy, oz] = flare.position;
    const [nx, ny, nz] = flare.normal;
    const count = Math.min(CME_PARTICLES_PER_FLARE, MAX_CME_PARTICLES - this.activeCMECount);

    for (let i = 0; i < count; i++) {
      const spread = 0.4 + Math.random() * 0.6;
      const speed = (2.5 + Math.random() * 4.5) * this.params.flowSpeed;
      const dx = (Math.random() - 0.5) * spread;
      const dy = (Math.random() - 0.5) * spread;
      const dz = (Math.random() - 0.5) * spread;

      const p: CMEParticle = {
        x: ox + nx * 0.15,
        y: oy + ny * 0.15,
        z: oz + nz * 0.15,
        vx: (nx + dx) * speed,
        vy: (ny + dy) * speed,
        vz: (nz + dz) * speed,
        life: 0,
        maxLife: 1.5 + Math.random() * 2.5,
        size: 0.04 + Math.random() * 0.12,
      };

      if (this.activeCMECount < MAX_CME_PARTICLES) {
        this.cmePool[this.activeCMECount] = p;
        this.activeCMECount++;
      }
    }

    const data: CMEEventData = {
      flareId: flare.id,
      position: [...flare.position],
      temperature: flare.temperature,
      velocity: flare.velocity,
      energy: flare.energy,
    };

    this.emit('cmeTriggered', data);
    return data;
  }

  private updateCMEPhysics(dt: number) {
    let write = 0;
    for (let i = 0; i < this.activeCMECount; i++) {
      const p = this.cmePool[i];
      p.life += dt;
      if (p.life >= p.maxLife) continue;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vx *= 0.994;
      p.vy *= 0.994;
      p.vz *= 0.994;

      this.cmePool[write] = p;
      write++;
    }
    this.activeCMECount = write;
  }

  private syncCMEBuffers() {
    for (let i = 0; i < this.activeCMECount; i++) {
      const p = this.cmePool[i];
      const i3 = i * 3;
      this.cmePositions[i3] = p.x;
      this.cmePositions[i3 + 1] = p.y;
      this.cmePositions[i3 + 2] = p.z;

      const t = p.life / p.maxLife;
      this.cmeSizes[i] = p.size * (1.0 - t * 0.7);
      this.cmeOpacities[i] = 1.0 - t;
    }
  }

  get activeCMEParticleCount(): number {
    return this.activeCMECount;
  }

  setParam(key: keyof EngineParams, value: number) {
    (this.params as any)[key] = value;
    this.emit('paramsChanged', { key, value });
  }
}
