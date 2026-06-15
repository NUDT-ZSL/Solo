import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface InteractionOptions {
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  target?: THREE.Vector3;
}

export class InteractionController {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private keys: { [key: string]: boolean } = {};
  private moveSpeed = 10;
  private verticalSpeed = 8;
  private target: THREE.Vector3;

  constructor(options: InteractionOptions) {
    this.camera = options.camera;
    this.target = options.target || new THREE.Vector3(0, 0, 0);

    this.controls = new OrbitControls(this.camera, options.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 500;
    this.controls.target.copy(this.target);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  update(deltaTime: number): void {
    const moveAmount = this.moveSpeed * deltaTime;
    const verticalAmount = this.verticalSpeed * deltaTime;

    const direction = new THREE.Vector3();
    const right = new THREE.Vector3();

    this.camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    right.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();

    if (this.keys['KeyW']) {
      this.camera.position.addScaledVector(direction, moveAmount);
      this.controls.target.addScaledVector(direction, moveAmount);
    }
    if (this.keys['KeyS']) {
      this.camera.position.addScaledVector(direction, -moveAmount);
      this.controls.target.addScaledVector(direction, -moveAmount);
    }
    if (this.keys['KeyA']) {
      this.camera.position.addScaledVector(right, -moveAmount);
      this.controls.target.addScaledVector(right, -moveAmount);
    }
    if (this.keys['KeyD']) {
      this.camera.position.addScaledVector(right, moveAmount);
      this.controls.target.addScaledVector(right, moveAmount);
    }
    if (this.keys['Space']) {
      this.camera.position.y += verticalAmount;
      this.controls.target.y += verticalAmount;
    }
    if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
      this.camera.position.y -= verticalAmount;
      this.controls.target.y -= verticalAmount;
    }

    this.controls.update();
  }

  getCameraPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  getControls(): OrbitControls {
    return this.controls;
  }

  setTarget(target: THREE.Vector3): void {
    this.controls.target.copy(target);
  }
}
