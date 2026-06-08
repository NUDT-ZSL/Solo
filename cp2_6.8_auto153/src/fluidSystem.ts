import * as THREE from 'three';

export type FluidMode = 'vortex' | 'spray' | 'diffusion';

export interface FluidParams {
  viscosity: number;
  turbulence: number;
  sprayAngleX: number;
  sprayAngleY: number;
  mode: FluidMode;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  originalPosition: THREE.Vector3;
}

const PARTICLE_COUNT = 1000;
const BOUNDARY_RADIUS = 8;
const INITIAL_SPHERE_RADIUS = 2;
const COLOR_LOW = new THREE.Color(0x0077b6);
const COLOR_HIGH = new THREE.Color(0xe63946);
const TRANSITION_DURATION = 1500;
const GC_INTERVAL = 30000;
const MODE_NAMES: Record<FluidMode, string> = {
  vortex: '涡流模式',
  spray: '喷射模式',
  diffusion: '扩散模式'
};

export class FluidSystem {
  public params: FluidParams;
  public points: THREE.Points;
  public onModeChange?: (modeName: string) => void;

  private particles: Particle[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  private transitionActive = false;
  private transitionStart = 0;
  private transitionFrom: THREE.Vector3[] = [];

  private lastGCTime = 0;
  private tmpColor = new THREE.Color();
  private tmpVec = new THREE.Vector3();

  constructor() {
    this.params = {
      viscosity: 0.5,
      turbulence: 2.0,
      sprayAngleX: 0,
      sprayAngleY: 0,
      mode: 'vortex'
    };

    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(PARTICLE_COUNT);

    this.initParticles();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.updateBuffers();
  }

  private initParticles(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      const r = INITIAL_SPHERE_RADIUS * Math.cbrt(Math.random());

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      const position = new THREE.Vector3(x, y, z);
      this.particles.push({
        position: position.clone(),
        velocity: new THREE.Vector3(0, 0, 0),
        originalPosition: position.clone()
      });
    }
  }

