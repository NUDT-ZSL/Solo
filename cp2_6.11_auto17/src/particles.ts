import * as THREE from 'three';

export type MaterialType = 'water' | 'metal' | 'glass' | 'leaf';

export const MATERIAL_COLORS: Record<MaterialType, number> = {
  water: 0x4a90d9,
  metal: 0xc0c0c0,
  glass: 0xb0e0e6,
  leaf: 0x228b22
};

export interface CollisionEvent {
  x: number;
  z: number;
  material: MaterialType;
  intensity: number;
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
}

interface Ripple {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

const MAX_SPLASH = 800;
const MAX_RIPPLES = 60;
const TRAIL_LENGTH = 5;

export class ParticleSystem {
  private scene: THREE.Scene;
  private splashParticles: SplashParticle[] = [];
  private ripples: Ripple[] = [];
  private sharedSplashGeo: THREE.SphereGeometry;
  private sharedRippleGeo: THREE.RingGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sharedSplashGeo = new THREE.SphereGeometry(0.015, 6, 6);
    this.sharedRippleGeo = new THREE.RingGeometry(0.08, 0.1, 32);
  }

  handleCollision(event: CollisionEvent): void {
    const colorHex = MATERIAL_COLORS[event.material];
    const count = event.intensity >= 1 ? 30 : 15;
    const speedMul = event.intensity >= 1 ? 1 : 0.6;

    this.createSplashParticles(event.x, event.z, colorHex, count, speedMul);
    this.createRipple(event.x, event.z, colorHex);
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
      if (this.splashParticles.length >= MAX_SPLASH) {
        this.removeOldestSplash();
      }

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

      this.splashParticles.push({
        mesh,
        velocity,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.4,
        startColor,
        endColor,
        trailPositions,
        trail
      });
    }
  }

  private createRipple(x: number, z: number, colorHex: number): void {
    if (this.ripples.length >= MAX_RIPPLES) {
      this.removeOldestRipple();
    }

    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(this.sharedRippleGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.005, z);
    this.scene.add(mesh);

    this.ripples.push({
      mesh,
      life: 0,
      maxLife: 1.5
    });
  }

  private removeOldestSplash(): void {
    const p = this.splashParticles.shift();
    if (p) {
      this.scene.remove(p.mesh);
      this.scene.remove(p.trail);
      (p.mesh.material as THREE.Material).dispose();
      (p.trail.material as THREE.Material).dispose();
      p.trail.geometry.dispose();
    }
  }

  private removeOldestRipple(): void {
    const r = this.ripples.shift();
    if (r) {
      this.scene.remove(r.mesh);
      (r.mesh.material as THREE.Material).dispose();
    }
  }

  update(dt: number): void {
    for (let i = this.splashParticles.length - 1; i >= 0; i--) {
      const p = this.splashParticles[i];
      p.life += dt;

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        this.scene.remove(p.trail);
        (p.mesh.material as THREE.Material).dispose();
        (p.trail.material as THREE.Material).dispose();
        p.trail.geometry.dispose();
        this.splashParticles.splice(i, 1);
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

      const t = p.life / p.maxLife;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.color.copy(p.startColor).lerp(p.endColor, t);
      mat.opacity = 0.9 * (1 - t);
      (p.trail.material as THREE.PointsMaterial).opacity = 0.5 * (1 - t);
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.life += dt;

      if (r.life >= r.maxLife) {
        this.scene.remove(r.mesh);
        (r.mesh.material as THREE.Material).dispose();
        this.ripples.splice(i, 1);
        continue;
      }

      const t = r.life / r.maxLife;
      const scale = 0.1 + t * 0.7;
      r.mesh.scale.set(scale / 0.1, scale / 0.1, 1);

      const mat = r.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.7 * (1 - t);
    }
  }

  clearAll(): void {
    while (this.splashParticles.length > 0) {
      this.removeOldestSplash();
    }
    while (this.ripples.length > 0) {
      this.removeOldestRipple();
    }
  }

  getStats(): { splash: number; ripples: number } {
    return {
      splash: this.splashParticles.length,
      ripples: this.ripples.length
    };
  }
}
