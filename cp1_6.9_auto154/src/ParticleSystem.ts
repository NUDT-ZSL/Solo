import * as THREE from 'three';
import { MagneticField } from './MagneticField';

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  forceMagnitude: number;
  filamentId: number;
  lastFilamentCheck: number;
}

export interface Filament {
  id: number;
  particleIndices: number[];
  initialLength: number;
  currentLength: number;
  targetDirection: THREE.Vector3;
}

export class ParticleSystem {
  particles: Particle[] = [];
  filaments: Filament[] = [];
  geometry: THREE.BufferGeometry | null = null;
  material: THREE.PointsMaterial | null = null;
  points: THREE.Points | null = null;
  damping: number = 0.02;
  repulsionRadius: number = 3;
  repulsionThreshold: number = 5;
  cloudRadius: number = 120;
  maxParticlesPerFrame: number = 6000;
  private positions: Float32Array | null = null;
  private colors: Float32Array | null = null;
  private filamentIdCounter: number = 0;
  private filamentReconvergeTimers: Map<number, number> = new Map();
  private poleDistanceThreshold: number = 200;

  constructor() {}

  init(count: number): void {
    this.particles = [];
    this.filaments = [];
    this.filamentIdCounter = 0;
    this.filamentReconvergeTimers.clear();

    for (let i = 0; i < count; i++) {
      const position = this.randomInSphere(this.cloudRadius);
      this.particles.push({
        position,
        velocity: new THREE.Vector3(0, 0, 0),
        acceleration: new THREE.Vector3(0, 0, 0),
        forceMagnitude: 0,
        filamentId: -1,
        lastFilamentCheck: 0,
      });
    }

    this.setupGeometry();
  }

