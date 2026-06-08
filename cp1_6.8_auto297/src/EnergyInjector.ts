import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';
import {
  INJECTION_RADIUS,
  INJECTION_STRENGTH_DEFAULT,
  SHOCKWAVE_DURATION,
  SHOCKWAVE_MAX_RADIUS,
  SHOCKWAVE_RING_WIDTH,
  COLOR_WARM,
} from './constants';

interface Shockwave {
  origin: THREE.Vector3;
  startTime: number;
  strength: number;
  mesh: THREE.Mesh;
  elapsed: number;
}

export class EnergyInjector {
  private particleSystem: ParticleSystem;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private raycaster: THREE.Raycaster;
  private injectionStrength: number;
  private shockwaves: Shockwave[];
  private isPointerDown: boolean;
  private pointerDownTime: number;

  constructor(particleSystem: ParticleSystem, scene: THREE.Scene, camera: THREE.Camera) {
    this.particleSystem = particleSystem;
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: 0.5 };
    this.injectionStrength = INJECTION_STRENGTH_DEFAULT;
    this.shockwaves = [];
    this.isPointerDown = false;
    this.pointerDownTime = 0;
  }

  onPointerDown(event: PointerEvent, container: HTMLElement): void {
    this.isPointerDown = true;
    this.pointerDownTime = performance.now() / 1000;

    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    this.raycaster.setFromCamera(mouse, this.camera as THREE.PerspectiveCamera);
    const ray = this.raycaster.ray;

    const t = -ray.origin.dot(ray.direction) / ray.direction.dot(ray.direction);
    const closestPoint = ray.origin.clone().add(ray.direction.clone().multiplyScalar(Math.max(t, 0)));

    const injectionOrigin = closestPoint.clone();
    if (injectionOrigin.length() > INJECTION_RADIUS * 2) {
      injectionOrigin.setLength(INJECTION_RADIUS * 0.5);
    }

    this.particleSystem.injectEnergy(injectionOrigin, this.injectionStrength, INJECTION_RADIUS);

    this.createShockwave(injectionOrigin, this.injectionStrength);
  }

  onPointerUp(): void {
    this.isPointerDown = false;
  }

  private createShockwave(origin: THREE.Vector3, strength: number): void {
    const geometry = new THREE.RingGeometry(0.1, 0.1 + SHOCKWAVE_RING_WIDTH, 64);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLOR_WARM.r, COLOR_WARM.g, COLOR_WARM.b),
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(origin);
    mesh.lookAt(this.camera.position);

    this.scene.add(mesh);

    this.shockwaves.push({
      origin: origin.clone(),
      startTime: performance.now() / 1000,
      strength,
      mesh,
      elapsed: 0,
    });
  }

  update(dt: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      sw.elapsed += dt;
      const progress = sw.elapsed / SHOCKWAVE_DURATION;

      if (progress >= 1) {
        toRemove.push(i);
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        (sw.mesh.material as THREE.Material).dispose();
        continue;
      }

      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentRadius = easedProgress * SHOCKWAVE_MAX_RADIUS * sw.strength;
      const innerRadius = Math.max(0, currentRadius - SHOCKWAVE_RING_WIDTH);

      sw.mesh.geometry.dispose();
      sw.mesh.geometry = new THREE.RingGeometry(innerRadius, currentRadius, 64);
      sw.mesh.lookAt(this.camera.position);

      const opacity = (1 - progress) * 0.8;
      (sw.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;

      const warmth = 1 - progress;
      (sw.mesh.material as THREE.MeshBasicMaterial).color.setRGB(
        COLOR_WARM.r * warmth + 0.2 * (1 - warmth),
        COLOR_WARM.g * warmth + 0.4 * (1 - warmth),
        COLOR_WARM.b * warmth + 1.0 * (1 - warmth),
      );
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.shockwaves.splice(toRemove[i], 1);
    }
  }

  setInjectionStrength(strength: number): void {
    this.injectionStrength = strength;
  }

  get isPressed(): boolean {
    return this.isPointerDown;
  }

  dispose(): void {
    for (const sw of this.shockwaves) {
      this.scene.remove(sw.mesh);
      sw.mesh.geometry.dispose();
      (sw.mesh.material as THREE.Material).dispose();
    }
    this.shockwaves = [];
  }
}
