import * as THREE from 'three';
import type { MaterialType } from './ui';
import { MATERIALS } from './ui';

export const SPLASH_MAX = 800;
export const RIPPLE_MAX = 60;
const TRAIL_MAX_POINTS = 5;

export interface CollisionEvent {
  x: number;
  z: number;
  isManual: boolean;
  material: MaterialType;
}

interface SplashParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  startColor: THREE.Color;
  endColor: THREE.Color;
  active: boolean;
  gravity: number;
  trail: THREE.Line | null;
  trailPositions: THREE.Vector3[];
}

interface RippleRing {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  startRadius: number;
  endRadius: number;
  active: boolean;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private splashPool: SplashParticle[] = [];
  private activeSplashes: SplashParticle[] = [];
  private ripplePool: RippleRing[] = [];
  private activeRipples: RippleRing[] = [];
  private splashGeometry: THREE.SphereGeometry;
  private currentMaterial: MaterialType = 'water';
  private trailEnabled: boolean = true;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.splashGeometry = new THREE.SphereGeometry(0.02, 6, 6);
    this.prewarmPools();
  }

  public setTrailEnabled(enabled: boolean): void {
    if (this.trailEnabled === enabled) return;
    this.trailEnabled = enabled;
    if (!enabled) {
      for (const s of this.activeSplashes) {
        if (s.trail) {
          this.scene.remove(s.trail);
          s.trail.geometry.dispose();
          (s.trail.material as THREE.Material).dispose();
          s.trail = null;
        }
        s.trailPositions = [];
      }
    }
  }

  public getTrailEnabled(): boolean {
    return this.trailEnabled;
  }

  private prewarmPools(): void {
    for (let i = 0; i < SPLASH_MAX; i++) {
      this.splashPool.push(this.createInactiveSplash());
    }
    for (let i = 0; i < RIPPLE_MAX; i++) {
      this.ripplePool.push(this.createInactiveRipple());
    }
  }

  private createInactiveSplash(): SplashParticle {
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      color: 0xffffff,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(this.splashGeometry, material);
    mesh.visible = false;
    this.scene.add(mesh);

    return {
      mesh,
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: 1,
      startColor: new THREE.Color(),
      endColor: new THREE.Color(),
      active: false,
      gravity: -3.0,
      trail: null,
      trailPositions: []
    };
  }

  private createInactiveRipple(): RippleRing {
    const geometry = new THREE.RingGeometry(0.08, 0.1, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.002;
    mesh.visible = false;
    this.scene.add(mesh);

    return {
      mesh,
      life: 0,
      maxLife: 1.5,
      startRadius: 0.1,
      endRadius: 0.8,
      active: false
    };
  }

  public setCurrentMaterial(mat: MaterialType): void {
    this.currentMaterial = mat;
  }

  public handleCollision(event: CollisionEvent): void {
    const particleCount = event.isManual ? 30 : 15;
    const speedMultiplier = event.isManual ? 1 : 0.6;

    for (let i = 0; i < particleCount; i++) {
      this.spawnSplash(event.x, event.z, event.material, speedMultiplier);
    }

    this.spawnRipple(event.x, event.z, event.material);
  }

  private spawnSplash(x: number, z: number, materialType: MaterialType, speedMult: number): void {
    let splash: SplashParticle | undefined;

    if (this.activeSplashes.length >= SPLASH_MAX) {
      splash = this.activeSplashes.shift();
      if (splash) {
        this.resetSplash(splash);
        this.splashPool.push(splash);
      }
    }

    if (!splash) {
      splash = this.splashPool.pop();
    }

    if (!splash) return;

    const matColor = new THREE.Color(MATERIALS[materialType].color);
    splash.startColor.copy(matColor);
    splash.endColor.copy(matColor).lerp(new THREE.Color(0xffffff), 0.3);

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.4 + Math.PI * 0.1;
    const speed = (0.3 + Math.random() * 0.5) * speedMult;

    splash.velocity.set(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.cos(phi) * speed * 0.8,
      Math.sin(phi) * Math.sin(theta) * speed
    );

    splash.mesh.position.set(x, 0.01, z);
    splash.life = 0;
    splash.maxLife = 0.8 + Math.random() * 0.6;
    splash.gravity = -2.5 - Math.random() * 1.5;
    splash.active = true;

    const mat = splash.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.9;
    mat.color.copy(splash.startColor);
    mat.transparent = true;
    mat.depthWrite = false;
    splash.mesh.visible = true;

    splash.trailPositions = [];
    splash.trailPositions.push(new THREE.Vector3(x, 0.01, z));

    this.activeSplashes.push(splash);
  }

  private resetSplash(splash: SplashParticle): void {
    splash.active = false;
    splash.mesh.visible = false;
    const mat = splash.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0;

    if (splash.trail) {
      this.scene.remove(splash.trail);
      splash.trail.geometry.dispose();
      (splash.trail.material as THREE.Material).dispose();
      splash.trail = null;
    }
    splash.trailPositions = [];
  }

  private spawnRipple(x: number, z: number, materialType: MaterialType): void {
    let ripple: RippleRing | undefined;

    if (this.activeRipples.length >= RIPPLE_MAX) {
      ripple = this.activeRipples.shift();
      if (ripple) {
        this.resetRipple(ripple);
        this.ripplePool.push(ripple);
      }
    }

    if (!ripple) {
      ripple = this.ripplePool.pop();
    }

    if (!ripple) return;

    ripple.mesh.position.set(x, 0.005, z);
    ripple.life = 0;
    ripple.maxLife = 1.5;
    ripple.startRadius = 0.1;
    ripple.endRadius = 0.8;
    ripple.active = true;

    const mat = ripple.mesh.material as THREE.MeshBasicMaterial;
    mat.color.set(MATERIALS[materialType].color);
    mat.opacity = 0.7;
    mat.transparent = true;
    mat.depthWrite = false;
    ripple.mesh.visible = true;

    this.updateRippleGeometry(ripple, ripple.startRadius);

    this.activeRipples.push(ripple);
  }

  private resetRipple(ripple: RippleRing): void {
    ripple.active = false;
    ripple.mesh.visible = false;
    const mat = ripple.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0;
  }

  private updateRippleGeometry(ripple: RippleRing, radius: number): void {
    const oldGeom = ripple.mesh.geometry as THREE.RingGeometry;
    const innerR = Math.max(0.02, radius * 0.85);
    const outerR = radius;

    oldGeom.dispose();
    const newGeom = new THREE.RingGeometry(innerR, outerR, 48);
    ripple.mesh.geometry = newGeom;
  }

  public update(deltaTime: number): void {
    this.updateSplashes(deltaTime);
    this.updateRipples(deltaTime);
  }

  private updateSplashes(dt: number): void {
    for (let i = this.activeSplashes.length - 1; i >= 0; i--) {
      const s = this.activeSplashes[i];
      if (!s.active) continue;

      s.life += dt;

      if (s.life >= s.maxLife || s.mesh.position.y < -0.5) {
        this.resetSplash(s);
        this.splashPool.push(s);
        this.activeSplashes.splice(i, 1);
        continue;
      }

      s.velocity.y += s.gravity * dt;
      s.mesh.position.addScaledVector(s.velocity, dt);

      if (s.mesh.position.y <= 0.005) {
        s.mesh.position.y = 0.005;
        s.velocity.y *= -0.2;
        s.velocity.x *= 0.7;
        s.velocity.z *= 0.7;
        if (Math.abs(s.velocity.y) < 0.1) {
          s.velocity.set(0, 0, 0);
        }
      }

      const t = s.life / s.maxLife;
      const mat = s.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.9 * (1 - t);
      const col = new THREE.Color().copy(s.startColor).lerp(s.endColor, t);
      mat.color.copy(col);

      if (this.trailEnabled) {
        s.trailPositions.push(s.mesh.position.clone());
        if (s.trailPositions.length > TRAIL_MAX_POINTS) {
          s.trailPositions.shift();
        }

        if (s.trailPositions.length >= 2) {
          if (s.trail) {
            this.scene.remove(s.trail);
            s.trail.geometry.dispose();
            (s.trail.material as THREE.Material).dispose();
          }

          const positions = new Float32Array(s.trailPositions.length * 3);
          s.trailPositions.forEach((p, idx) => {
            positions[idx * 3] = p.x;
            positions[idx * 3 + 1] = p.y;
            positions[idx * 3 + 2] = p.z;
          });

          const trailGeom = new THREE.BufferGeometry();
          trailGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

          const trailMat = new THREE.LineBasicMaterial({
            color: mat.color.clone(),
            transparent: true,
            opacity: mat.opacity * 0.5,
            depthWrite: false
          });

          s.trail = new THREE.Line(trailGeom, trailMat);
          this.scene.add(s.trail);
        }
      }
    }
  }

  private updateRipples(dt: number): void {
    for (let i = this.activeRipples.length - 1; i >= 0; i--) {
      const r = this.activeRipples[i];
      if (!r.active) continue;

      r.life += dt;

      if (r.life >= r.maxLife) {
        this.resetRipple(r);
        this.ripplePool.push(r);
        this.activeRipples.splice(i, 1);
        continue;
      }

      const t = r.life / r.maxLife;
      const currentRadius = r.startRadius + (r.endRadius - r.startRadius) * t;

      this.updateRippleGeometry(r, currentRadius);

      const mat = r.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.7 * (1 - t);
    }
  }

  public clearAll(): void {
    for (let i = this.activeSplashes.length - 1; i >= 0; i--) {
      const s = this.activeSplashes[i];
      this.resetSplash(s);
      this.splashPool.push(s);
    }
    this.activeSplashes.length = 0;

    for (let i = this.activeRipples.length - 1; i >= 0; i--) {
      const r = this.activeRipples[i];
      this.resetRipple(r);
      this.ripplePool.push(r);
    }
    this.activeRipples.length = 0;
  }

  public getActiveSplashCount(): number {
    return this.activeSplashes.length;
  }

  public getActiveRippleCount(): number {
    return this.activeRipples.length;
  }

  public getCurrentMaterial(): MaterialType {
    return this.currentMaterial;
  }

  public dispose(): void {
    this.clearAll();

    for (const s of this.splashPool) {
      this.scene.remove(s.mesh);
      s.mesh.geometry.dispose();
      (s.mesh.material as THREE.Material).dispose();
    }
    this.splashPool.length = 0;

    for (const r of this.ripplePool) {
      this.scene.remove(r.mesh);
      r.mesh.geometry.dispose();
      (r.mesh.material as THREE.Material).dispose();
    }
    this.ripplePool.length = 0;

    this.splashGeometry.dispose();
  }
}
