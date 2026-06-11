import * as THREE from 'three';
import { ParticleSystem } from './particleSystem';

const DAMPING = 0.08;
const DAMPING_DURATION = 0.8;
const HOVER_DISTANCE = 20;

export class Controls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private particleSystem: ParticleSystem;

  private isRotating = false;
  private isPanning = false;
  private previousMouse = new THREE.Vector2();
  private currentMouse = new THREE.Vector2();

  private spherical = new THREE.Spherical();
  private targetSpherical = new THREE.Spherical();
  private panOffset = new THREE.Vector3();
  private targetPanOffset = new THREE.Vector3();

  private lookAt = new THREE.Vector3();
  private tooltip: HTMLElement;

  private raycaster = new THREE.Raycaster();
  private raycasterThreshold = 5;

  private dampingTime = 0;
  private lastTime = 0;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, particleSystem: ParticleSystem) {
    this.camera = camera;
    this.domElement = domElement;
    this.particleSystem = particleSystem;
    this.tooltip = document.getElementById('tooltip')!;

    const dist = camera.position.length();
    this.spherical.setFromVector3(camera.position);
    this.targetSpherical.copy(this.spherical);

    this.raycaster.params.Points = { threshold: this.raycasterThreshold };

    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onMouseDown(event: MouseEvent): void {
    this.previousMouse.set(event.clientX, event.clientY);
    this.currentMouse.set(event.clientX, event.clientY);

    if (event.button === 0) {
      this.isRotating = true;
    } else if (event.button === 2) {
      this.isPanning = true;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    this.currentMouse.set(event.clientX, event.clientY);

    if (this.isRotating) {
      const deltaX = (event.clientX - this.previousMouse.x) * 0.005;
      const deltaY = (event.clientY - this.previousMouse.y) * 0.005;

      this.targetSpherical.theta -= deltaX;
      this.targetSpherical.phi -= deltaY;
      this.targetSpherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetSpherical.phi));

      this.previousMouse.set(event.clientX, event.clientY);
      this.dampingTime = DAMPING_DURATION;
    }

    if (this.isPanning) {
      const deltaX = (event.clientX - this.previousMouse.x) * 0.3;
      const deltaY = (event.clientY - this.previousMouse.y) * 0.3;

      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      this.camera.getWorldDirection(new THREE.Vector3());
      right.setFromMatrixColumn(this.camera.matrixWorld, 0);
      up.setFromMatrixColumn(this.camera.matrixWorld, 1);

      this.targetPanOffset.add(right.multiplyScalar(-deltaX));
      this.targetPanOffset.add(up.multiplyScalar(deltaY));

      this.previousMouse.set(event.clientX, event.clientY);
      this.dampingTime = DAMPING_DURATION;
    }

    this.updateHover(event);
  }

  private onMouseUp(): void {
    this.isRotating = false;
    this.isPanning = false;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.targetSpherical.radius += event.deltaY * 0.1;
    this.targetSpherical.radius = Math.max(50, Math.min(800, this.targetSpherical.radius));
    this.dampingTime = DAMPING_DURATION;
  }

  private updateHover(event: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.particleSystem.points);

    if (intersects.length > 0) {
      const idx = intersects[0].index;
      if (idx !== undefined && idx >= 0) {
        const pos = this.particleSystem.getPositionAt(idx);
        const camPos = this.camera.position;
        const dist = pos.distanceTo(camPos);
        this.raycaster.params.Points = { threshold: Math.max(2, dist * 0.02) };

        if (pos.distanceTo(camPos) - this.targetSpherical.radius < HOVER_DISTANCE) {
          this.particleSystem.setHoveredIndex(idx);
          const info = this.particleSystem.getParticleInfo(idx);
          if (info) {
            this.tooltip.style.display = 'block';
            this.tooltip.style.left = `${event.clientX + 15}px`;
            this.tooltip.style.top = `${event.clientY - 10}px`;
            this.tooltip.innerHTML = `#${info.index}<br/>Pos: (${info.x}, ${info.y}, ${info.z})<br/>Brightness: ${info.brightness}`;
          }
          return;
        }
      }
    }

    this.particleSystem.setHoveredIndex(-1);
    this.tooltip.style.display = 'none';
  }

  update(time: number): void {
    if (this.lastTime === 0) this.lastTime = time;
    const delta = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    const lerpFactor = 1 - Math.pow(1 - DAMPING, delta * 60);

    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * lerpFactor;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * lerpFactor;
    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * lerpFactor;

    this.panOffset.lerp(this.targetPanOffset, lerpFactor);

    if (this.dampingTime > 0) {
      this.dampingTime -= delta;
    }

    const pos = new THREE.Vector3().setFromSpherical(this.spherical).add(this.panOffset);
    this.camera.position.copy(pos);
    this.camera.lookAt(this.lookAt.clone().add(this.panOffset));
  }

  resetView(): void {
    this.targetSpherical.set(350, Math.PI / 2.5, 0);
    this.targetPanOffset.set(0, 0, 0);
    this.dampingTime = DAMPING_DURATION;
  }
}
