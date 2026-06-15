import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ParticleScene } from './scene';

export class InteractionManager {
  controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private particleScene: ParticleScene;
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  private defaultCameraPos = new THREE.Vector3(0, 25, 35);
  private defaultTarget = new THREE.Vector3(0, 0, 0);

  private pointerDown = false;
  private pointerMoved = false;
  private pointerStart = { x: 0, y: 0 };

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    particleScene: ParticleScene
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.particleScene = particleScene;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 80;
    this.controls.maxPolarAngle = Math.PI * 0.75;
    this.controls.minPolarAngle = Math.PI * 0.1;
    this.controls.target.copy(this.defaultTarget);
    camera.position.copy(this.defaultCameraPos);

    this.bindEvents();
  }

  private bindEvents() {
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
  }

  private onPointerDown = (e: PointerEvent) => {
    this.pointerDown = true;
    this.pointerMoved = false;
    this.pointerStart.x = e.clientX;
    this.pointerStart.y = e.clientY;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.pointerDown) return;
    const dx = e.clientX - this.pointerStart.x;
    const dy = e.clientY - this.pointerStart.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      this.pointerMoved = true;
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.pointerDown && !this.pointerMoved) {
      this.handleClick(e);
    }
    this.pointerDown = false;
    this.pointerMoved = false;
  };

  private handleClick(e: PointerEvent) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const waterPlane = this.particleScene.waterPlane;
    if (!waterPlane) return;

    const intersects = this.raycaster.intersectObject(waterPlane);
    if (intersects.length > 0) {
      this.particleScene.addRipple(intersects[0].point);
    }
  }

  resetView() {
    this.camera.position.copy(this.defaultCameraPos);
    this.controls.target.copy(this.defaultTarget);
    this.controls.update();
  }

  update() {
    this.controls.update();
  }

  dispose() {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.controls.dispose();
  }
}
