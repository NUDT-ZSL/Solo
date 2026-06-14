import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { StarField, ParticleInfo } from './StarField';
import { NetworkGenerator } from './NetworkGenerator';

export type InteractionEvent = 'particleSelect' | 'particleHover' | 'cameraChange';

export interface CameraState {
  azimuth: number;
  polar: number;
  distance: number;
}

type EventCallback = (info: ParticleInfo | null) => void;
type CameraCallback = (state: CameraState) => void;

export class InteractionController {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private starField: StarField;
  private networkGenerator: NetworkGenerator;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private controls: OrbitControls;
  private isDragging: boolean = false;
  private downPosition: { x: number; y: number } = { x: 0, y: 0 };
  private particleCallbacks: Set<EventCallback> = new Set();
  private hoverCallbacks: Set<EventCallback> = new Set();
  private cameraCallbacks: Set<CameraCallback> = new Set();
  private hoveredIndex: number | null = null;
  private container: HTMLElement;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    starField: StarField,
    networkGenerator: NetworkGenerator,
    container: HTMLElement
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.starField = starField;
    this.networkGenerator = networkGenerator;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: 0.1 };
    this.mouse = new THREE.Vector2();
    this.container = container;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.minPolarAngle = Math.PI / 2 - (60 * Math.PI) / 180;
    this.controls.maxPolarAngle = Math.PI / 2 + (60 * Math.PI) / 180;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.8;

    this.camera.position.set(0, 0, 20);
    this.camera.lookAt(0, 0, 0);

    this.bindEvents();
  }

  private bindEvents(): void {
    const domElement = this.renderer.domElement;

    domElement.addEventListener('pointerdown', this.onPointerDown);
    domElement.addEventListener('pointermove', this.onPointerMove);
    domElement.addEventListener('pointerup', this.onPointerUp);
    domElement.addEventListener('wheel', this.onWheel, { passive: false });
    domElement.addEventListener('click', this.onClick);

    this.controls.addEventListener('change', this.onControlsChange);
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.isDragging = false;
    this.downPosition = { x: e.clientX, y: e.clientY };
  };

  private onPointerMove = (e: PointerEvent): void => {
    const dx = e.clientX - this.downPosition.x;
    const dy = e.clientY - this.downPosition.y;
    if (Math.sqrt(dx * dx + dy * dy) > 3) {
      this.isDragging = true;
    }

    this.updateMouse(e);
    this.checkHover();
  };

  private onPointerUp = (_e: PointerEvent): void => {
    setTimeout(() => {
      this.isDragging = false;
    }, 10);
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    e.stopPropagation();
  };

  private onClick = (e: MouseEvent): void => {
    if (this.isDragging) return;

    this.updateMouse(e);

    const particle = this.pickParticle();
    if (particle !== null) {
      this.starField.selectParticle(particle);
      this.networkGenerator.showLocalNetwork(particle, 3);
      const info = this.starField.getParticleInfo(particle);
      this.particleCallbacks.forEach(cb => cb(info));
    } else {
      this.starField.selectParticle(null);
      this.networkGenerator.clearLocalNetwork();
      this.particleCallbacks.forEach(cb => cb(null));
    }
  };

  private onControlsChange = (): void => {
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(this.camera.position);
    this.cameraCallbacks.forEach(cb => cb({
      azimuth: spherical.theta,
      polar: spherical.phi,
      distance: spherical.radius
    }));
  };

  private updateMouse(e: MouseEvent | PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pickParticle(): number | null {
    const particleSystem = this.starField.getParticleSystem();
    if (!particleSystem) return null;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(particleSystem, false);

    if (intersects.length > 0 && intersects[0].index !== undefined) {
      return intersects[0].index;
    }
    return null;
  }

  private checkHover(): void {
    const particleSystem = this.starField.getParticleSystem();
    if (!particleSystem) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(particleSystem, false);

    let newHovered: number | null = null;
    if (intersects.length > 0 && intersects[0].index !== undefined) {
      newHovered = intersects[0].index;
    }

    if (newHovered !== this.hoveredIndex) {
      this.hoveredIndex = newHovered;
      const info = newHovered !== null ? this.starField.getParticleInfo(newHovered) : null;
      this.hoverCallbacks.forEach(cb => cb(info));
      this.renderer.domElement.style.cursor = newHovered !== null ? 'pointer' : 'default';
    }
  }

  update(): void {
    this.controls.update();
  }

  onMouseClick(callback: EventCallback): () => void {
    this.particleCallbacks.add(callback);
    return () => this.particleCallbacks.delete(callback);
  }

  onMouseMove(callback: EventCallback): () => void {
    this.hoverCallbacks.add(callback);
    return () => this.hoverCallbacks.delete(callback);
  }

  onCameraChange(callback: CameraCallback): () => void {
    this.cameraCallbacks.add(callback);
    return () => this.cameraCallbacks.delete(callback);
  }

  onScroll(callback: (delta: number) => void): () => void {
    const handler = (e: WheelEvent) => {
      callback(e.deltaY);
    };
    this.renderer.domElement.addEventListener('wheel', handler, { passive: true });
    return () => this.renderer.domElement.removeEventListener('wheel', handler);
  }

  getControls(): OrbitControls {
    return this.controls;
  }

  resetCamera(): void {
    this.camera.position.set(0, 0, 20);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }
}