  public setMode(mode: FluidMode): void {
    if (this.params.mode === mode && !this.transitionActive) return;

    this.transitionFrom = this.particles.map(p => p.position.clone());
    this.transitionActive = true;
    this.transitionStart = performance.now();
    this.params.mode = mode;

    if (this.onModeChange) {
      this.onModeChange(MODE_NAMES[mode]);
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private getSprayDirection(): THREE.Vector3 {
    const radX = (this.params.sprayAngleX * Math.PI) / 180;
    const radY = (this.params.sprayAngleY * Math.PI) / 180;
    const dir = new THREE.Vector3(
      Math.sin(radX),
      Math.sin(radY),
      Math.cos(radX) * Math.cos(radY)
    );
    return dir.normalize();
  }

  private updateParticleVortex(p: Particle, dt: number, viscosityFactor: number): void {
    const pos = p.position;
    const distXY = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
    const angle = Math.atan2(pos.y, pos.x);

    const angularSpeed = 1.5 / (distXY + 0.5);
    const tangentialX = -Math.sin(angle) * angularSpeed * distXY;
    const tangentialY = Math.cos(angle) * angularSpeed * distXY;

    const pullStrength = viscosityFactor * 0.8;
    const zPull = -pos.z * pullStrength * 0.3;
    const radialPull = -distXY * pullStrength * 0.1;

    p.velocity.x += (tangentialX + Math.cos(angle) * radialPull - p.velocity.x) * viscosityFactor * dt * 3;
    p.velocity.y += (tangentialY + Math.sin(angle) * radialPull - p.velocity.y) * viscosityFactor * dt * 3;
    p.velocity.z += (zPull - p.velocity.z) * viscosityFactor * dt * 3;
  }

  private updateParticleSpray(p: Particle, dt: number, viscosityFactor: number): void {
    const sprayDir = this.getSprayDirection();
    const distFromCenter = p.position.length();

    const speed = 2.5 + Math.random() * 1.5;
    const targetVel = this.tmpVec.copy(sprayDir).multiplyScalar(speed);

    const spreadAngle = 0.3;
    targetVel.x += (Math.random() - 0.5) * spreadAngle * speed;
    targetVel.y += (Math.random() - 0.5) * spreadAngle * speed;
    targetVel.z += (Math.random() - 0.5) * spreadAngle * speed;

    const accel = viscosityFactor * dt * 4;
    p.velocity.lerp(targetVel, Math.min(accel / (distFromCenter + 0.1), 1));
  }

  private updateParticleDiffusion(p: Particle, dt: number, viscosityFactor: number): void {
    if (p.position.lengthSq() < 0.01) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      p.velocity.set(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      ).multiplyScalar(0.3);
    } else {
      const radialDir = this.tmpVec.copy(p.position).normalize();
      const targetVel = radialDir.multiplyScalar(0.5 + Math.random() * 0.3);
      p.velocity.lerp(targetVel, viscosityFactor * dt * 1.5);
    }
  }

  private addTurbulence(p: Particle, dt: number): void {
    if (this.params.turbulence <= 0) return;
    const t = this.params.turbulence;
    p.velocity.x += (Math.random() - 0.5) * t * dt * 2;
    p.velocity.y += (Math.random() - 0.5) * t * dt * 2;
    p.velocity.z += (Math.random() - 0.5) * t * dt * 2;
  }

  private clampVelocity(p: Particle): void {
    const maxSpeed = 5;
    if (p.velocity.lengthSq() > maxSpeed * maxSpeed) {
      p.velocity.normalize().multiplyScalar(maxSpeed);
    }
  }

  private enforceBoundary(p: Particle): void {
    const distSq = p.position.lengthSq();
    if (distSq > BOUNDARY_RADIUS * BOUNDARY_RADIUS) {
      const angle1 = Math.acos(2 * Math.random() - 1);
      const angle2 = 2 * Math.PI * Math.random();
      const offsetR = Math.random();
      p.position.set(
        Math.sin(angle1) * Math.cos(angle2) * offsetR,
        Math.sin(angle1) * Math.sin(angle2) * offsetR,
        Math.cos(angle1) * offsetR
      );
      p.velocity.set(0, 0, 0);
    }
  }

  private runGC(now: number): void {
    if (PARTICLE_COUNT <= 500) return;
    if (now - this.lastGCTime < GC_INTERVAL) return;
    this.lastGCTime = now;

    let recycled = 0;
    for (const p of this.particles) {
      const distSq = p.position.lengthSq();
      if (distSq > (BOUNDARY_RADIUS * 0.9) * (BOUNDARY_RADIUS * 0.9)) {
        const angle1 = Math.acos(2 * Math.random() - 1);
        const angle2 = 2 * Math.PI * Math.random();
        const offsetR = Math.random() * 0.5;
        p.position.set(
          Math.sin(angle1) * Math.cos(angle2) * offsetR,
          Math.sin(angle1) * Math.sin(angle2) * offsetR,
          Math.cos(angle1) * offsetR
        );
        p.velocity.set(0, 0, 0);
        recycled++;
      }
    }
    void recycled;
  }

  public update(dt: number, now: number): void {
    const viscosityFactor = 1.1 - this.params.viscosity;
    const clampedDt = Math.min(dt, 0.05);

    let transitionProgress = 0;
    if (this.transitionActive) {
      transitionProgress = (now - this.transitionStart) / TRANSITION_DURATION;
      if (transitionProgress >= 1) {
        this.transitionActive = false;
        transitionProgress = 1;
      }
    }
    const easedProgress = this.easeInOutCubic(Math.min(transitionProgress, 1));

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.particles[i];

      switch (this.params.mode) {
        case 'vortex':
          this.updateParticleVortex(p, clampedDt, viscosityFactor);
          break;
        case 'spray':
          this.updateParticleSpray(p, clampedDt, viscosityFactor);
          break;
        case 'diffusion':
          this.updateParticleDiffusion(p, clampedDt, viscosityFactor);
          break;
      }

      this.addTurbulence(p, clampedDt);
      this.clampVelocity(p);

      p.position.addScaledVector(p.velocity, clampedDt);

      if (this.transitionActive && this.transitionFrom[i]) {
        p.position.lerpVectors(this.transitionFrom[i], p.position, easedProgress);
      }

      this.enforceBoundary(p);

      const speed = Math.min(p.velocity.length(), 5);
      const speedT = speed / 5;

      this.tmpColor.copy(COLOR_LOW).lerp(COLOR_HIGH, speedT);
      const size = 0.05 + speedT * 0.10;

      const i3 = i * 3;
      this.positions[i3] = p.position.x;
      this.positions[i3 + 1] = p.position.y;
      this.positions[i3 + 2] = p.position.z;
      this.colors[i3] = this.tmpColor.r;
      this.colors[i3 + 1] = this.tmpColor.g;
      this.colors[i3 + 2] = this.tmpColor.b;
      this.sizes[i] = size;
    }

    this.runGC(now);
    this.updateBuffers();
  }

  private updateBuffers(): void {
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
