import * as THREE from 'three';

export type MaterialType = 'water' | 'metal' | 'glass' | 'leaf';

export const MATERIAL_COLORS: Record<MaterialType, number> = {
  water: 0x4a90d9,
  metal: 0xc0c0c0,
  glass: 0xb0e0e6,
  leaf: 0x228b22
};

export type CollisionSource = 'manual' | 'auto';

export interface CollisionEvent {
  x: number;
  z: number;
  material?: MaterialType;
  source?: CollisionSource;
}

interface SplashParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  startColor: THREE.Color;
  endColor: THREE.Color;
  trailPositions: THREE.Vector3[];
  trail: THREE.Points;
  active: boolean;
}

interface Ripple {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  active: boolean;
}

const MAX_SPLASH = 800;
const MAX_RIPPLES = 60;
const TRAIL_LENGTH = 5;
const RIPPLE_EXPAND_DURATION = 1.5;
const RIPPLE_START_RADIUS = 0.1;
const RIPPLE_END_RADIUS = 0.8;

export class ParticleSystem {
  private scene: THREE.Scene;
  private splashBuffer: (SplashParticle | null)[];
  private splashWritePtr: number = 0;
  private rippleBuffer: (Ripple | null)[];
  private rippleWritePtr: number = 0;
  private sharedSplashGeo: THREE.SphereGeometry;
  private sharedRippleGeo: THREE.RingGeometry;
  private currentMaterial: MaterialType = 'water';
  private currentColor: THREE.Color;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.splashBuffer = new Array(MAX_SPLASH).fill(null);
    this.rippleBuffer = new Array(MAX_RIPPLES).fill(null);
    this.sharedSplashGeo = new THREE.SphereGeometry(0.015, 6, 6);
    this.sharedRippleGeo = new THREE.RingGeometry(0.08, 0.1, 32);
    this.currentColor = new THREE.Color(MATERIAL_COLORS.water);
  }

  setMaterial(material: MaterialType): void {
    this.currentMaterial = material;
    this.currentColor = new THREE.Color(MATERIAL_COLORS[material]);
  }

  handleCollision(event: CollisionEvent): void {
    const effectiveMaterial = event.material ?? this.currentMaterial;
    const colorHex = MATERIAL_COLORS[effectiveMaterial];
    const source: CollisionSource = event.source ?? 'auto';
    const isManual = source === 'manual';
    const count = isManual ? 30 : 15;
    const speedMul = isManual ? 1.0 : 0.6;

    this.createSplashParticles(event.x, event.z, colorHex, count, speedMul);
    this.createRipple(event.x, event.z, colorHex);
  }

  private disposeSplashSlot(idx: number): void {
    const p = this.splashBuffer[idx];
    if (!p) return;
    try {
      this.scene.remove(p.mesh);
      this.scene.remove(p.trail);
      (p.mesh.material as THREE.Material).dispose();
      (p.trail.material as THREE.Material).dispose();
      p.trail.geometry.dispose();
    } catch (_) { /* noop */ }
    this.splashBuffer[idx] = null;
  }

  private disposeRippleSlot(idx: number): void {
    const r = this.rippleBuffer[idx];
    if (!r) return;
    try {
      this.scene.remove(r.mesh);
      (r.mesh.material as THREE.Material).dispose();
    } catch (_) { /* noop */ }
    this.rippleBuffer[idx] = null;
  }

  private allocSplashSlot(): number {
    for (let i = 0; i < MAX_SPLASH; i++) {
      const idx = (this.splashWritePtr + i) % MAX_SPLASH;
      const slot = this.splashBuffer[idx];
      if (!slot || !slot.active) {
        this.disposeSplashSlot(idx);
        this.splashWritePtr = (idx + 1) % MAX_SPLASH;
        return idx;
      }
    }
    const idx = this.splashWritePtr;
    this.disposeSplashSlot(idx);
    this.splashWritePtr = (idx + 1) % MAX_SPLASH;
    return idx;
  }

  private allocRippleSlot(): number {
    for (let i = 0; i < MAX_RIPPLES; i++) {
      const idx = (this.rippleWritePtr + i) % MAX_RIPPLES;
      const slot = this.rippleBuffer[idx];
      if (!slot || !slot.active) {
        this.disposeRippleSlot(idx);
        this.rippleWritePtr = (idx + 1) % MAX_RIPPLES;
        return idx;
      }
    }
    const idx = this.rippleWritePtr;
    this.disposeRippleSlot(idx);
    this.rippleWritePtr = (idx + 1) % MAX_RIPPLES;
    return idx;
  }

  private createSplashParticles(
    x: number,
    z: number,
    colorHex: number,
    count: number,
    speedMul: number
  ): void {
    const startColor = new THREE.Color(colorHex);
    const endColor = new THREE.Color(colorHex).multiplyScalar(0.3);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.3 + Math.random() * 0.5) * speedMul;
      const upSpeed = 0.3 + Math.random() * 0.7;

      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.9
      });
      const mesh = new THREE.Mesh(this.sharedSplashGeo, mat);
      mesh.position.set(x, 0.01, z);
      this.scene.add(mesh);

      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        upSpeed,
        Math.sin(angle) * speed
      );

      const trailPositions: THREE.Vector3[] = [];
      for (let t = 0; t < TRAIL_LENGTH; t++) {
        trailPositions.push(new THREE.Vector3(x, 0.01, z));
      }

      const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPositions);
      const trailMat = new THREE.PointsMaterial({
        color: colorHex,
        size: 0.012,
        transparent: true,
        opacity: 0.5,
        sizeAttenuation: true
      });
      const trail = new THREE.Points(trailGeo, trailMat);
      this.scene.add(trail);

      const idx = this.allocSplashSlot();
      this.splashBuffer[idx] = {
        mesh,
        velocity,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.4,
        startColor,
        endColor,
        trailPositions,
        trail,
        active: true
      };
    }
  }

  private createRipple(x: number, z: number, colorHex: number): void {
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(this.sharedRippleGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.005, z);
    mesh.scale.setScalar(RIPPLE_START_RADIUS / 0.1);
    this.scene.add(mesh);

    const idx = this.allocRippleSlot();
    this.rippleBuffer[idx] = {
      mesh,
      life: 0,
      maxLife: RIPPLE_EXPAND_DURATION,
      active: true
    };
  }

  update(dt: number): void {
    for (let i = 0; i < MAX_SPLASH; i++) {
      const p = this.splashBuffer[i];
      if (!p || !p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        this.disposeSplashSlot(i);
        continue;
      }

      p.velocity.y -= 2.5 * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);

      if (p.mesh.position.y < 0) {
        p.mesh.position.y = 0;
        p.velocity.y *= -0.3;
        p.velocity.x *= 0.7;
        p.velocity.z *= 0.7;
      }

      for (let t = p.trailPositions.length - 1; t > 0; t--) {
        p.trailPositions[t].copy(p.trailPositions[t - 1]);
      }
      p.trailPositions[0].copy(p.mesh.position);
      (p.trail.geometry as THREE.BufferGeometry).setFromPoints(p.trailPositions);
      (p.trail.geometry as THREE.BufferGeometry).attributes.position.needsUpdate = true;

      const lifeT = p.life / p.maxLife;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.color.copy(p.startColor).lerp(p.endColor, lifeT);
      mat.opacity = 0.9 * (1 - lifeT);
      (p.trail.material as THREE.PointsMaterial).opacity = 0.5 * (1 - lifeT);
    }

    for (let i = 0; i < MAX_RIPPLES; i++) {
      const r = this.rippleBuffer[i];
      if (!r || !r.active) continue;

      r.life += dt;
      if (r.life >= r.maxLife) {
        r.active = false;
        this.disposeRippleSlot(i);
        continue;
      }

      const expandT = Math.min(r.life / RIPPLE_EXPAND_DURATION, 1.0);
      const currentRadius = RIPPLE_START_RADIUS + (RIPPLE_END_RADIUS - RIPPLE_START_RADIUS) * expandT;
      const scaleFactor = currentRadius / 0.1;
      r.mesh.scale.set(scaleFactor, scaleFactor, 1);

      const mat = r.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.7 * (1 - expandT);
    }
  }

  clearAll(): void {
    for (let i = 0; i < MAX_SPLASH; i++) {
      this.disposeSplashSlot(i);
    }
    for (let i = 0; i < MAX_RIPPLES; i++) {
      this.disposeRippleSlot(i);
    }
    this.splashWritePtr = 0;
    this.rippleWritePtr = 0;
  }

  getStats(): { splash: number; ripples: number } {
    let s = 0, r = 0;
    for (let i = 0; i < MAX_SPLASH; i++) if (this.splashBuffer[i]?.active) s++;
    for (let i = 0; i < MAX_RIPPLES; i++) if (this.rippleBuffer[i]?.active) r++;
    return { splash: s, ripples: r };
  }
}