  private randomInSphere(radius: number): THREE.Vector3 {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * Math.cbrt(Math.random());

    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi) * 0.6
    );
  }

  private setupGeometry(): void {
    const count = this.particles.length;
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.colors, 3)
    );

    this.material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);

    this.updateBuffers();
  }

  setCount(count: number): void {
    this.init(count);
  }

  getCount(): number {
    return this.particles.length;
  }

  update(delta: number, field: MagneticField): void {
    const clampedDelta = Math.min(delta, 0.033);
    const particleCount = this.particles.length;
    const updateCount = Math.min(particleCount, this.maxParticlesPerFrame);
    const poleDistance = field.getPoleDistance();

    for (let i = 0; i < updateCount; i++) {
      const p = this.particles[i];

      const force = field.getFieldForce(p.position);
      p.forceMagnitude = force.length();

      p.acceleration.copy(force);

      this.applyRepulsion(i);

      p.velocity.add(p.acceleration.clone().multiplyScalar(clampedDelta));
      p.velocity.multiplyScalar(1 - this.damping);

      const maxSpeed = 200;
      if (p.velocity.length() > maxSpeed) {
        p.velocity.normalize().multiplyScalar(maxSpeed);
      }

      p.position.add(p.velocity.clone().multiplyScalar(clampedDelta));

      this.enforceBounds(p);
    }

    if (poleDistance < this.poleDistanceThreshold) {
      this.updateFilaments(clampedDelta, field);
    } else {
      this.breakAllFilaments();
    }

    this.updateBuffers();
  }

  private applyRepulsion(index: number): void {
    const p = this.particles[index];
    const checkRange = 15;

    const startIdx = Math.max(0, index - checkRange);
    const endIdx = Math.min(this.particles.length, index + checkRange);

    for (let j = startIdx; j < endIdx; j++) {
      if (j === index) continue;
      const other = this.particles[j];
      const diff = p.position.clone().sub(other.position);
      const dist = diff.length();

      if (dist < this.repulsionThreshold && dist > 0.01) {
        const overlap = this.repulsionThreshold - dist;
        const repulseForce = overlap * 2;
        const forceDir = diff.normalize();
        p.acceleration.add(forceDir.multiplyScalar(repulseForce));
      }
    }
  }

  private enforceBounds(p: Particle): void {
    const maxBound = 250;
    const boundRestitution = 0.5;

    ['x', 'y', 'z'].forEach((axis) => {
      const key = axis as 'x' | 'y' | 'z';
      if (p.position[key] > maxBound) {
        p.position[key] = maxBound;
        p.velocity[key] *= -boundRestitution;
      } else if (p.position[key] < -maxBound) {
        p.position[key] = -maxBound;
        p.velocity[key] *= -boundRestitution;
      }
    });
  }

  private updateFilaments(delta: number, field: MagneticField): void {
    this.checkFilamentBreaks();
    this.checkFilamentFormation(delta, field);
    this.applyFilamentForces(delta);

    this.filamentReconvergeTimers.forEach((timeLeft, particleIdx) => {
      const newTime = timeLeft - delta;
      if (newTime <= 0) {
        this.filamentReconvergeTimers.delete(particleIdx);
        this.tryReconvergeToFilament(particleIdx);
      } else {
        this.filamentReconvergeTimers.set(particleIdx, newTime);
      }
    });
  }

  private breakAllFilaments(): void {
    for (const f of this.filaments) {
      for (const idx of f.particleIndices) {
        this.particles[idx].filamentId = -1;
        if (!this.filamentReconvergeTimers.has(idx)) {
          this.filamentReconvergeTimers.set(idx, 0.5);
        }
      }
    }
    this.filaments = [];
  }

  private checkFilamentFormation(delta: number, field: MagneticField): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.filamentId !== -1) continue;
      if (p.lastFilamentCheck > 0) {
        p.lastFilamentCheck -= delta;
        continue;
      }

      if (p.forceMagnitude < 30) continue;

      let nearestIdx = -1;
      let nearestDist = 3;
      const searchRadius = 2;
      const forceDir = field.getFieldForce(p.position).normalize();

      for (let j = 0; j < this.particles.length; j++) {
        if (i === j) continue;
        const other = this.particles[j];
        const dist = p.position.distanceTo(other.position);
        if (dist < searchRadius && dist < nearestDist) {
          const toOther = other.position.clone().sub(p.position).normalize();
          const alignment = Math.abs(toOther.dot(forceDir));
          if (alignment > 0.6) {
            nearestIdx = j;
            nearestDist = dist;
          }
        }
      }

      if (nearestIdx !== -1) {
        this.joinOrCreateFilament(i, nearestIdx);
      }

      p.lastFilamentCheck = 0.1;
    }
  }

  private joinOrCreateFilament(idxA: number, idxB: number): void {
    const pA = this.particles[idxA];
    const pB = this.particles[idxB];

    if (pB.filamentId !== -1) {
      const filament = this.filaments.find((f) => f.id === pB.filamentId);
      if (filament && filament.particleIndices.length < 20) {
        filament.particleIndices.push(idxA);
        pA.filamentId = filament.id;
        this.recalculateFilamentLength(filament);
      }
    } else {
      const newFilament: Filament = {
        id: this.filamentIdCounter++,
        particleIndices: [idxA, idxB],
        initialLength: pA.position.distanceTo(pB.position),
        currentLength: pA.position.distanceTo(pB.position),
        targetDirection: pB.position.clone().sub(pA.position).normalize(),
      };
      pA.filamentId = newFilament.id;
      pB.filamentId = newFilament.id;
      this.filaments.push(newFilament);
    }
  }

  private recalculateFilamentLength(filament: Filament): void {
    let total = 0;
    for (let i = 0; i < filament.particleIndices.length - 1; i++) {
      total += this.particles[filament.particleIndices[i]].position.distanceTo(
        this.particles[filament.particleIndices[i + 1]].position
      );
    }
    filament.currentLength = total;
    if (filament.initialLength === 0) {
      filament.initialLength = total;
    }
  }

  private checkFilamentBreaks(): void {
    const filamentsToRemove: number[] = [];

    for (const filament of this.filaments) {
      this.recalculateFilamentLength(filament);
      const maxLength = filament.initialLength * 2;

      if (filament.currentLength > maxLength && filament.particleIndices.length > 2) {
        const midIdx = Math.floor(filament.particleIndices.length / 2);
        const firstHalf = filament.particleIndices.slice(0, midIdx);
        const secondHalf = filament.particleIndices.slice(midIdx);

        for (const idx of firstHalf) {
          this.particles[idx].filamentId = filament.id;
          this.filamentReconvergeTimers.set(idx, 0.5);
        }
        for (const idx of secondHalf) {
          this.particles[idx].filamentId = -1;
          this.filamentReconvergeTimers.set(idx, 0.5);
        }

        filament.particleIndices = firstHalf;
        this.recalculateFilamentLength(filament);
      }

      if (filament.particleIndices.length < 2) {
        filamentsToRemove.push(filament.id);
      }
    }

    this.filaments = this.filaments.filter((f) => !filamentsToRemove.includes(f.id));
  }

  private applyFilamentForces(delta: number): void {
    for (const filament of this.filaments) {
      if (filament.particleIndices.length < 2) continue;

      const springK = 0.5;

      for (let i = 0; i < filament.particleIndices.length - 1; i++) {
        const idxA = filament.particleIndices[i];
        const idxB = filament.particleIndices[i + 1];
        const pA = this.particles[idxA];
        const pB = this.particles[idxB];

        const diff = pB.position.clone().sub(pA.position);
        const currentDist = diff.length();
        const targetDist = 1.5;

        if (currentDist > 0.01) {
          const extension = currentDist - targetDist;
          const springForce = extension * springK;
          const dir = diff.normalize();

          pA.acceleration.add(dir.clone().multiplyScalar(springForce * 0.5));
          pB.acceleration.sub(dir.clone().multiplyScalar(springForce * 0.5));
        }
      }
    }
  }

  private tryReconvergeToFilament(particleIdx: number): void {
    const p = this.particles[particleIdx];
    let nearestFilamentId = -1;
    let nearestDist = 5;

    for (const filament of this.filaments) {
      for (const fIdx of filament.particleIndices) {
        const dist = p.position.distanceTo(this.particles[fIdx].position);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestFilamentId = filament.id;
        }
      }
    }

    if (nearestFilamentId !== -1) {
      const filament = this.filaments.find((f) => f.id === nearestFilamentId);
      if (filament && filament.particleIndices.length < 20) {
        filament.particleIndices.push(particleIdx);
        p.filamentId = filament.id;
      }
    }
  }

  private mapForceToColor(forceMag: number): { r: number; g: number; b: number; a: number } {
    const flicker = 1 + (Math.random() * 0.2 - 0.1);

    let hue: number;
    let alpha: number;

    if (forceMag <= 50) {
      const t = forceMag / 50;
      hue = 240 - t * 60;
      alpha = 0.6 + t * 0.2;
    } else if (forceMag <= 150) {
      const t = (forceMag - 50) / 100;
      hue = 180 - t * 120;
      alpha = 0.8 + t * 0.1;
    } else {
      const t = Math.min((forceMag - 150) / 100, 1);
      hue = 60 - t * 60;
      alpha = 0.9 + t * 0.1;
    }

    const rgb = this.hslToRgb(hue / 360, 1, 0.5);
    return {
      r: Math.min(1, rgb.r * flicker),
      g: Math.min(1, rgb.g * flicker),
      b: Math.min(1, rgb.b * flicker),
      a: Math.min(1, alpha),
    };
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r, g, b };
  }

  private updateBuffers(): void {
    if (!this.positions || !this.colors || !this.geometry) return;

    const count = this.particles.length;
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      const i3 = i * 3;

      this.positions[i3] = p.position.x;
      this.positions[i3 + 1] = p.position.y;
      this.positions[i3 + 2] = p.position.z;

      const color = this.mapForceToColor(p.forceMagnitude);
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;
    }

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  }

  render(scene: THREE.Scene): void {
    if (this.points && !scene.children.includes(this.points)) {
      scene.add(this.points);
    }
  }

  removeFromScene(scene: THREE.Scene): void {
    if (this.points && scene.children.includes(this.points)) {
      scene.remove(this.points);
    }
  }

  dispose(): void {
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
  }
}
