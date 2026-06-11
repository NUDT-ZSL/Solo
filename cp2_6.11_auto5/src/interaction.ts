import * as THREE from 'three';
import { Kaleidoscope } from './kaleidoscope';

interface CameraSpherical {
  theta: number;
  phi: number;
  radius: number;
}

interface PhysicsState {
  theta: { velocity: number; target: number };
  phi: { velocity: number; target: number };
  radius: { velocity: number; target: number };
}

const DAMPING_TIME = 0.3;
const SOFT_BOUNDARY_STRENGTH = 8;
const PHI_MIN = -Math.PI / 3;
const PHI_MAX = Math.PI / 3;
const RADIUS_MIN = 2;
const RADIUS_MAX = 10;
const DRAG_SENSITIVITY = 0.008;
const ZOOM_SENSITIVITY = 0.0015;

const INITIAL_STATE: CameraSpherical = {
  theta: 0,
  phi: 0,
  radius: 5
};

export class InteractionController {
  private camera: THREE.PerspectiveCamera;
  private kaleidoscope: Kaleidoscope;
  private container: HTMLElement;
  private raycaster: THREE.Raycaster;
  private mouseNormalized: THREE.Vector2;
  private mouseScreen: { x: number; y: number };

  private spherical: CameraSpherical;
  private physics: PhysicsState;
  private isDragging: boolean = false;
  private lastDragPos: { x: number; y: number };

  private speedSlider: HTMLInputElement;
  private axesSlider: HTMLInputElement;
  private colorSlider: HTMLInputElement;
  private speedValue: HTMLElement;
  private axesValue: HTMLElement;
  private colorValue: HTMLElement;
  private resetButton: HTMLElement;
  private tooltip: HTMLElement;
  private tipAngle: HTMLElement;
  private tipColorHex: HTMLElement;
  private tipSwatch: HTMLElement;
  private tipGroup: HTMLElement;

  private hoveredMesh: THREE.Mesh | null = null;
  private resetting: boolean = false;
  private resetStartTime: number = 0;
  private resetDuration: number = 1500;
  private resetStartState: CameraSpherical;

  constructor(
    camera: THREE.PerspectiveCamera,
    kaleidoscope: Kaleidoscope,
    container: HTMLElement
  ) {
    this.camera = camera;
    this.kaleidoscope = kaleidoscope;
    this.container = container;

    this.raycaster = new THREE.Raycaster();
    this.mouseNormalized = new THREE.Vector2();
    this.mouseScreen = { x: 0, y: 0 };

    this.spherical = { ...INITIAL_STATE };
    this.physics = {
      theta: { velocity: 0, target: INITIAL_STATE.theta },
      phi: { velocity: 0, target: INITIAL_STATE.phi },
      radius: { velocity: 0, target: INITIAL_STATE.radius }
    };
    this.lastDragPos = { x: 0, y: 0 };
    this.resetStartState = { ...INITIAL_STATE };

    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.axesSlider = document.getElementById('axes-slider') as HTMLInputElement;
    this.colorSlider = document.getElementById('color-slider') as HTMLInputElement;
    this.speedValue = document.getElementById('speed-value')!;
    this.axesValue = document.getElementById('axes-value')!;
    this.colorValue = document.getElementById('color-value')!;
    this.resetButton = document.getElementById('reset-btn')!;
    this.tooltip = document.getElementById('info-tooltip')!;
    this.tipAngle = document.getElementById('tip-angle')!;
    this.tipColorHex = document.getElementById('tip-color-hex')!;
    this.tipSwatch = document.getElementById('tip-swatch')!;
    this.tipGroup = document.getElementById('tip-group')!;

    this.updateSliderLabels();
    this.bindEvents();
    this.updateCameraPosition();
  }

  private bindEvents(): void {
    this.container.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.container.addEventListener('wheel', this.onWheel, { passive: false });
    this.container.addEventListener('touchstart', this.onTouchStart, { passive: false });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd);

    this.speedSlider.addEventListener('input', this.onSpeedChange);
    this.axesSlider.addEventListener('input', this.onAxesChange);
    this.colorSlider.addEventListener('input', this.onColorChange);

    this.resetButton.addEventListener('click', this.onResetClick);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.lastDragPos = { x: e.clientX, y: e.clientY };
    this.physics.theta.velocity = 0;
    this.physics.phi.velocity = 0;
    document.body.classList.add('dragging');
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.mouseScreen = { x: e.clientX, y: e.clientY };

