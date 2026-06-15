import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GasRing } from './gasRing.js';

interface Ripple {
  position: THREE.Vector3;
  startTime: number;
  duration: number;
  maxRadius: number;
  color: THREE.Color;
  mesh: THREE.Mesh;
}

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private controls: OrbitControls;
  private gasRing: GasRing;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private ripples: Ripple[] = [];
  private rippleGroup: THREE.Group;

  private isShiftDragging: boolean = false;
  private lastMouseX: number = 0;
  private onSpeedChangeCallback: ((speed: number) => void) | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    controls: OrbitControls,
    gasRing: GasRing
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
    this.controls = controls;
    this.gasRing = gasRing;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.rippleGroup = new THREE.Group();
    this.scene.add(this.rippleGroup);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const domElement = this.renderer.domElement;

    domElement.addEventListener('pointerdown', this.onPointerDown);
    domElement.addEventListener('pointermove', this.onPointerMove);
    domElement.addEventListener('pointerup', this.onPointerUp);
    domElement.addEventListener('click', this.onClick);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Shift') {
      this.isShiftDragging = true;
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (event.key === 'Shift') {
      this.isShiftDragging = false;
    }
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (event.shiftKey) {
      this.isShiftDragging = true;
      this.lastMouseX = event.clientX;
      this.controls.enabled = false;
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (this.isShiftDragging) {
      const deltaX = event.clientX - this.lastMouseX;
      this.lastMouseX = event.clientX;

      const speedDelta = deltaX * 0.005;
      let newSpeed = this.gasRing.targetRotationSpeed + speedDelta;
      newSpeed = Math.max(0, Math.min(2, newSpeed));
      this.gasRing.targetRotationSpeed = newSpeed;

      if (this.onSpeedChangeCallback) {
        this.onSpeedChangeCallback(newSpeed);
      }
    }
  };

  private onPointerUp = (): void => {
    if (this.isShiftDragging) {
      this.isShiftDragging = false;
      this.controls.enabled = true;
    }
  };

  private onClick = (event: MouseEvent): void => {
    if (event.shiftKey) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const ringPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(ringPlane, intersectPoint);

    if (intersectPoint) {
      const dist = Math.sqrt(intersectPoint.x ** 2 + intersectPoint.z ** 2);
      if (dist >= 150 && dist <= 240) {
        this.createRipple(intersectPoint);
        this.gasRing.applyPerturbation(intersectPoint.x, intersectPoint.z);
      }
    }
  };

  private createRipple(position: THREE.Vector3): void {
    const startTime = performance.now() / 1000;
    const duration = 3;
    const maxRadius = 80;

    const color = this.getColorAtPosition(position);

    const geometry = new THREE.RingGeometry(0, 2, 64);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position);

    this.rippleGroup.add(mesh);

    this.ripples.push({
      position: position.clone(),
      startTime,
      duration,
      maxRadius,
      color,
      mesh
    });
  }

  private getColorAtPosition(position: THREE.Vector3): THREE.Color {
    const dist = Math.sqrt(position.x ** 2 + position.z ** 2);
    const t = (dist - 150) / (240 - 150);
    const colorInner = new THREE.Color('#FF6B35');
    const colorMiddle = new THREE.Color('#FFD700');
    const colorOuter = new THREE.Color('#87CEEB');

    if (t < 0.5) {
      return colorInner.clone().lerp(colorMiddle, t * 2);
    } else {
      return colorMiddle.clone().lerp(colorOuter, (t - 0.5) * 2);
    }
  }

  public onSpeedChange(callback: (speed: number) => void): void {
    this.onSpeedChangeCallback = callback;
  }

  public update(currentTime: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      const elapsed = currentTime - ripple.startTime;
      const progress = elapsed / ripple.duration;

      if (progress >= 1) {
        this.rippleGroup.remove(ripple.mesh);
        ripple.mesh.geometry.dispose();
        (ripple.mesh.material as THREE.Material).dispose();
        this.ripples.splice(i, 1);
        continue;
      }

      const currentRadius = ripple.maxRadius * progress;
      const innerRadius = Math.max(0, currentRadius - 3);
      const outerRadius = currentRadius;

      ripple.mesh.geometry.dispose();
      ripple.mesh.geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);

      const opacity = 0.8 * (1 - progress);
      (ripple.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;

      const fadeColor = ripple.color.clone().lerp(new THREE.Color(0x000000), progress * 0.5);
      (ripple.mesh.material as THREE.MeshBasicMaterial).color.copy(fadeColor);
    }
  }

  public dispose(): void {
    const domElement = this.renderer.domElement;
    domElement.removeEventListener('pointerdown', this.onPointerDown);
    domElement.removeEventListener('pointermove', this.onPointerMove);
    domElement.removeEventListener('pointerup', this.onPointerUp);
    domElement.removeEventListener('click', this.onClick);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    this.ripples.forEach(ripple => {
      ripple.mesh.geometry.dispose();
      (ripple.mesh.material as THREE.Material).dispose();
    });
  }
}
