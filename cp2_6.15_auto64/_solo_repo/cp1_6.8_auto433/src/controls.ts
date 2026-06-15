import * as THREE from 'three';
import { ParticleSystem } from './particles';
import { themes } from './colors';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Vector3 = new THREE.Vector3();
  private spherical: THREE.Spherical = new THREE.Spherical(30, Math.PI * 0.35, Math.PI * 0.25);
  private targetSpherical: THREE.Spherical = new THREE.Spherical(30, Math.PI * 0.35, Math.PI * 0.25);
  private isDragging: boolean = false;
  private lastMouse: { x: number; y: number } = { x: 0, y: 0 };
  private dampingFactor: number = 0.08;
  private canvas: HTMLCanvasElement;

  constructor(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
    this.camera = camera;
    this.canvas = canvas;
    this.updateCameraFromSpherical();
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseleave', this.onMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.isDragging = true;
      this.lastMouse.x = e.clientX;
      this.lastMouse.y = e.clientY;
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastMouse.x;
    const dy = e.clientY - this.lastMouse.y;
    this.lastMouse.x = e.clientX;
    this.lastMouse.y = e.clientY;

    this.targetSpherical.theta -= dx * 0.005;
    this.targetSpherical.phi -= dy * 0.005;
    this.targetSpherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetSpherical.phi));
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.targetSpherical.radius += e.deltaY * 0.02;
    this.targetSpherical.radius = Math.max(8, Math.min(60, this.targetSpherical.radius));
  };

  update(): void {
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * this.dampingFactor;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * this.dampingFactor;
    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * this.dampingFactor;
    this.updateCameraFromSpherical();
  }

  private updateCameraFromSpherical(): void {
    const pos = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(pos);
    this.camera.lookAt(this.target);
  }

  reset(): void {
    this.targetSpherical.set(30, Math.PI * 0.35, Math.PI * 0.25);
  }

  getClickWorldPosition(e: MouseEvent): THREE.Vector3 | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersection = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(plane, intersection);

    if (hit) {
      const dir = intersection.clone().sub(this.camera.position).normalize();
      const dist = this.spherical.radius;
      return this.camera.position.clone().add(dir.multiplyScalar(dist * 0.6));
    }
    return null;
  }

  dispose(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mouseleave', this.onMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }
}

export function bindControls(
  particleSystem: ParticleSystem,
  cameraController: CameraController,
  scene: THREE.Scene
): void {
  const sliderCount = document.getElementById('slider-count') as HTMLInputElement;
  const valCount = document.getElementById('val-count') as HTMLSpanElement;
  const sliderSpeed = document.getElementById('slider-speed') as HTMLInputElement;
  const valSpeed = document.getElementById('val-speed') as HTMLSpanElement;
  const selectTheme = document.getElementById('select-theme') as HTMLSelectElement;
  const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;

  if (sliderCount && valCount) {
    sliderCount.addEventListener('input', () => {
      const v = parseInt(sliderCount.value, 10);
      valCount.textContent = String(v);
      particleSystem.setParticleCount(v);
    });
  }

  if (sliderSpeed && valSpeed) {
    sliderSpeed.addEventListener('input', () => {
      const v = parseFloat(sliderSpeed.value);
      valSpeed.textContent = v.toFixed(1);
      particleSystem.setFlowSpeed(v);
    });
  }

  if (selectTheme) {
    selectTheme.addEventListener('change', () => {
      const themeKey = selectTheme.value;
      const theme = themes[themeKey];
      if (theme) {
        particleSystem.setTheme(theme);
        const [r, g, b] = theme.background;
        scene.background = new THREE.Color(r, g, b);
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      cameraController.reset();
    });
  }
}
