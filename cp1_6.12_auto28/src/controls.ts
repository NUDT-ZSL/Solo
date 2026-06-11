import * as THREE from 'three';
import { ParticleSystem } from './particleSystem';

const DAMPING_LERP = 0.12;
const HOVER_THRESHOLD_BASE = 8;

export class Controls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private particleSystem: ParticleSystem;

  private isRotating = false;
  private isPanning = false;
  private prevScreen = new THREE.Vector2();
  private curScreen = new THREE.Vector2();

  private spherical = new THREE.Spherical();
  private targetSpherical = new THREE.Spherical();
  private panOffset = new THREE.Vector3();
  private targetPanOffset = new THREE.Vector3();
  private focusPoint = new THREE.Vector3();

  private tooltip: HTMLElement;
  private raycaster = new THREE.Raycaster();
  private mouseNDC = new THREE.Vector2();

  private lastTime = 0;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, particleSystem: ParticleSystem) {
    this.camera = camera;
    this.domElement = domElement;
    this.particleSystem = particleSystem;
    this.tooltip = document.getElementById('tooltip')!;

    const offset = new THREE.Vector3().subVectors(camera.position, this.focusPoint);
    this.spherical.setFromVector3(offset);
    this.targetSpherical.copy(this.spherical);
    if (this.targetSpherical.radius < 100) this.targetSpherical.radius = 350;
    this.spherical.copy(this.targetSpherical);

    this.raycaster.params.Points = { threshold: HOVER_THRESHOLD_BASE };

    this.domElement.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onMouseDown = (event: MouseEvent): void => {
    this.prevScreen.set(event.clientX, event.clientY);
    this.curScreen.set(event.clientX, event.clientY);
    if (event.button === 0) this.isRotating = true;
    else if (event.button === 2) this.isPanning = true;
  };

  private onMouseMove = (event: MouseEvent): void => {
    this.curScreen.set(event.clientX, event.clientY);

    if (this.isRotating) {
      const dx = (event.clientX - this.prevScreen.x) * 0.005;
      const dy = (event.clientY - this.prevScreen.y) * 0.005;
      this.targetSpherical.theta -= dx;
      this.targetSpherical.phi = Math.max(
        0.05,
        Math.min(Math.PI - 0.05, this.targetSpherical.phi - dy),
      );
      this.prevScreen.copy(this.curScreen);
    }

    if (this.isPanning) {
      const dx = (event.clientX - this.prevScreen.x) * 0.35;
      const dy = (event.clientY - this.prevScreen.y) * 0.35;
      const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
      this.targetPanOffset.addScaledVector(right, -dx);
      this.targetPanOffset.addScaledVector(up, dy);
      this.prevScreen.copy(this.curScreen);
    }

    this.updateHover(event);
  };

  private onMouseUp = (): void => {
    this.isRotating = false;
    this.isPanning = false;
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.targetSpherical.radius += event.deltaY * 0.12;
    this.targetSpherical.radius = Math.max(80, Math.min(900, this.targetSpherical.radius));
  };

  private updateHover(event: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      this.particleSystem.setHoveredIndex(-1);
      this.tooltip.style.display = 'none';
      return;
    }

    this.mouseNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);

    const camDist = this.focusPoint.clone()
      .add(this.panOffset)
      .distanceTo(this.camera.position);
    const adaptiveThreshold = Math.max(4, camDist * 0.035);
    this.raycaster.params.Points = { threshold: adaptiveThreshold };

    const intersects = this.raycaster.intersectObject(this.particleSystem.points, false);

    let bestIdx = -1;
    const MAX_WORLD_DIST = 20;
    const tmpPos = new THREE.Vector3();
    const camPos = this.camera.position;

    for (let i = 0; i < intersects.length; i++) {
      const hit = intersects[i];
      if (hit.index === undefined) continue;
      this.particleSystem.getPositionAt(hit.index, tmpPos);

      const particleWorldDist = tmpPos.distanceTo(camPos);
      const rayDist = hit.distance;
      const diff = Math.abs(particleWorldDist - rayDist);
      if (diff > MAX_WORLD_DIST) continue;

      bestIdx = hit.index;
      break;
    }

    this.particleSystem.setHoveredIndex(bestIdx);

    if (bestIdx >= 0) {
      const info = this.particleSystem.getParticleInfo(bestIdx);
      if (info) {
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = `${event.clientX + 16}px`;
        this.tooltip.style.top = `${event.clientY - 6}px`;
        this.tooltip.innerHTML =
          `<b style="color:#d0b0ff">#${info.index}</b><br>` +
          `Pos: (${info.x}, ${info.y}, ${info.z})<br>` +
          `Brightness: <b style="color:#ffe9a8">${info.brightness}</b>`;
      }
    } else {
      this.tooltip.style.display = 'none';
    }
  }

  update(time: number): void {
    if (this.lastTime === 0) this.lastTime = time;
    const dt = Math.min((time - this.lastTime) / 1000, 0.08);
    this.lastTime = time;

    const k = 1 - Math.pow(1 - DAMPING_LERP, dt * 60);

    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * k;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * k;
    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * k;
    this.panOffset.lerp(this.targetPanOffset, k);

    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    const focus = this.focusPoint.clone().add(this.panOffset);
    this.camera.position.copy(offset.add(focus));
    this.camera.lookAt(focus);
  }

  resetView(): void {
    this.targetSpherical.set(350, Math.PI / 2.4, 0);
    this.targetPanOffset.set(0, 0, 0);
  }
}
