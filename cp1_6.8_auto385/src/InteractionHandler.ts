import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';

export class InteractionHandler {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private particleSystem: ParticleSystem;

  private mouseNDC: THREE.Vector2;
  private mouseWorldPos: THREE.Vector3;
  private targetYaw: number;
  private targetPitch: number;
  private currentYaw: number;
  private currentPitch: number;
  private cameraZ: number;
  private targetCameraZ: number;
  private raycaster: THREE.Raycaster;

  private isPointerDown: boolean;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    particleSystem: ParticleSystem
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.particleSystem = particleSystem;

    this.mouseNDC = new THREE.Vector2(0, 0);
    this.mouseWorldPos = new THREE.Vector3();
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.currentYaw = 0;
    this.currentPitch = 0;
    this.cameraZ = 40;
    this.targetCameraZ = 40;
    this.raycaster = new THREE.Raycaster();
    this.isPointerDown = false;

    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.addEventListener('click', this.onClick.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), {
      passive: false,
    });
    this.domElement.addEventListener('pointerdown', () => {
      this.isPointerDown = true;
    });
    this.domElement.addEventListener('pointerup', () => {
      this.isPointerDown = false;
    });
  }

  private onMouseMove(e: MouseEvent): void {
    this.mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.targetYaw = -this.mouseNDC.x * 0.25;
    this.targetPitch = this.mouseNDC.y * 0.15;

    this.updateMouseWorldPos();
  }

  private updateMouseWorldPos(): void {
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const dir = this.raycaster.ray.direction;
    const origin = this.raycaster.ray.origin;

    const t = 15 / Math.max(Math.abs(dir.z), 0.01);
    this.mouseWorldPos.copy(origin).add(dir.clone().multiplyScalar(t));
  }

  private onClick(_e: MouseEvent): void {
    const stars = this.particleSystem.getConstellationStars();
    if (stars.length === 0) return;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);

    let closestStar: THREE.Vector3 | null = null;
    let closestDist = Infinity;

    for (const star of stars) {
      const screenPos = star.clone().project(this.camera);
      const dx = screenPos.x - this.mouseNDC.x;
      const dy = screenPos.y - this.mouseNDC.y;
      const dist = dx * dx + dy * dy;
      if (dist < closestDist && dist < 0.05) {
        closestDist = dist;
        closestStar = star;
      }
    }

    if (closestStar) {
      this.particleSystem.triggerBurst(closestStar);
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.targetCameraZ += e.deltaY * 0.03;
    this.targetCameraZ = THREE.MathUtils.clamp(
      this.targetCameraZ,
      -60,
      70
    );
  }

  update(): void {
    this.currentYaw = THREE.MathUtils.lerp(this.currentYaw, this.targetYaw, 0.06);
    this.currentPitch = THREE.MathUtils.lerp(
      this.currentPitch,
      this.targetPitch,
      0.06
    );
    this.cameraZ = THREE.MathUtils.lerp(this.cameraZ, this.targetCameraZ, 0.05);

    this.camera.position.set(0, 0, this.cameraZ);
    this.camera.rotation.set(this.currentPitch, this.currentYaw, 0, 'YXZ');
  }

  resetView(): void {
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.targetCameraZ = 40;
    this.mouseNDC.set(0, 0);
  }

  getMouseWorldPos(): THREE.Vector3 {
    return this.mouseWorldPos;
  }
}