    const rect = this.container.getBoundingClientRect();
    this.mouseNormalized.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNormalized.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isDragging) {
      const dx = e.clientX - this.lastDragPos.x;
      const dy = e.clientY - this.lastDragPos.y;

      this.physics.theta.target -= dx * DRAG_SENSITIVITY;
      this.physics.phi.target += dy * DRAG_SENSITIVITY;

      this.physics.phi.target = Math.max(
        PHI_MIN - 0.3,
        Math.min(PHI_MAX + 0.3, this.physics.phi.target)
      );

      this.physics.theta.velocity = -dx * DRAG_SENSITIVITY * 6;
      this.physics.phi.velocity = dy * DRAG_SENSITIVITY * 6;

      this.lastDragPos = { x: e.clientX, y: e.clientY };
    }

    this.updateTooltipPosition();
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
    document.body.classList.remove('dragging');
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const delta = e.deltaY * ZOOM_SENSITIVITY;
    this.physics.radius.target += delta;
    this.physics.radius.target = Math.max(
      RADIUS_MIN,
      Math.min(RADIUS_MAX, this.physics.radius.target)
    );
    this.physics.radius.velocity = -delta * 4;
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastDragPos = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
      this.physics.theta.velocity = 0;
      this.physics.phi.velocity = 0;
      e.preventDefault();
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();

    const touch = e.touches[0];
    const dx = touch.clientX - this.lastDragPos.x;
    const dy = touch.clientY - this.lastDragPos.y;

    this.physics.theta.target -= dx * DRAG_SENSITIVITY;
    this.physics.phi.target += dy * DRAG_SENSITIVITY;
    this.physics.phi.target = Math.max(
      PHI_MIN - 0.3,
      Math.min(PHI_MAX + 0.3, this.physics.phi.target)
    );

    this.lastDragPos = { x: touch.clientX, y: touch.clientY };
    this.mouseScreen = { x: touch.clientX, y: touch.clientY };

    const rect = this.container.getBoundingClientRect();
    this.mouseNormalized.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNormalized.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
  };

  private onTouchEnd = (): void => {
    this.isDragging = false;
  };

  private onSpeedChange = (): void => {
    const value = parseFloat(this.speedSlider.value);
    this.kaleidoscope.setParam('rotationSpeed', value);
    this.speedValue.textContent = value.toFixed(1);
  };

  private onAxesChange = (): void => {
    const value = parseInt(this.axesSlider.value, 10);
    this.kaleidoscope.setParam('symmetryAxes', value);
    this.axesValue.textContent = value.toString();
  };

  private onColorChange = (): void => {
    const value = parseFloat(this.colorSlider.value);
    this.kaleidoscope.setParam('colorOffset', value);
    this.colorValue.textContent = value.toFixed(1);
  };

  private onResetClick = (): void => {
    this.resetButton.classList.add('spinning');
    setTimeout(() => this.resetButton.classList.remove('spinning'), 500);

    this.resetting = true;
    this.resetStartTime = performance.now();
    this.resetStartState = {
      theta: this.spherical.theta,
      phi: this.spherical.phi,
      radius: this.spherical.radius
    };

    this.physics.theta.velocity = 0;
    this.physics.phi.velocity = 0;
    this.physics.radius.velocity = 0;

    this.speedSlider.value = '1';
    this.axesSlider.value = '3';
    this.colorSlider.value = '0';
    this.updateSliderLabels();

    this.kaleidoscope.reset();
  };

  private updateSliderLabels(): void {
    this.speedValue.textContent = parseFloat(this.speedSlider.value).toFixed(1);
    this.axesValue.textContent = this.axesSlider.value;
    this.colorValue.textContent = parseFloat(this.colorSlider.value).toFixed(1);
  }

  public update(deltaTime: number, meshes: THREE.Mesh[]): void {
    if (this.resetting) {
      this.updateReset();
    } else {
      this.updatePhysics(deltaTime);
    }

    this.updateCameraPosition();
    this.updateHover(meshes);
  }

  private updatePhysics(dt: number): void {
    if (dt > 0.1) dt = 0.1;

    this.spherical.theta = this.physics.theta.target;

    if (!this.isDragging) {
      this.spherical.theta += this.physics.theta.velocity * dt;
      this.physics.theta.velocity *= Math.exp(-dt / DAMPING_TIME);
    }

    if (!this.isDragging) {
      this.spherical.phi += this.physics.phi.velocity * dt;
      this.physics.phi.velocity *= Math.exp(-dt / DAMPING_TIME);
    } else {
      this.spherical.phi = this.physics.phi.target;
    }

    if (this.spherical.phi > PHI_MAX) {
      const excess = this.spherical.phi - PHI_MAX;
      const force = -excess * SOFT_BOUNDARY_STRENGTH;
      this.physics.phi.velocity += force * dt;
    } else if (this.spherical.phi < PHI_MIN) {
      const excess = PHI_MIN - this.spherical.phi;
      const force = excess * SOFT_BOUNDARY_STRENGTH;
      this.physics.phi.velocity += force * dt;
    }

    this.spherical.radius += this.physics.radius.velocity * dt;
    this.physics.radius.velocity *= Math.exp(-dt / DAMPING_TIME);

    if (this.spherical.radius > RADIUS_MAX) {
      const excess = this.spherical.radius - RADIUS_MAX;
      const force = -excess * SOFT_BOUNDARY_STRENGTH;
      this.physics.radius.velocity += force * dt;
    } else if (this.spherical.radius < RADIUS_MIN) {
      const excess = RADIUS_MIN - this.spherical.radius;
      const force = excess * SOFT_BOUNDARY_STRENGTH;
      this.physics.radius.velocity += force * dt;
    }

    this.physics.theta.target = this.spherical.theta;
    this.physics.phi.target = this.spherical.phi;
    this.physics.radius.target = this.spherical.radius;
  }

  private updateReset(): void {
    const elapsed = performance.now() - this.resetStartTime;
    const progress = Math.min(elapsed / this.resetDuration, 1);
    const eased = this.easeInOutCubic(progress);

    this.spherical.theta = this.lerpAngle(
      this.resetStartState.theta,
      INITIAL_STATE.theta,
      eased
    );
    this.spherical.phi = this.lerpAngle(
      this.resetStartState.phi,
      INITIAL_STATE.phi,
      eased
    );
    this.spherical.radius = THREE.MathUtils.lerp(
      this.resetStartState.radius,
      INITIAL_STATE.radius,
      eased
    );

    if (progress >= 1) {
      this.resetting = false;
      this.physics.theta.target = INITIAL_STATE.theta;
      this.physics.phi.target = INITIAL_STATE.phi;
      this.physics.radius.target = INITIAL_STATE.radius;
    }
  }

  private lerpAngle(a: number, b: number, t: number): number {
    const diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    return a + diff * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private updateCameraPosition(): void {
    const { theta, phi, radius } = this.spherical;

    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.cos(theta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private updateHover(meshes: THREE.Mesh[]): void {
    if (this.isDragging) {
      if (this.hoveredMesh) {
        this.hideTooltip();
        this.hoveredMesh = null;
      }
      return;
    }

    this.raycaster.setFromCamera(this.mouseNormalized, this.camera);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      if (mesh !== this.hoveredMesh) {
        this.hoveredMesh = mesh;
        this.updateTooltipContent(mesh);
        this.showTooltip();
      }
    } else {
      if (this.hoveredMesh) {
        this.hoveredMesh = null;
        this.hideTooltip();
      }
    }
  }

  private showTooltip(): void {
    this.tooltip.classList.add('visible');
  }

  private hideTooltip(): void {
    this.tooltip.classList.remove('visible');
  }

  private updateTooltipPosition(): void {
    const x = this.mouseScreen.x;
    const y = this.mouseScreen.y;

    this.tooltip.style.transform = 'translate(-50%, -120%)';
    this.tooltip.style.left = x + 'px';
    this.tooltip.style.top = y + 'px';
  }

  private updateTooltipContent(mesh: THREE.Mesh): void {
    const info = this.kaleidoscope.getPrismInfo(mesh);
    if (!info) return;

    const angleDeg = info.rotationAngle.toFixed(1);
    this.tipAngle.textContent = angleDeg + '°';
    this.tipColorHex.textContent = info.colorHex.toUpperCase();
    this.tipSwatch.style.backgroundColor = info.colorHex;
    this.tipGroup.textContent = info.group.toString();
  }

  public getHoveredMesh(): THREE.Mesh | null {
    return this.hoveredMesh;
  }

  public dispose(): void {
    this.container.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.container.removeEventListener('wheel', this.onWheel);
    this.container.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);

    this.speedSlider.removeEventListener('input', this.onSpeedChange);
    this.axesSlider.removeEventListener('input', this.onAxesChange);
    this.colorSlider.removeEventListener('input', this.onColorChange);
    this.resetButton.removeEventListener('click', this.onResetClick);
  }
}
