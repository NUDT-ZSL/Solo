import * as THREE from 'three';
import { Kaleidoscope, PrismParams } from './kaleidoscope';

export interface CameraState {
  theta: number;
  phi: number;
  distance: number;
}

export class InteractionController {
  private camera: THREE.PerspectiveCamera;
  private kaleidoscope: Kaleidoscope;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private isDragging: boolean = false;
  private previousMouseX: number = 0;
  private previousMouseY: number = 0;

  private targetCamera: CameraState;
  private currentCamera: CameraState;

  private velocityX: number = 0;
  private velocityY: number = 0;
  private damping: number = 0.95;

  private minDistance: number = 2;
  private maxDistance: number = 10;
  private minPhi: number = Math.PI / 6;
  private maxPhi: number = Math.PI * 5 / 6;

  private initialCamera: CameraState = {
    theta: 0,
    phi: Math.PI / 2,
    distance: 5
  };

  private isResetting: boolean = false;
  private resetStartTime: number = 0;
  private resetDuration: number = 1500;
  private resetStartCamera: CameraState = { theta: 0, phi: 0, distance: 0 };

  private onParamsChange: (params: Partial<PrismParams>) => void;
  private onReset: () => void;

  private hoveredMesh: THREE.Mesh | null = null;
  private tooltip: HTMLElement;
  private tooltipAngle: HTMLElement;
  private tooltipColor: HTMLElement;
  private tooltipGroup: HTMLElement;
  private tooltipOpacity: number = 0;
  private mouseX: number = 0;
  private mouseY: number = 0;

  private speedSlider: HTMLInputElement;
  private axesSlider: HTMLInputElement;
  private colorSlider: HTMLInputElement;
  private speedValue: HTMLElement;
  private axesValue: HTMLElement;
  private colorValue: HTMLElement;
  private resetButton: HTMLElement;

