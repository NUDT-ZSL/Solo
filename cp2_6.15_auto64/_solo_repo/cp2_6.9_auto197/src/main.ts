import * as THREE from 'three';
import { ParticleSystem } from './particleSystem';

class App {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private particleSystem!: ParticleSystem;
  private container!: HTMLElement;

  private cameraDistance = 8;
  private cameraHeight = 3;
  private cameraYaw = 0;
  private cameraPitch = 0.2;
  private readonly MIN_DISTANCE = 2;
  private readonly MAX_DISTANCE = 20;
  private readonly MIN_HEIGHT = 1;
  private readonly MAX_HEIGHT = 6;
  private readonly ROTATION_SPEED = 0.003;
  private readonly HEIGHT_STEP = 0.2;
  private readonly ZOOM_STEP = 0.5;

  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private keys = new Set<string>();

  private clock = new THREE.Clock();
  private fpsFrames = 0;
  private fpsTime = 0;
  private currentFps = 60;

  private fpsElement!: HTMLElement;
  private distanceElement!: HTMLElement;
  private burstCountElement!: HTMLElement;
  private cameraDistElement!: HTMLElement;
  private cameraHeightElement!: HTMLElement;

  constructor() {
    this.init();
    this.bindEvents();
    this.animate();
  }

  private init(): void {
    this.container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 2;
    canvas.height = 512;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0B0B2A');
    gradient.addColorStop(1, '#1A1A4E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const bgTexture = new THREE.CanvasTexture(canvas);
    this.scene.background = bgTexture;

    this.scene.fog = new THREE.Fog(0x0B0B2A, 10, 30);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.8, 50);
    pointLight.position.set(5, 10, 5);
    this.scene.add(pointLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(-1, -1, 0).normalize();
    this.scene.add(directionalLight);

    this.particleSystem = new ParticleSystem(this.scene);
    this.particleSystem.setOnBurstCallback(() => this.onBurst());

    this.fpsElement = document.getElementById('fps')!;
    this.distanceElement = document.getElementById('distance')!;
    this.burstCountElement = document.getElementById('burst-count')!;
    this.cameraDistElement = document.getElementById('camera-dist')!;
    this.cameraHeightElement = document.getElementById('camera-height')!;
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onResize());

    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isDragging = false;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;

      this.cameraYaw -= deltaX * this.ROTATION_SPEED;
      this.cameraPitch -= deltaY * this.ROTATION_SPEED;

      this.cameraPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.cameraPitch));

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? this.ZOOM_STEP : -this.ZOOM_STEP;
      this.cameraDistance = Math.max(
        this.MIN_DISTANCE,
        Math.min(this.MAX_DISTANCE, this.cameraDistance + delta)
      );
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch);
    const y = this.cameraHeight + this.cameraDistance * Math.sin(this.cameraPitch);
    const z = this.cameraDistance * Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, this.cameraHeight * 0.3, 0);
  }

  private handleKeyboardInput(dt: number): void {
    let heightDelta = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) {
      heightDelta += this.HEIGHT_STEP;
    }
    if (this.keys.has('s') || this.keys.has('arrowdown')) {
      heightDelta -= this.HEIGHT_STEP;
    }
    if (heightDelta !== 0) {
      this.cameraHeight = Math.max(
        this.MIN_HEIGHT,
        Math.min(this.MAX_HEIGHT, this.cameraHeight + heightDelta)
      );
    }

    if (this.keys.has('arrowleft')) {
      this.cameraYaw -= this.ROTATION_SPEED * 30 * dt;
    }
    if (this.keys.has('arrowright')) {
      this.cameraYaw += this.ROTATION_SPEED * 30 * dt;
    }
  }

  private onBurst(): void {
    this.burstCountElement.classList.add('pulse');
    setTimeout(() => {
      this.burstCountElement.classList.remove('pulse');
    }, 300);
  }

  private updateHUD(dt: number): void {
    this.fpsFrames++;
    this.fpsTime += dt;
    if (this.fpsTime >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsTime);
      this.fpsFrames = 0;
      this.fpsTime = 0;

      this.fpsElement.textContent = `${this.currentFps} FPS`;
      if (this.currentFps < 45) {
        this.fpsElement.classList.add('warning');
      } else {
        this.fpsElement.classList.remove('warning');
      }
    }

    this.distanceElement.textContent = this.particleSystem.getParticleDistance().toFixed(2);
    this.burstCountElement.textContent = this.particleSystem.getBurstCount().toString();
    this.cameraDistElement.textContent = this.cameraDistance.toFixed(2);
    this.cameraHeightElement.textContent = this.cameraHeight.toFixed(2);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.1);

    this.handleKeyboardInput(dt);
    this.updateCameraPosition();

    this.particleSystem.update(dt);
    this.particleSystem.render();

    this.updateHUD(dt);

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.particleSystem.dispose();
    this.renderer.dispose();
  }
}

new App();
