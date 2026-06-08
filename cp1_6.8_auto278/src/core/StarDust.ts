import * as THREE from 'three';

const VERTEX_SHADER = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize;
  }
`;

const FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float glow = smoothstep(0.5, 0.0, dist);
    glow = pow(glow, 1.5);
    gl_FragColor = vec4(vColor, glow * vAlpha);
  }
`;

const MAX_PARTICLES = 400;
const MERGE_DISTANCE = 12;
const PLANET_MASS_THRESHOLD = 8;
const ATTRACTION_RANGE = 200;
const MOUSE_ATTRACTION_RANGE = 180;
const DAMPING = 0.98;
const MAX_SPEED = 3;

export interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  r: number;
  g: number;
  b: number;
  size: number;
  alpha: number;
  alive: boolean;
}

export interface PlanetCreationData {
  x: number;
  y: number;
  mass: number;
  r: number;
  g: number;
  b: number;
}

export class StarDust {
  private particles: DustParticle[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  private posArray: Float32Array;
  private colorArray: Float32Array;
  private sizeArray: Float32Array;
  private alphaArray: Float32Array;
  private spawnAccumulator = 0;
  private spawnRadius = 300;
  private maxSpawnRadius = 800;
  private _spawnRate = 8;
  private _gravityStrength = 1;
  public onPlanetCreation: ((data: PlanetCreationData) => void) | null = null;

  constructor(private scene: THREE.Scene) {
    this.posArray = new Float32Array(MAX_PARTICLES * 3);
    this.colorArray = new Float32Array(MAX_PARTICLES * 3);
    this.sizeArray = new Float32Array(MAX_PARTICLES);
    this.alphaArray = new Float32Array(MAX_PARTICLES);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.posArray, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colorArray, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizeArray, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphaArray, 1));
    this.geometry.setDrawRange(0, 0);

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  get spawnRate() { return this._spawnRate; }
  set spawnRate(v: number) { this._spawnRate = v; }
  get gravityStrength() { return this._gravityStrength; }
  set gravityStrength(v: number) { this._gravityStrength = v; }

  private spawnParticle() {
    if (this.particles.length >= MAX_PARTICLES) return;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * this.spawnRadius;
    const t = Math.random();
    const r = 0.85 + t * 0.15;
    const g = 0.82 + t * 0.18;
    const b = 0.95 + t * 0.05;
    this.particles.push({
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      mass: 0.8 + Math.random() * 0.4,
      r, g, b,
      size: 2 + Math.random() * 2,
      alpha: 0,
      alive: true,
    });
  }

  update(dt: number, mouseX: number, mouseY: number, isMouseDown: boolean) {
    this.spawnAccumulator += this._spawnRate * dt;
    while (this.spawnAccumulator >= 1) {
      this.spawnParticle();
      this.spawnAccumulator -= 1;
    }
    if (this.spawnRadius < this.maxSpawnRadius) {
      this.spawnRadius += dt * 8;
    }

    const n = this.particles.length;
    const G = this._gravityStrength * 0.15;

    for (let i = 0; i < n; i++) {
      const pi = this.particles[i];
      if (!pi.alive) continue;
      pi.alpha = Math.min(1, pi.alpha + dt * 2);

      for (let j = i + 1; j < n; j++) {
        const pj = this.particles[j];
        if (!pj.alive) continue;
        const dx = pj.x - pi.x;
        const dy = pj.y - pi.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > ATTRACTION_RANGE * ATTRACTION_RANGE) continue;
        const dist = Math.sqrt(Math.max(distSq, 1));
        if (dist < MERGE_DISTANCE) {
          const totalMass = pi.mass + pj.mass;
          pi.x = (pi.x * pi.mass + pj.x * pj.mass) / totalMass;
          pi.y = (pi.y * pi.mass + pj.y * pj.mass) / totalMass;
          pi.vx = (pi.vx * pi.mass + pj.vx * pj.mass) / totalMass;
          pi.vy = (pi.vy * pi.mass + pj.vy * pj.mass) / totalMass;
          pi.r = (pi.r * pi.mass + pj.r * pj.mass) / totalMass;
          pi.g = (pi.g * pi.mass + pj.g * pj.mass) / totalMass;
          pi.b = (pi.b * pi.mass + pj.b * pj.mass) / totalMass;
          pi.mass = totalMass;
          pi.size = 2 + Math.pow(pi.mass, 0.5) * 1.5;
          pj.alive = false;
          continue;
        }
        const force = G * pi.mass * pj.mass / (distSq + 100);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        pi.vx += fx / pi.mass * dt * 60;
        pi.vy += fy / pi.mass * dt * 60;
        pj.vx -= fx / pj.mass * dt * 60;
        pj.vy -= fy / pj.mass * dt * 60;
      }

      if (isMouseDown) {
        const dx = mouseX - pi.x;
        const dy = mouseY - pi.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < MOUSE_ATTRACTION_RANGE * MOUSE_ATTRACTION_RANGE && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const force = G * pi.mass * 20 / (distSq + 200);
          pi.vx += (dx / dist) * force / pi.mass * dt * 60;
          pi.vy += (dy / dist) * force / pi.mass * dt * 60;
        }
      }

      pi.vx *= DAMPING;
      pi.vy *= DAMPING;
      const speed = Math.sqrt(pi.vx * pi.vx + pi.vy * pi.vy);
      if (speed > MAX_SPEED) {
        pi.vx = (pi.vx / speed) * MAX_SPEED;
        pi.vy = (pi.vy / speed) * MAX_SPEED;
      }
      pi.x += pi.vx * dt * 60;
      pi.y += pi.vy * dt * 60;
    }

    const toCreate: PlanetCreationData[] = [];
    this.particles = this.particles.filter(p => {
      if (!p.alive) return false;
      if (p.mass >= PLANET_MASS_THRESHOLD) {
        toCreate.push({ x: p.x, y: p.y, mass: p.mass, r: p.r, g: p.g, b: p.b });
        return false;
      }
      return true;
    });

    for (const data of toCreate) {
      this.onPlanetCreation?.(data);
    }

    this.updateBuffers();
  }

  private updateBuffers() {
    const n = this.particles.length;
    for (let i = 0; i < n; i++) {
      const p = this.particles[i];
      const i3 = i * 3;
      this.posArray[i3] = p.x;
      this.posArray[i3 + 1] = p.y;
      this.posArray[i3 + 2] = 0;
      this.colorArray[i3] = p.r;
      this.colorArray[i3 + 1] = p.g;
      this.colorArray[i3 + 2] = p.b;
      this.sizeArray[i] = p.size;
      this.alphaArray[i] = p.alpha;
    }
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    this.geometry.setDrawRange(0, n);
  }

  clear() {
    this.particles = [];
    this.spawnRadius = 300;
    this.updateBuffers();
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.points);
  }
}