  constructor(
    camera: THREE.PerspectiveCamera,
    kaleidoscope: Kaleidoscope,
    renderer: THREE.WebGLRenderer,
    onParamsChange: (params: Partial<PrismParams>) => void,
    onReset: () => void
  ) {
    this.camera = camera;
    this.kaleidoscope = kaleidoscope;
    this.renderer = renderer;
    this.onParamsChange = onParamsChange;
    this.onReset = onReset;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.targetCamera = { ...this.initialCamera };
    this.currentCamera = { ...this.initialCamera };

    this.tooltip = document.getElementById('tooltip')!;
    this.tooltipAngle = document.getElementById('tooltip-angle')!;
    this.tooltipColor = document.getElementById('tooltip-color')!;
    this.tooltipGroup = document.getElementById('tooltip-group')!;

    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.axesSlider = document.getElementById('axes-slider') as HTMLInputElement;
    this.colorSlider = document.getElementById('color-slider') as HTMLInputElement;
    this.speedValue = document.getElementById('speed-value')!;
    this.axesValue = document.getElementById('axes-value')!;
    this.colorValue = document.getElementById('color-value')!;
    this.resetButton = document.getElementById('reset-button')!;

    this.setupEventListeners();
    this.updateCameraPosition();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));

    this.speedSlider.addEventListener('input', this.onSpeedChange.bind(this));
    this.axesSlider.addEventListener('input', this.onAxesChange.bind(this));
    this.colorSlider.addEventListener('input', this.onColorChange.bind(this));

    this.resetButton.addEventListener('click', this.onResetClick.bind(this));
  }

  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.previousMouseX = event.clientX;
    this.previousMouseY = event.clientY;
    this.velocityX = 0;
    this.velocityY = 0;
    this.isResetting = false;
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;

    if (this.isDragging) {
      const deltaX = event.clientX - this.previousMouseX;
      const deltaY = event.clientY - this.previousMouseY;

      const rotationSpeed = 0.005;
      this.targetCamera.theta -= deltaX * rotationSpeed;
      this.targetCamera.phi -= deltaY * rotationSpeed;

      this.targetCamera.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetCamera.phi));

      this.velocityX = deltaX;
      this.velocityY = deltaY;

      this.previousMouseX = event.clientX;
      this.previousMouseY = event.clientY;
    }

    this.updateMousePosition(event.clientX, event.clientY);
    this.checkHover();
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();

    const zoomSpeed = 0.001;
    const delta = event.deltaY * zoomSpeed;

    this.targetCamera.distance *= (1 + delta);
    this.targetCamera.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.targetCamera.distance));

    this.isResetting = false;
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      event.preventDefault();
      this.isDragging = true;
      this.previousMouseX = event.touches[0].clientX;
      this.previousMouseY = event.touches[0].clientY;
      this.velocityX = 0;
      this.velocityY = 0;
      this.isResetting = false;
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (this.isDragging && event.touches.length === 1) {
      event.preventDefault();
      const deltaX = event.touches[0].clientX - this.previousMouseX;
      const deltaY = event.touches[0].clientY - this.previousMouseY;

      const rotationSpeed = 0.005;
      this.targetCamera.theta -= deltaX * rotationSpeed;
      this.targetCamera.phi -= deltaY * rotationSpeed;

      this.targetCamera.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetCamera.phi));

      this.velocityX = deltaX;
      this.velocityY = deltaY;

      this.previousMouseX = event.touches[0].clientX;
      this.previousMouseY = event.touches[0].clientY;
    }
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private onSpeedChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.speedValue.textContent = value.toFixed(1);
    this.onParamsChange({ rotationSpeed: value });
  }

  private onAxesChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value);
    this.axesValue.textContent = value.toString();
    this.onParamsChange({ symmetryAxes: value });
  }

  private onColorChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.colorValue.textContent = value.toFixed(1);
    this.onParamsChange({ colorOffset: value });
  }

  private onResetClick(): void {
    this.isResetting = true;
    this.resetStartTime = performance.now();
    this.resetStartCamera = { ...this.currentCamera };

    this.resetButton.classList.add('rotating');
    setTimeout(() => {
      this.resetButton.classList.remove('rotating');
    }, 500);

    this.speedSlider.value = '1';
    this.axesSlider.value = '3';
    this.colorSlider.value = '0';
    this.speedValue.textContent = '1.0';
    this.axesValue.textContent = '3';
    this.colorValue.textContent = '0.0';

    this.onReset();
  }

  private updateMousePosition(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const meshes = this.kaleidoscope.getAllMeshes();
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      if (mesh !== this.hoveredMesh) {
        this.setHoveredMesh(mesh);
      }
    } else if (this.hoveredMesh) {
      this.setHoveredMesh(null);
    }
  }

  private setHoveredMesh(mesh: THREE.Mesh | null): void {
    this.hoveredMesh = mesh;

    if (mesh) {
      document.body.style.cursor = 'pointer';
    } else {
      document.body.style.cursor = 'default';
    }
  }

  public getHoveredMesh(): THREE.Mesh | null {
    return this.hoveredMesh;
  }

  public update(deltaTime: number): void {
    if (this.isResetting) {
      const elapsed = performance.now() - this.resetStartTime;
      const t = Math.min(elapsed / this.resetDuration, 1);
      const eased = this.easeInOutCubic(t);

      this.currentCamera.theta = THREE.MathUtils.lerp(this.resetStartCamera.theta, this.initialCamera.theta, eased);
      this.currentCamera.phi = THREE.MathUtils.lerp(this.resetStartCamera.phi, this.initialCamera.phi, eased);
      this.currentCamera.distance = THREE.MathUtils.lerp(this.resetStartCamera.distance, this.initialCamera.distance, eased);

      this.targetCamera = { ...this.currentCamera };

      if (t >= 1) {
        this.isResetting = false;
      }
    } else {
      if (!this.isDragging) {
        this.velocityX *= this.damping;
        this.velocityY *= this.damping;

        const rotationSpeed = 0.005;
        this.targetCamera.theta -= this.velocityX * rotationSpeed;
        this.targetCamera.phi -= this.velocityY * rotationSpeed;
      }

      this.enforceBoundsWithOvershoot();

      const lerpFactor = 1 - Math.pow(0.01, deltaTime * 60);
      this.currentCamera.theta = THREE.MathUtils.lerp(this.currentCamera.theta, this.targetCamera.theta, lerpFactor);
      this.currentCamera.phi = THREE.MathUtils.lerp(this.currentCamera.phi, this.targetCamera.phi, lerpFactor);
      this.currentCamera.distance = THREE.MathUtils.lerp(this.currentCamera.distance, this.targetCamera.distance, lerpFactor);
    }

    this.updateCameraPosition();
    this.kaleidoscope.setCameraDistance(this.currentCamera.distance);
    this.updateTooltip(deltaTime);
  }

  private updateTooltip(deltaTime: number): void {
    const targetOpacity = this.hoveredMesh ? 1 : 0;
    const fadeSpeed = 5;

    if (this.tooltipOpacity < targetOpacity) {
      this.tooltipOpacity = Math.min(targetOpacity, this.tooltipOpacity + deltaTime * fadeSpeed);
    } else if (this.tooltipOpacity > targetOpacity) {
      this.tooltipOpacity = Math.max(targetOpacity, this.tooltipOpacity - deltaTime * fadeSpeed);
    }

    if (this.tooltipOpacity > 0.01) {
      this.tooltip.style.opacity = this.tooltipOpacity.toString();
      this.tooltip.style.display = 'block';

      this.tooltip.style.left = (this.mouseX + 15) + 'px';
      this.tooltip.style.top = (this.mouseY + 15) + 'px';

      if (this.hoveredMesh) {
        const data = this.kaleidoscope.getPrismData(this.hoveredMesh);
        if (data) {
          this.tooltipAngle.textContent = data.angle.toFixed(1) + '°';
          this.tooltipColor.textContent = data.color;
          this.tooltipGroup.textContent = data.group.toString();
        }
      }
    } else {
      this.tooltip.style.opacity = '0';
      this.tooltip.style.display = 'none';
    }
  }

  private enforceBoundsWithOvershoot(): void {
    const overshootAmount = 0.2;

    if (this.targetCamera.phi < this.minPhi) {
      const overshoot = this.minPhi - this.targetCamera.phi;
      if (overshoot < overshootAmount) {
        const spring = 0.1 * (overshoot / overshootAmount);
        this.targetCamera.phi = this.minPhi - overshoot * (1 - spring);
      } else {
        this.targetCamera.phi = this.minPhi;
      }
    }
    if (this.targetCamera.phi > this.maxPhi) {
      const overshoot = this.targetCamera.phi - this.maxPhi;
      if (overshoot < overshootAmount) {
        const spring = 0.1 * (overshoot / overshootAmount);
        this.targetCamera.phi = this.maxPhi + overshoot * (1 - spring);
      } else {
        this.targetCamera.phi = this.maxPhi;
      }
    }

    if (this.targetCamera.distance < this.minDistance) {
      const overshoot = this.minDistance - this.targetCamera.distance;
      if (overshoot < 0.5) {
        const spring = 0.1 * (overshoot / 0.5);
        this.targetCamera.distance = this.minDistance - overshoot * (1 - spring);
      } else {
        this.targetCamera.distance = this.minDistance;
      }
    }
    if (this.targetCamera.distance > this.maxDistance) {
      const overshoot = this.targetCamera.distance - this.maxDistance;
      if (overshoot < 0.5) {
        const spring = 0.1 * (overshoot / 0.5);
        this.targetCamera.distance = this.maxDistance + overshoot * (1 - spring);
      } else {
        this.targetCamera.distance = this.maxDistance;
      }
    }
  }

  private updateCameraPosition(): void {
    const { theta, phi, distance } = this.currentCamera;

    const x = distance * Math.sin(phi) * Math.cos(theta);
    const y = distance * Math.cos(phi);
    const z = distance * Math.sin(phi) * Math.sin(theta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
