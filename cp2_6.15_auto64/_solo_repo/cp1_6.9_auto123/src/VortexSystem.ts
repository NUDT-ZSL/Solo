import * as THREE from 'three';

export interface VortexRing {
  id: number;
  center: THREE.Vector3;
  normal: THREE.Vector3;
  radius: number;
  baseRadius: number;
  particleCount: number;
  rotationSpeed: number;
  rotationDirection: 1 | -1;
  flowSpeed: number;
  age: number;
  lifetime: number;
  opacity: number;
  particlesOffset: number;
  createdAt: number;
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
  isSplitAnimating: boolean;
  splitAnimTime: number;
  isMerging: boolean;
}

export interface ParticleData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  opacities: Float32Array;
  totalCount: number;
  maxCount: number;
}

export interface MergeEffect {
  id: number;
  center: THREE.Vector3;
  startTime: number;
  duration: number;
  currentRadius: number;
  opacity: number;
  active: boolean;
}

export interface ClickRippleEffect {
  id: number;
  center: THREE.Vector3;
  startTime: number;
  duration: number;
  active: boolean;
}

const MAX_PARTICLES = 15000;
const MERGE_DISTANCE = 3;
const DEFAULT_PARTICLES = 3000;
const DEFAULT_RADIUS = 2;
const LIFETIME = 12;

let nextId = 1;

export class VortexSystem {
  private vortexRings: VortexRing[] = [];
  private particleData: ParticleData;
  private mergeEffects: MergeEffect[] = [];
  private clickRippleEffects: ClickRippleEffect[] = [];
  private timeScale = 1;
  private tmpVector = new THREE.Vector3();
  private tmpVector2 = new THREE.Vector3();
  private tmpQuaternion = new THREE.Quaternion();

  constructor(maxParticles: number = MAX_PARTICLES) {
    this.particleData = {
      positions: new Float32Array(maxParticles * 3),
      colors: new Float32Array(maxParticles * 3),
      sizes: new Float32Array(maxParticles),
      opacities: new Float32Array(maxParticles),
      totalCount: 0,
      maxCount: maxParticles,
    };
  }

  getVortexRings(): VortexRing[] {
    return this.vortexRings;
  }

  getParticleData(): ParticleData {
    return this.particleData;
  }

  getMergeEffects(): MergeEffect[] {
    return this.mergeEffects;
  }

  getClickRippleEffects(): ClickRippleEffect[] {
    return this.clickRippleEffects;
  }

