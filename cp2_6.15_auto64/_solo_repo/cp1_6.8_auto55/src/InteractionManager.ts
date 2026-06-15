import * as THREE from 'three';
import { AuroraEngine } from './AuroraEngine';
import { computeAuroraIntensity, computeColorTemperature, computeWaveFrequency } from './AuroraPhysics';

export interface AuroraInfoData {
  intensity: number;
  colorTemperature: number;
  waveFrequency: number;
  worldPos: { x: number; y: number; z: number };
}

type BurstCallback = (data: AuroraInfoData) => void;

export class InteractionManager {
  private engine: AuroraEngine;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isDragging: boolean;
  private previousMouse: { x: number; y: number };
  private spherical: THREE.Spherical;
  private target: THREE.Vector3;
  private onBurstCallback: BurstCallback | null;
  private enabled: boolean;

  constructor(engine: AuroraEngine) {
    this.engine = engine;
    this.camera = engine.getCamera();
    this.renderer = engine.getRenderer();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.isDragging = false;
    this.previousMouse = { x: 0, y: 0 };
    this.onBurstCallback = null;
    this.enabled = true;

    this.target = new THREE.Vector3(0, 8, 0);

    const offset = this.camera.position.clone().sub(this.target);
    this.spherical = new THREE.Spherical();
    this.spherical.setFromVector3(offset);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mouseleave', this.onMouseUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('click', this.onClick);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  onBurst(cb: BurstCallback): void {
    this.onBurstCallback = cb;
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (!this.enabled) return;
    this.isDragging = true;
    this.previousMouse = { x: e.clientX, y: e.clientY };
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.enabled || !this.isDragging) return;
    const dx = e.clientX - this.previousMouse.x;
    const dy = e.clientY - this.previousMouse.y;
    this.spherical.theta -= dx * 0.005;
    this.spherical.phi = Math.max(0.3, Math.min(Math.PI - 0.3, this.spherical.phi + dy * 0.005));
    this.previousMouse = { x: e.clientX, y: e.clientY };
    this.updateCamera();
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    if (!this.enabled) return;
    e.preventDefault();
    this.spherical.radius = Math.max(8, Math.min(60, this.spherical.radius + e.deltaY * 0.02));
    this.updateCamera();
  };

  private onClick = (e: MouseEvent): void => {
    if (!this.enabled || this.isDragging) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const scene = this.engine.getScene();
    const intersects = this.raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const worldPos = hit.point.clone();

      const distToAurora = Math.abs(worldPos.y - 8);
      if (distToAurora < 10) {
        this.engine.triggerBurst(worldPos);

        if (this.onBurstCallback) {
          const time = this.engine.getClock().getElapsedTime();
          const params = this.engine.getParams();
          const intensity = computeAuroraIntensity(worldPos.x, worldPos.z, time, params);
          const colorTemp = computeColorTemperature(intensity, time);
          const waveFreq = computeWaveFrequency(time, params);
          this.onBurstCallback({
            intensity: Math.round(intensity * 100) / 100,
            colorTemperature: Math.round(colorTemp),
            waveFrequency: Math.round(waveFreq * 100) / 100,
            worldPos: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
          });
        }
      }
    }
  };

  private updateCamera(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  resetView(): void {
    this.spherical.radius = 25;
    this.spherical.theta = 0;
    this.spherical.phi = Math.PI / 2.2;
    this.updateCamera();
  }

  dispose(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('mousemove', this.onMouseMove);
    canvas.removeEventListener('mouseup', this.onMouseUp);
    canvas.removeEventListener('mouseleave', this.onMouseUp);
    canvas.removeEventListener('wheel', this.onWheel);
    canvas.removeEventListener('click', this.onClick);
  }
}
