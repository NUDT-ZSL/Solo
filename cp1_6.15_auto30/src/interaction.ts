import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface InteractionOptions {
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  target?: THREE.Vector3;
}

const WORLD_UP = new THREE.Vector3(0, 1, 0);

export class InteractionController {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private keys: { [key: string]: boolean } = {};
  private moveSpeed = 10;
  private verticalSpeed = 8;
  private target: THREE.Vector3;

  private forwardDir = new THREE.Vector3();
  private rightDir = new THREE.Vector3();
  private moveVector = new THREE.Vector3();

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

    this.moveVector.set(0, 0, 0);

    this.camera.getWorldDirection(this.forwardDir);
    this.forwardDir.y = 0;
    if (this.forwardDir.lengthSq() > 0.0001) {
      this.forwardDir.normalize();
    } else {
      this.forwardDir.set(0, 0, -1);
    }

    this.rightDir.crossVectors(this.forwardDir, WORLD_UP).normalize();

    if (this.keys['KeyW']) {
      this.moveVector.add(this.forwardDir);
    }
    if (this.keys['KeyS']) {
      this.moveVector.sub(this.forwardDir);
    }
    if (this.keys['KeyA']) {
      this.moveVector.sub(this.rightDir);
    }
    if (this.keys['KeyD']) {
      this.moveVector.add(this.rightDir);
    }

    if (this.moveVector.lengthSq() > 0) {
      this.moveVector.y = 0;
      if (this.moveVector.lengthSq() > 0) {
        this.moveVector.normalize().multiplyScalar(moveAmount);
      }
      this.camera.position.add(this.moveVector);
      this.controls.target.add(this.moveVector);
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
