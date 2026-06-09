import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AnnotationSystem } from './AnnotationSystem';

export class AnimationLoop {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private targetGroup: THREE.Group;
  private annotationSystem: AnnotationSystem;
  
  private rotationSpeed: number = 0.001;
  private autoRotateEnabled: boolean = true;
  private lastInteractionTime: number = 0;
  private pauseDuration: number = 2000;
  private animationId: number = 0;
  private clock: THREE.Clock;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private targetFPS: number = 45;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    targetGroup: THREE.Group,
    annotationSystem: AnnotationSystem
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.targetGroup = targetGroup;
    this.annotationSystem = annotationSystem;
    this.clock = new THREE.Clock();
    
    this.setupControlListeners();
  }

  public start(): void {
    this.clock.start();
    this.fpsTime = performance.now();
    this.animate();
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  public setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  public setAutoRotateEnabled(enabled: boolean): void {
    this.autoRotateEnabled = enabled;
  }

  public isAutoRotateEnabled(): boolean {
    return this.autoRotateEnabled;
  }

  private setupControlListeners(): void {
    const onInteraction = () => {
      this.lastInteractionTime = performance.now();
    };

    this.controls.addEventListener('start', onInteraction);
    this.controls.addEventListener('change', onInteraction);
    this.controls.addEventListener('end', onInteraction);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.updateAutoRotation(delta);
    this.controls.update();
    this.annotationSystem.update(delta);

    this.renderer.render(this.scene, this.camera);

    this.frameCount++;
    const now = performance.now();
    if (now - this.fpsTime >= 1000) {
      const fps = this.frameCount * 1000 / (now - this.fpsTime);
      if (fps < this.targetFPS - 5) {
        console.warn(`FPS低于${this.targetFPS}，当前: ${fps.toFixed(1)}`);
      }
      this.frameCount = 0;
      this.fpsTime = now;
    }

    elapsed;
  }

  private updateAutoRotation(_delta: number): void {
    if (!this.autoRotateEnabled) return;

    const now = performance.now();
    if (now - this.lastInteractionTime < this.pauseDuration) return;

    const vessel = this.targetGroup.children.find(child => child.name === 'BronzeVessel');
    if (vessel) {
      vessel.rotation.y += this.rotationSpeed;
    }
  }
}
