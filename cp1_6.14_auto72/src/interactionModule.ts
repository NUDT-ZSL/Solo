import * as THREE from 'three';
import EventBus from './eventBus';

export class InteractionModule {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private eventBus: EventBus;

  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };

  private spherical: THREE.Spherical = new THREE.Spherical();
  private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private minPolarAngle: number = (30 * Math.PI) / 180;
  private maxPolarAngle: number = (120 * Math.PI) / 180;
  private minDistance: number = 5;
  private maxDistance: number = 50;

  private isAnimating: boolean = false;
  private animationStartTime: number = 0;
  private animationDuration: number = 1500;
  private startSpherical: THREE.Spherical = new THREE.Spherical();
  private startTarget: THREE.Vector3 = new THREE.Vector3();
  private endSpherical: THREE.Spherical = new THREE.Spherical();
  private endTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();

  private tooltip: HTMLElement | null = null;
  private tooltipTimer: number | null = null;
  private tooltipWorldPos: THREE.Vector3 | null = null;
  private tooltipActive: boolean = false;

  private heatMapMesh: THREE.Mesh | null = null;
  private groundMesh: THREE.Mesh | null = null;

  private initialSpherical: THREE.Spherical = new THREE.Spherical();
  private initialTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    eventBus: EventBus
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.eventBus = eventBus;

    this.spherical.setFromVector3(camera.position.clone().sub(this.target));
    this.initialSpherical.copy(this.spherical);
  }

  public initialize(): void {
    this.tooltip = document.getElementById('tooltip');

    this.setupEventListeners();
    this.eventBus.on('visualization:initialized', (data: any) => {
      if (data.heatMapMesh) {
        this.heatMapMesh = data.heatMapMesh;
      }
      if (data.groundMesh) {
        this.groundMesh = data.groundMesh;
      }
    });

    this.eventBus.on('reset:camera', () => {
      this.resetCamera();
    });

    this.eventBus.on('interaction:temperatureRead', (data: any) => {
      this.showTemperatureTooltip(data.point, data.temperature);
    });
  }

  private setupEventListeners(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.addEventListener('mouseleave', this.onMouseUp.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.domElement.addEventListener('click', this.onClick.bind(this));

    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), {
      passive: false,
    });
    this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this), {
      passive: false,
    });
    this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    this.isDragging = true;
    this.previousMousePosition = { x: event.clientX, y: event.clientY };
    this.domElement.style.cursor = 'grabbing';
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) {
      this.domElement.style.cursor = 'grab';
      return;
    }

    const deltaX = event.clientX - this.previousMousePosition.x;
    const deltaY = event.clientY - this.previousMousePosition.y;

    this.previousMousePosition = { x: event.clientX, y: event.clientY };

    const rotateSpeed = 0.005;
    this.spherical.theta -= deltaX * rotateSpeed;
    this.spherical.phi -= deltaY * rotateSpeed;

    this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi));

    this.updateCameraPosition();
  }

  private onMouseUp(_event: MouseEvent): void {
    this.isDragging = false;
    this.domElement.style.cursor = 'grab';
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const zoomSpeed = 0.001;
    const delta = event.deltaY * zoomSpeed;

    this.spherical.radius *= 1 + delta;
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));

    this.updateCameraPosition();
  }

  private onClick(event: MouseEvent): void {
    if (this.isDragging) return;

    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const objects: THREE.Object3D[] = [];
    if (this.groundMesh) objects.push(this.groundMesh);
    if (this.heatMapMesh) objects.push(this.heatMapMesh);

    const intersects = this.raycaster.intersectObjects(objects, false);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.eventBus.emit('interaction:groundClicked', point);
    }
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      event.preventDefault();
      this.isDragging = true;
      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (!this.isDragging || event.touches.length !== 1) return;
    event.preventDefault();

    const deltaX = event.touches[0].clientX - this.previousMousePosition.x;
    const deltaY = event.touches[0].clientY - this.previousMousePosition.y;

    this.previousMousePosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };

    const rotateSpeed = 0.005;
    this.spherical.theta -= deltaX * rotateSpeed;
    this.spherical.phi -= deltaY * rotateSpeed;

    this.spherical.phi = Math.max(
      this.minPolarAngle,
      Math.min(this.maxPolarAngle, this.spherical.phi)
    );

    this.updateCameraPosition();
  }

  private onTouchEnd(_event: TouchEvent): void {
    this.isDragging = false;
  }

  private updateCameraPosition(): void {
    const position = new THREE.Vector3().setFromSpherical(this.spherical);
    position.add(this.target);
    this.camera.position.copy(position);
    this.camera.lookAt(this.target);
  }

  public resetCamera(): void {
    this.isAnimating = true;
    this.animationStartTime = performance.now();
    this.startSpherical.copy(this.spherical);
    this.startTarget.copy(this.target);

    this.endSpherical.copy(this.initialSpherical);
    this.endTarget.copy(this.initialTarget);
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  public update(_deltaTime: number): void {
    if (this.isAnimating) {
      const elapsed = performance.now() - this.animationStartTime;
      const t = Math.min(1, elapsed / this.animationDuration);
      const easedT = this.easeInOut(t);

      this.spherical.theta =
        this.startSpherical.theta +
        (this.endSpherical.theta - this.startSpherical.theta) * easedT;
      this.spherical.phi =
        this.startSpherical.phi +
        (this.endSpherical.phi - this.startSpherical.phi) * easedT;
      this.spherical.radius =
        this.startSpherical.radius +
        (this.endSpherical.radius - this.startSpherical.radius) * easedT;

      this.target.lerpVectors(this.startTarget, this.endTarget, easedT);

      this.updateCameraPosition();

      if (t >= 1) {
        this.isAnimating = false;
      }
    }

    this.updateTooltipPosition();
  }

  private showTemperatureTooltip(worldPoint: THREE.Vector3, temperature: number): void {
    if (!this.tooltip) return;

    this.tooltipWorldPos = worldPoint.clone();
    this.tooltipActive = true;
    this.tooltip.textContent = `${temperature.toFixed(1)}°C`;
    this.tooltip.classList.remove('hidden', 'fade-out');

    this.updateTooltipPosition();

    if (this.tooltipTimer) {
      clearTimeout(this.tooltipTimer);
    }

    this.tooltipTimer = window.setTimeout(() => {
      this.tooltip?.classList.add('fade-out');
      setTimeout(() => {
        this.tooltip?.classList.add('hidden');
        this.tooltip?.classList.remove('fade-out');
        this.tooltipActive = false;
      }, 500);
    }, 3000);
  }

  private updateTooltipPosition(): void {
    if (!this.tooltip || !this.tooltipWorldPos || !this.tooltipActive) return;

    const screenPos = this.tooltipWorldPos.clone().project(this.camera);

    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y - 10}px`;
    this.tooltip.style.transform = 'translate(-50%, -100%)';
  }

  public handleResize(): void {
  }

  public setHeatMapMesh(mesh: THREE.Mesh): void {
    this.heatMapMesh = mesh;
  }

  public setGroundMesh(mesh: THREE.Mesh): void {
    this.groundMesh = mesh;
  }

  public setInitialCameraPosition(position: THREE.Vector3, target: THREE.Vector3): void {
    this.target.copy(target);
    this.spherical.setFromVector3(position.clone().sub(target));
    this.initialSpherical.copy(this.spherical);
    this.initialTarget.copy(target);
    this.updateCameraPosition();
  }
}

export default InteractionModule;
