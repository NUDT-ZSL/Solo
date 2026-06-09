import * as THREE from 'three';
import { RainSystem } from './rainSystem';
import { WindControl } from './windControl';
import { BackgroundEffect } from './backgroundEffect';

const SCENE_CENTER = new THREE.Vector3(0, 100, 0);
const INITIAL_DISTANCE = 180;
const MIN_DISTANCE = 50;
const MAX_DISTANCE = 300;
const MIN_PITCH = -30 * Math.PI / 180;
const MAX_PITCH = 30 * Math.PI / 180;
const TRANSITION_DURATION = 0.5;
const WALK_SPEED = 25;

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

class CameraController {
  private camera: THREE.PerspectiveCamera;
  private targetPitch: number = 0;
  private targetYaw: number = 0;
  private targetDistance: number = INITIAL_DISTANCE;
  private currentPitch: number = 0;
  private currentYaw: number = 0;
  private currentDistance: number = INITIAL_DISTANCE;
  private startPitch: number = 0;
  private startYaw: number = 0;
  private startDistance: number = 0;
  private transitionTime: number = TRANSITION_DURATION;
  private inTransition: boolean = false;
  private walkOffset: THREE.Vector3 = new THREE.Vector3();
  private keys: Record<string, boolean> = {};
  private isDragging: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.targetYaw = Math.PI * 0.25;
    this.targetPitch = -10 * Math.PI / 180;
    this.currentYaw = this.targetYaw;
    this.currentPitch = this.targetPitch;
    this.attachListeners();
    this.updateCamera(0);
  }

  private attachListeners(): void {
    const appEl = document.getElementById('app')!;

    appEl.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('.control-panel, .hints')) return;
      this.isDragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.startTransition();
      this.targetYaw -= dx * 0.005;
      this.targetPitch -= dy * 0.005;
      this.targetPitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, this.targetPitch));
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    appEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.startTransition();
      const delta = e.deltaY * 0.15;
      this.targetDistance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, this.targetDistance + delta));
    }, { passive: false });

    appEl.addEventListener('touchstart', (e) => {
      if ((e.target as HTMLElement).closest('.control-panel, .hints')) return;
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastX = e.touches[0].clientX;
        this.lastY = e.touches[0].clientY;
      }
    }, { passive: true });

    appEl.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.lastX;
      const dy = e.touches[0].clientY - this.lastY;
      this.lastX = e.touches[0].clientX;
      this.lastY = e.touches[0].clientY;
      this.startTransition();
      this.targetYaw -= dx * 0.005;
      this.targetPitch -= dy * 0.005;
      this.targetPitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, this.targetPitch));
    }, { passive: true });

    appEl.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    document.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
    });
    document.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });
  }

  private startTransition(): void {
    if (!this.inTransition) {
      this.inTransition = true;
      this.transitionTime = 0;
      this.startPitch = this.currentPitch;
      this.startYaw = this.currentYaw;
      this.startDistance = this.currentDistance;
    }
  }

  update(dt: number): void {
    let fwdX = 0, fwdZ = 0;
    let rightX = 0, rightZ = 0;

    const yawForWalk = this.targetYaw;
    const sinY = Math.sin(yawForWalk);
    const cosY = Math.cos(yawForWalk);

    fwdX = -sinY;
    fwdZ = -cosY;
    rightX = cosY;
    rightZ = -sinY;

    let moveX = 0, moveZ = 0;
    if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) {
      moveX += fwdX; moveZ += fwdZ;
    }
    if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) {
      moveX -= fwdX; moveZ -= fwdZ;
    }
    if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
      moveX -= rightX; moveZ -= rightZ;
    }
    if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
      moveX += rightX; moveZ += rightZ;
    }

    const mag = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (mag > 0.001) {
      moveX = moveX / mag * WALK_SPEED * dt;
      moveZ = moveZ / mag * WALK_SPEED * dt;
      this.walkOffset.x += moveX;
      this.walkOffset.z += moveZ;
    }

    if (this.inTransition) {
      this.transitionTime += dt;
      let t = this.transitionTime / TRANSITION_DURATION;
      if (t >= 1) {
        t = 1;
        this.inTransition = false;
      }
      const e = easeOut(t);
      this.currentPitch = this.startPitch + (this.targetPitch - this.startPitch) * e;
      this.currentYaw = this.startYaw + (this.targetYaw - this.startYaw) * e;
      this.currentDistance = this.startDistance + (this.targetDistance - this.startDistance) * e;
    } else {
      this.currentPitch = this.targetPitch;
      this.currentYaw = this.targetYaw;
      this.currentDistance = this.targetDistance;
    }

    this.updateCamera(dt);
  }

  private updateCamera(_dt: number): void {
    const cp = Math.cos(this.currentPitch);
    const sp = Math.sin(this.currentPitch);
    const cy = Math.cos(this.currentYaw);
    const sy = Math.sin(this.currentYaw);

    const dirX = -sy * cp;
    const dirY = sp;
    const dirZ = -cy * cp;

    const center = SCENE_CENTER.clone().add(this.walkOffset);
    const camX = center.x - dirX * this.currentDistance;
    const camY = center.y - dirY * this.currentDistance;
    const camZ = center.z - dirZ * this.currentDistance;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(center);
  }
}

class Application {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cameraCtrl!: CameraController;
  private rainSystem!: RainSystem;
  private windControl!: WindControl;
  private backgroundEffect!: BackgroundEffect;
  private clock: THREE.Clock;
  private animationFrameId: number = 0;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  constructor() {
    this.clock = new THREE.Clock();

    const container = document.getElementById('app')!;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0D1B2A, 0.0012);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.sortObjects = true;
    container.insertBefore(this.renderer.domElement, container.firstChild);

    this.initModules();
    this.initLights();

    window.addEventListener('resize', () => this.onResize());
  }

  private initLights(): void {
    const ambient = new THREE.AmbientLight(0x4FC3F7, 0.25);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xA8D8EA, 0.4);
    dirLight.position.set(60, 200, 40);
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xB39DDB, 0.15);
    fillLight.position.set(-80, 120, -60);
    this.scene.add(fillLight);
  }

  private initModules(): void {
    this.cameraCtrl = new CameraController(this.camera);
    this.windControl = new WindControl();
    this.backgroundEffect = new BackgroundEffect(this.scene);
    this.rainSystem = new RainSystem(this.scene, this.windControl);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  start(): void {
    this.clock.start();
    this.animate();
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();

    this.cameraCtrl.update(delta);
    this.rainSystem.update(delta);
    this.backgroundEffect.update(elapsed, delta);

    this.renderer.render(this.scene, this.camera);

    this.frameCount++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 2) {
      this.frameCount = 0;
      this.fpsTimer = 0;
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.rainSystem.dispose();
    this.backgroundEffect.dispose();
    this.renderer.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new Application();
  app.start();
});
