import * as THREE from 'three';
import { ParticleSystem } from './particleSystem';
import { GravitySource } from './gravitySource';

const AUTO_ROTATION_SPEED = 0.3;
const MIN_ZOOM = 20;
const MAX_ZOOM = 160;

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private particleSystem: ParticleSystem;
  private gravitySource: GravitySource;

  private rotationGroup: THREE.Group;

  private isRightDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private cameraAngleY: number = 0;
  private cameraAngleX: number = 0;
  private cameraDistance: number = 100;
  private autoRotation: number = 0;

  private clock: THREE.Clock;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.rotationGroup = new THREE.Group();
    this.scene.add(this.rotationGroup);

    this.particleSystem = new ParticleSystem();
    this.rotationGroup.add(this.particleSystem.particles);
    this.rotationGroup.add(this.particleSystem.trails);

    this.gravitySource = new GravitySource(this.camera, this.renderer.domElement);
    this.rotationGroup.add(this.gravitySource.mesh);

    this.clock = new THREE.Clock();

    this.setupEventListeners();
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraAngleY) * Math.cos(this.cameraAngleX);
    const y = this.cameraDistance * Math.sin(this.cameraAngleX);
    const z = this.cameraDistance * Math.cos(this.cameraAngleY) * Math.cos(this.cameraAngleX);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.renderer.domElement.addEventListener('mouseleave', this.onMouseUp.bind(this));

    this.renderer.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 2) {
      this.isRightDragging = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isRightDragging) return;

    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;

    this.cameraAngleY += deltaX * 0.005;
    this.cameraAngleX += deltaY * 0.005;
    this.cameraAngleX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.cameraAngleX));

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;

    this.updateCameraPosition();
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 2) {
      this.isRightDragging = false;
    }
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.cameraDistance += event.deltaY * 0.1;
    this.cameraDistance = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.cameraDistance));
    this.updateCameraPosition();
  }

  public getParticleSystem(): ParticleSystem {
    return this.particleSystem;
  }

  public animate(): void {
    const deltaTime = this.clock.getDelta();

    this.autoRotation += AUTO_ROTATION_SPEED * (Math.PI / 180) * deltaTime;
    this.rotationGroup.rotation.y = this.autoRotation;

    this.particleSystem.setGravityPosition(
      this.gravitySource.getPosition().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.autoRotation)
    );

    this.particleSystem.update(deltaTime);

    this.renderer.render(this.scene, this.camera);
  }

  public getFPS(): number {
    return Math.round(1 / Math.max(this.clock.getDelta(), 0.001));
  }

  public reset(): void {
    this.particleSystem.reset();
    this.gravitySource.reset();
    this.autoRotation = 0;
    this.cameraAngleX = 0;
    this.cameraAngleY = 0;
    this.cameraDistance = 100;
    this.updateCameraPosition();
  }

  public dispose(): void {
    this.gravitySource.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}