  getTimeScale(): number {
    return this.timeScale;
  }

  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0.5, Math.min(3, scale));
  }

  getTotalParticles(): number {
    return this.vortexRings.reduce((sum, r) => sum + r.particleCount, 0);
  }

  createVortex(
    startPoint: THREE.Vector3,
    endPoint: THREE.Vector3,
    dragStartScreen: { x: number; y: number },
    dragEndScreen: { x: number; y: number },
    dragSpeed: number
  ): VortexRing | null {
    const direction = this.tmpVector.copy(endPoint).sub(startPoint);
    const dragLength = direction.length();
    if (dragLength < 0.1) return null;

    const center = this.tmpVector2.copy(startPoint).add(endPoint).multiplyScalar(0.5);
    direction.normalize();

    const up = new THREE.Vector3(0, 1, 0);
    let normal = new THREE.Vector3().crossVectors(direction, up);
    if (normal.lengthSq() < 0.01) {
      normal.set(1, 0, 0);
    } else {
      normal.normalize();
    }

    const dragScreenDx = dragEndScreen.x - dragStartScreen.x;
    const dragScreenDy = dragEndScreen.y - dragStartScreen.y;
    const rotationDirection: 1 | -1 = dragScreenDx >= 0 ? 1 : -1;

    const flowSpeed = Math.max(0.5, Math.min(3, 0.5 + dragSpeed * 2));
    const rotationSpeed = Math.max(0.3, Math.min(2, 0.3 + dragSpeed));

    const warmColor = new THREE.Color(0xff6b35);
    const coolColor = new THREE.Color(0x7b2d8e);
    const t = Math.min(1, dragLength / 10);
    const colorStart = warmColor.clone().lerp(coolColor, t * 0.3);
    const colorEnd = coolColor.clone().lerp(new THREE.Color(0x00d4ff), t * 0.5);

    const offset = this.allocateParticles(DEFAULT_PARTICLES);
    if (offset === -1) return null;

    const ring: VortexRing = {
      id: nextId++,
      center: center.clone(),
      normal,
      radius: DEFAULT_RADIUS,
      baseRadius: DEFAULT_RADIUS,
      particleCount: DEFAULT_PARTICLES,
      rotationSpeed,
      rotationDirection,
      flowSpeed,
      age: 0,
      lifetime: LIFETIME,
      opacity: 1,
      particlesOffset: offset,
      createdAt: performance.now(),
      colorStart,
      colorEnd,
      isSplitAnimating: false,
      splitAnimTime: 0,
      isMerging: false,
    };

    this.vortexRings.push(ring);
    this.initializeRingParticles(ring);

    return ring;
  }

  private allocateParticles(count: number): number {
    let currentTotal = this.getTotalParticles();
    if (currentTotal + count > this.particleData.maxCount) {
      this.evictOldestVortex(currentTotal + count - this.particleData.maxCount);
      currentTotal = this.getTotalParticles();
    }
    if (currentTotal + count > this.particleData.maxCount) return -1;

    let offset = 0;
    for (const ring of this.vortexRings) {
      if (ring.particlesOffset + ring.particleCount === offset) {
        offset += ring.particleCount;
      } else {
        return offset;
      }
    }
    return offset;
  }

  private evictOldestVortex(needParticles: number): void {
    const sorted = [...this.vortexRings].sort((a, b) => a.createdAt - b.createdAt);
    let evicted = 0;
    for (const ring of sorted) {
      if (evicted >= needParticles) break;
      ring.lifetime = Math.min(ring.lifetime, ring.age + 1.5);
      evicted += ring.particleCount;
    }
  }

  private initializeRingParticles(ring: VortexRing): void {
    const { positions, colors, sizes, opacities } = this.particleData;
    const offset = ring.particlesOffset;
    const count = ring.particleCount;

    const tangent = new THREE.Vector3();
    const up = new THREE.Vector3();
    this.buildBasis(ring.normal, tangent, up);

    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2;
      const r = ring.baseRadius * (0.95 + Math.random() * 0.1);
      const tubeRadius = ring.baseRadius * 0.08 * (0.5 + Math.random() * 0.5);
      const phi = Math.random() * Math.PI * 2;

      const ringX = Math.cos(theta) * r;
      const ringY = Math.sin(theta) * r;
      const tubeX = Math.cos(phi) * tubeRadius;
      const tubeY = Math.sin(phi) * tubeRadius;

      const pos = this.tmpVector
        .copy(ring.center)
        .addScaledVector(tangent, ringX + tubeX)
        .addScaledVector(up, ringY)
        .addScaledVector(ring.normal, tubeY);

      const idx = offset + i;
      positions[idx * 3] = pos.x;
      positions[idx * 3 + 1] = pos.y;
      positions[idx * 3 + 2] = pos.z;

      const t = Math.abs(Math.sin(theta * 0.5));
      const color = ring.colorStart.clone().lerp(ring.colorEnd, t);
      colors[idx * 3] = color.r;
      colors[idx * 3 + 1] = color.g;
      colors[idx * 3 + 2] = color.b;

      sizes[idx] = 0.04 + Math.random() * 0.04;
      opacities[idx] = 1;
    }
  }

  private buildBasis(normal: THREE.Vector3, tangent: THREE.Vector3, up: THREE.Vector3): void {
    const n = normal.clone().normalize();
    const temp = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    tangent.crossVectors(temp, n).normalize();
    up.crossVectors(n, tangent).normalize();
  }

  splitVortex(ringId: number): VortexRing[] | null {
    const ringIndex = this.vortexRings.findIndex((r) => r.id === ringId);
    if (ringIndex === -1) return null;

    const ring = this.vortexRings[ringIndex];
    const newRadius = ring.baseRadius * 0.6;
    const newCount = Math.floor(ring.particleCount / 2);
    const newCount2 = ring.particleCount - newCount;

    const offset1 = this.allocateParticles(newCount);
    const offset2 = this.allocateParticles(newCount2);
    if (offset1 === -1 || offset2 === -1) return null;

    const dir1 = ring.normal.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
    const dir2 = ring.normal.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 4);
    const sepDist = ring.baseRadius * 0.8;

    const child1: VortexRing = {
      id: nextId++,
      center: ring.center.clone().addScaledVector(dir1, sepDist),
      normal: dir1.normalize(),
      radius: newRadius,
      baseRadius: newRadius,
      particleCount: newCount,
      rotationSpeed: ring.rotationSpeed * 1.2,
      rotationDirection: ring.rotationDirection,
      flowSpeed: ring.flowSpeed,
      age: Math.max(0, ring.age - 2),
      lifetime: ring.lifetime + 2,
      opacity: 0,
      particlesOffset: offset1,
      createdAt: performance.now(),
      colorStart: ring.colorStart.clone(),
      colorEnd: ring.colorEnd.clone(),
      isSplitAnimating: true,
      splitAnimTime: 0,
      isMerging: false,
    };

    const child2: VortexRing = {
      id: nextId++,
      center: ring.center.clone().addScaledVector(dir2, sepDist),
      normal: dir2.normalize(),
      radius: newRadius,
      baseRadius: newRadius,
      particleCount: newCount2,
      rotationSpeed: ring.rotationSpeed * 1.2,
      rotationDirection: (ring.rotationDirection * -1) as 1 | -1,
      flowSpeed: ring.flowSpeed,
      age: Math.max(0, ring.age - 2),
      lifetime: ring.lifetime + 2,
      opacity: 0,
      particlesOffset: offset2,
      createdAt: performance.now(),
      colorStart: ring.colorStart.clone(),
      colorEnd: ring.colorEnd.clone(),
      isSplitAnimating: true,
      splitAnimTime: 0,
      isMerging: false,
    };

    this.initializeRingParticles(child1);
    this.initializeRingParticles(child2);
    child1.opacity = 0;
    child2.opacity = 0;

    this.vortexRings.splice(ringIndex, 1);
    this.vortexRings.push(child1, child2);
    this.compactParticles();

    return [child1, child2];
  }

  private mergeVortices(a: VortexRing, b: VortexRing): VortexRing | null {
    const avgRadius = (a.baseRadius + b.baseRadius) / 2;
    const newRadius = avgRadius * 1.5;
    const newCount = a.particleCount + b.particleCount;

    const offset = this.allocateParticles(newCount);
    if (offset === -1) return null;

    const center = this.tmpVector.copy(a.center).add(b.center).multiplyScalar(0.5);
    const normal = this.tmpVector2.copy(a.normal).add(b.normal).normalize();
    const avgSpeed = (a.flowSpeed + b.flowSpeed) / 2;
    const avgRot = (a.rotationSpeed + b.rotationSpeed) / 2;
    const colorStart = a.colorStart.clone().lerp(b.colorStart, 0.5);
    const colorEnd = a.colorEnd.clone().lerp(b.colorEnd, 0.5);

    const mergeCenter = center.clone();

    const merged: VortexRing = {
      id: nextId++,
      center,
      normal,
      radius: newRadius,
      baseRadius: newRadius,
      particleCount: newCount,
      rotationSpeed: avgRot,
      rotationDirection: a.rotationDirection,
      flowSpeed: avgSpeed,
      age: Math.min(a.age, b.age),
      lifetime: Math.max(a.lifetime, b.lifetime) + 2,
      opacity: 0,
      particlesOffset: offset,
      createdAt: performance.now(),
      colorStart,
      colorEnd,
      isSplitAnimating: false,
      splitAnimTime: 0,
      isMerging: true,
    };

    this.initializeRingParticles(merged);
    merged.opacity = 0;

    const idxA = this.vortexRings.indexOf(a);
    const idxB = this.vortexRings.indexOf(b);
    const indices = [idxA, idxB].sort((x, y) => y - x);
    for (const idx of indices) {
      if (idx !== -1) this.vortexRings.splice(idx, 1);
    }
    this.vortexRings.push(merged);

    this.mergeEffects.push({
      id: nextId++,
      center: mergeCenter,
      startTime: performance.now(),
      duration: 800,
      currentRadius: 0,
      opacity: 0.8,
      active: true,
    });

    this.compactParticles();
    return merged;
  }

  addClickRipple(center: THREE.Vector3): void {
    this.clickRippleEffects.push({
      id: nextId++,
      center: center.clone(),
      startTime: performance.now(),
      duration: 300,
      active: true,
    });
  }

  private compactParticles(): void {
    this.vortexRings.sort((a, b) => a.particlesOffset - b.particlesOffset);
    let cursor = 0;
    const { positions, colors, sizes, opacities } = this.particleData;
    for (const ring of this.vortexRings) {
      if (ring.particlesOffset !== cursor) {
        for (let i = 0; i < ring.particleCount; i++) {
          const src = (ring.particlesOffset + i) * 3;
          const dst = (cursor + i) * 3;
          positions[dst] = positions[src];
          positions[dst + 1] = positions[src + 1];
          positions[dst + 2] = positions[src + 2];
          colors[dst] = colors[src];
          colors[dst + 1] = colors[src + 1];
          colors[dst + 2] = colors[src + 2];
          sizes[cursor + i] = sizes[ring.particlesOffset + i];
          opacities[cursor + i] = opacities[ring.particlesOffset + i];
        }
        ring.particlesOffset = cursor;
      }
      cursor += ring.particleCount;
    }
    this.particleData.totalCount = cursor;
  }

  findVortexAtPoint(point: THREE.Vector3, threshold: number = 1.5): VortexRing | null {
    let closest: VortexRing | null = null;
    let closestDist = Infinity;
    for (const ring of this.vortexRings) {
      const d = ring.center.distanceTo(point);
      if (d < ring.radius + threshold && d < closestDist) {
        closest = ring;
        closestDist = d;
      }
    }
    return closest;
  }

  update(dt: number): void {
    const scaledDt = dt * this.timeScale;
    const now = performance.now();

    this.updateMergeEffects();
    this.updateClickRipples();

    const ringsToMerge: [VortexRing, VortexRing][] = [];
    for (let i = 0; i < this.vortexRings.length; i++) {
      for (let j = i + 1; j < this.vortexRings.length; j++) {
        const a = this.vortexRings[i];
        const b = this.vortexRings[j];
        const d = a.center.distanceTo(b.center);
        if (d < MERGE_DISTANCE) {
          ringsToMerge.push([a, b]);
        }
      }
    }

    if (ringsToMerge.length > 0) {
      const mergedSet = new Set<number>();
      for (const [a, b] of ringsToMerge) {
        if (mergedSet.has(a.id) || mergedSet.has(b.id)) continue;
        const merged = this.mergeVortices(a, b);
        if (merged) {
          mergedSet.add(a.id);
          mergedSet.add(b.id);
        }
      }
    }

    const toRemove: number[] = [];
    for (let i = 0; i < this.vortexRings.length; i++) {
      const ring = this.vortexRings[i];
      ring.age += scaledDt;

      const lifeProgress = ring.age / ring.lifetime;

      const fadeStart = ring.lifetime - 5;
      if (ring.age > fadeStart) {
        const fadeProgress = (ring.age - fadeStart) / 5;
        ring.opacity = Math.max(0, 1 - fadeProgress);
      } else {
        ring.opacity = Math.min(1, ring.opacity + scaledDt * 3);
      }

      const expandStart = ring.lifetime - 8;
      if (ring.age > expandStart) {
        const expandProgress = (ring.age - expandStart) / 8;
        if (expandProgress < 0.625) {
          const t = expandProgress / 0.625;
          ring.radius = ring.baseRadius * (1 + t);
        } else {
          const t = (expandProgress - 0.625) / 0.375;
          ring.radius = ring.baseRadius * 2 * (1 - t);
        }
      } else {
        ring.radius = ring.baseRadius;
      }

      if (ring.isSplitAnimating) {
        ring.splitAnimTime += scaledDt;
        const t = Math.min(1, ring.splitAnimTime / 0.6);
        ring.opacity = t;
        if (t >= 1) ring.isSplitAnimating = false;
      }

      if (ring.isMerging) {
        const age = (now - ring.createdAt) / 1000;
        ring.opacity = Math.min(1, age * 2);
        if (age > 0.5) ring.isMerging = false;
      }

      this.updateRingParticles(ring, scaledDt);

      if (ring.age >= ring.lifetime || ring.opacity <= 0) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.vortexRings.splice(toRemove[i], 1);
    }
    this.compactParticles();
  }

  private updateRingParticles(ring: VortexRing, dt: number): void {
    const { positions, colors, opacities } = this.particleData;
    const offset = ring.particlesOffset;
    const count = ring.particleCount;

    const tangent = new THREE.Vector3();
    const up = new THREE.Vector3();
    this.buildBasis(ring.normal, tangent, up);

    const rotSpeed = ring.rotationSpeed * ring.rotationDirection;
    const flowSpeed = ring.flowSpeed;
    const pulse = 0.8 + 0.2 * Math.sin(performance.now() / 250);

    for (let i = 0; i < count; i++) {
      const idx = offset + i;
      const px = positions[idx * 3];
      const py = positions[idx * 3 + 1];
      const pz = positions[idx * 3 + 2];

      const localPos = this.tmpVector.set(
        px - ring.center.x,
        py - ring.center.y,
        pz - ring.center.z
      );

      const localX = localPos.dot(tangent);
      const localY = localPos.dot(up);
      const localZ = localPos.dot(ring.normal);

      let theta = Math.atan2(localY, localX);
      const baseR = Math.sqrt(localX * localX + localY * localY);

      theta += rotSpeed * dt * 2;

      const targetR = ring.radius * (0.95 + Math.sin(i * 0.123) * 0.05);
      const tubeTarget = Math.abs(localZ);
      const drift = (targetR - baseR) * 0.02;

      const newR = baseR + drift + Math.sin(theta * 3 + performance.now() / 500) * 0.005;
      const newTube = tubeTarget + Math.sin(theta * 2 + i * 0.01) * 0.002;

      const newLocalX = Math.cos(theta) * newR;
      const newLocalY = Math.sin(theta) * newR;
      const newLocalZ = localZ * 0.98 + Math.sin(theta + flowSpeed * performance.now() / 1000) * 0.01;

      const newPos = this.tmpVector2
        .copy(ring.center)
        .addScaledVector(tangent, newLocalX)
        .addScaledVector(up, newLocalY)
        .addScaledVector(ring.normal, newLocalZ);

      positions[idx * 3] = newPos.x;
      positions[idx * 3 + 1] = newPos.y;
      positions[idx * 3 + 2] = newPos.z;

      const t = Math.abs(Math.sin(theta * 0.5));
      const cR = ring.colorStart.r * (1 - t) + ring.colorEnd.r * t;
      const cG = ring.colorStart.g * (1 - t) + ring.colorEnd.g * t;
      const cB = ring.colorStart.b * (1 - t) + ring.colorEnd.b * t;
      colors[idx * 3] = cR * pulse;
      colors[idx * 3 + 1] = cG * pulse;
      colors[idx * 3 + 2] = cB * pulse;

      opacities[idx] = ring.opacity;
    }
  }

  private updateMergeEffects(): void {
    const now = performance.now();
    for (let i = this.mergeEffects.length - 1; i >= 0; i--) {
      const eff = this.mergeEffects[i];
      const elapsed = now - eff.startTime;
      const t = Math.min(1, elapsed / eff.duration);
      eff.currentRadius = t * 6;
      eff.opacity = 0.8 * (1 - t);
      if (t >= 1) {
        eff.active = false;
        this.mergeEffects.splice(i, 1);
      }
    }
  }

  private updateClickRipples(): void {
    const now = performance.now();
    for (let i = this.clickRippleEffects.length - 1; i >= 0; i--) {
      const eff = this.clickRippleEffects[i];
      const elapsed = now - eff.startTime;
      if (elapsed >= eff.duration) {
        eff.active = false;
        this.clickRippleEffects.splice(i, 1);
      }
    }
  }
}
