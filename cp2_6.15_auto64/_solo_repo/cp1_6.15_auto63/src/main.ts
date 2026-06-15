import * as THREE from 'three';
import { store } from './store';
import { ParticleModule } from './particleModule';
import { EmitterModule } from './emitterModule';
import { UiModule } from './uiModule';

const CAMERA_TRANSITION_DURATION = 0.6;

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleModule: ParticleModule;
  private emitterModule: EmitterModule;
  private uiModule: UiModule;
  private clock = new THREE.Clock();
  private frameCount = 0;
  private fpsTime = 0;

  private isTransitioning = false;
  private transitionFrom = new THREE.Vector3();
  private transitionTo = new THREE.Vector3();
  private transitionLookFrom = new THREE.Vector3();
  private transitionLookTo = new THREE.Vector3();
  private transitionElapsed = 0;

  private freeControlAngleX = 0.8;
  private freeControlAngleY = 0.6;
  private freeControlRadius = 18;
  private freeControlTarget = new THREE.Vector3(0, 2, 0);
  private isFirstPerson = false;
  private firstPersonPos = new THREE.Vector3(0, 2, 10);
  private firstPersonYaw = 0;

  private keys: Set<string> = new Set();

  constructor() {
    const container = document.getElementById('main-scene')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x12121a);
    this.scene.fog = new THREE.FogExp2(0x12121a, 0.02);

    const w = container.clientWidth;
    const h = container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 200);
    this.camera.position.set(10, 12, 14);
    this.camera.lookAt(0, 2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.insertBefore(this.renderer.domElement, container.firstChild);

    this.addLighting();
    this.addGround();

    this.particleModule = new ParticleModule(this.scene);
    this.emitterModule = new EmitterModule(this.scene);
    this.uiModule = new UiModule();

    this.uiModule.setParticlePositionGetter(() => this.particleModule.getPositions());

    this.emitterModule.setupInteraction(
      this.camera,
      this.renderer.domElement,
      (point) => this.onGroundClick(point),
      (id) => this.onEmitterRightClick(id)
    );

    store.on('view:change', () => this.onViewChange());
    store.on('emitters:change', () => this.updateInfoFromStore());

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('keydown', (e) => this.keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));

    this.renderer.domElement.addEventListener('mousemove', (e) => {
      if (store.getViewMode() === 'firstPerson') {
        if (document.pointerLockElement === this.renderer.domElement) {
          this.firstPersonYaw -= e.movementX * 0.003;
        }
      }
    });

    this.renderer.domElement.addEventListener('click', () => {
      if (store.getViewMode() === 'firstPerson') {
        this.renderer.domElement.requestPointerLock();
      }
    });

    window.addEventListener('apply-keyframe', ((e: CustomEvent) => {
      const positions = e.detail.positions as Float32Array;
      if (positions) {
        this.particleModule.update(0);
      }
    }) as EventListener);

    this.updateInfoFromStore();
    this.animate();
  }

  private addLighting(): void {
    const ambient = new THREE.AmbientLight(0x404060, 1.5);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffeedd, 0.8);
    dir.position.set(10, 15, 5);
    this.scene.add(dir);
  }

  private addGround(): void {
    const gridHelper = new THREE.GridHelper(20, 20, 0x999999, 0x999999);
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.4;
    this.scene.add(gridHelper);

    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x222233,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    this.scene.add(ground);
  }

  private onGroundClick(point: THREE.Vector3): void {
    this.emitterModule.addEmitter(point);
  }

  private onEmitterRightClick(id: string): void {
    store.selectEmitter(id);
  }

  private onViewChange(): void {
    const mode = store.getViewMode();
    this.isFirstPerson = mode === 'firstPerson';

    if (mode === 'firstPerson') {
      document.exitPointerLock?.();
    }

    this.transitionFrom.copy(this.camera.position);

    switch (mode) {
      case 'top':
        this.transitionTo.set(0, 20, 0.01);
        this.transitionLookTo.set(0, 0, 0);
        break;
      case 'side':
        this.transitionTo.set(20, 5, 0);
        this.transitionLookTo.set(0, 3, 0);
        break;
      case 'free':
        this.transitionTo.set(
          Math.sin(this.freeControlAngleX) * Math.cos(this.freeControlAngleY) * this.freeControlRadius,
          Math.sin(this.freeControlAngleY) * this.freeControlRadius,
          Math.cos(this.freeControlAngleX) * Math.cos(this.freeControlAngleY) * this.freeControlRadius
        );
        this.transitionLookTo.copy(this.freeControlTarget);
        break;
      case 'firstPerson':
        this.transitionTo.copy(this.firstPersonPos);
        this.transitionLookTo.set(
          this.firstPersonPos.x + Math.sin(this.firstPersonYaw) * 5,
          2,
          this.firstPersonPos.z - Math.cos(this.firstPersonYaw) * 5
        );
        break;
    }

    this.transitionLookFrom.copy(this.freeControlTarget);
    this.isTransitioning = true;
    this.transitionElapsed = 0;
  }

  private updateFreeCamera(dt: number): void {
    const speed = 5 * dt;
    const isDrag = (window as any).__mouseDrag;

    if (store.getViewMode() === 'free') {
      if (this.keys.has('w')) {
        this.freeControlAngleX -= 0.02;
      }
      if (this.keys.has('s')) {
        this.freeControlAngleX += 0.02;
      }
      if (this.keys.has('a')) {
        this.freeControlAngleY -= 0.02;
      }
      if (this.keys.has('d')) {
        this.freeControlAngleY += 0.02;
      }
      this.freeControlAngleY = Math.max(-0.2, Math.min(1.2, this.freeControlAngleY));

      this.camera.position.set(
        Math.sin(this.freeControlAngleX) * Math.cos(this.freeControlAngleY) * this.freeControlRadius + this.freeControlTarget.x,
        Math.sin(this.freeControlAngleY) * this.freeControlRadius + this.freeControlTarget.y,
        Math.cos(this.freeControlAngleX) * Math.cos(this.freeControlAngleY) * this.freeControlRadius + this.freeControlTarget.z
      );
      this.camera.lookAt(this.freeControlTarget);
    }

    if (store.getViewMode() === 'firstPerson') {
      const forward = new THREE.Vector3(Math.sin(this.firstPersonYaw), 0, -Math.cos(this.firstPersonYaw));
      const right = new THREE.Vector3(Math.cos(this.firstPersonYaw), 0, Math.sin(this.firstPersonYaw));

      if (this.keys.has('w')) this.firstPersonPos.addScaledVector(forward, speed);
      if (this.keys.has('s')) this.firstPersonPos.addScaledVector(forward, -speed);
      if (this.keys.has('a')) this.firstPersonPos.addScaledVector(right, -speed);
      if (this.keys.has('d')) this.firstPersonPos.addScaledVector(right, speed);

      this.firstPersonPos.x = Math.max(-10, Math.min(10, this.firstPersonPos.x));
      this.firstPersonPos.z = Math.max(-10, Math.min(10, this.firstPersonPos.z));

      this.camera.position.copy(this.firstPersonPos);
      this.camera.lookAt(
        this.firstPersonPos.x + Math.sin(this.firstPersonYaw) * 5,
        2,
        this.firstPersonPos.z - Math.cos(this.firstPersonYaw) * 5
      );
    }
  }

  private onResize(): void {
    const container = document.getElementById('main-scene')!;
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private updateInfoFromStore(): void {
    store.setParticleCount(store.getParticleCount());
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.frameCount++;
    this.fpsTime += dt;

    if (this.fpsTime >= 1) {
      store.setFps(Math.round(this.frameCount / this.fpsTime));
      this.frameCount = 0;
      this.fpsTime = 0;
      this.uiModule.updateInfo();
    }

    if (this.isTransitioning) {
      this.transitionElapsed += dt;
      const t = Math.min(1, this.transitionElapsed / CAMERA_TRANSITION_DURATION);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.camera.position.lerpVectors(this.transitionFrom, this.transitionTo, ease);

      const lookAt = new THREE.Vector3();
      lookAt.lerpVectors(this.transitionLookFrom, this.transitionLookTo, ease);
      this.camera.lookAt(lookAt);

      if (t >= 1) {
        this.isTransitioning = false;
        this.freeControlTarget.copy(this.transitionLookTo);
      }
    } else {
      this.updateFreeCamera(dt);
    }

    this.particleModule.update(dt);
    this.emitterModule.update(dt);

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
