import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { UIController, MaterialType, MATERIALS } from './ui';
import { ParticleSystem } from './particles';
import { RaindropManager } from './raindrop';

const SURFACE_SIZE = 4;
const INITIAL_SPEED = 1.0;
const INITIAL_COUNT = 300;
const SPEED_RANGE: [number, number] = [0.5, 2.0];
const COUNT_RANGE: [number, number] = [100, 500];
const INITIAL_MATERIAL: MaterialType = 'water';

const TARGET_FPS = 30;
const FPS_SAMPLE_WINDOW = 0.5;
const MIN_QUALITY_LEVEL = 0;
const MAX_QUALITY_LEVEL = 3;

export class RainTalesApp {
  private container!: HTMLElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private surface!: THREE.Mesh;
  private surfaceTextures: Map<MaterialType, THREE.Texture> = new Map();
  private currentMaterial: MaterialType = INITIAL_MATERIAL;

  private particleSystem!: ParticleSystem;
  private raindropManager!: RaindropManager;
  private uiController!: UIController;

  private clock!: THREE.Clock;
  private raycaster!: THREE.Raycaster;
  private mouse!: THREE.Vector2;
  private isDragging: boolean = false;
  private lastManualSpawn: number = 0;
  private manualSpawnInterval: number = 50;

  private fpsAccumulator: number = 0;
  private fpsFrameCount: number = 0;
  private currentFPS: number = 60;
  private qualityLevel: number = MAX_QUALITY_LEVEL;
  private spawnRateMultiplier: number = 1;
  private trailEnabled: boolean = true;
  private qualityDirty: boolean = false;

  private animationId: number = 0;

  constructor() {
    this.init();
  }

  private init(): void {
    this.container = document.getElementById('scene-container')!;
    if (!this.container) {
      console.error('Scene container not found');
      return;
    }

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupControls();
    this.setupLighting();
    this.setupSurface();
    this.setupModules();
    this.setupUI();
    this.setupInteraction();
    this.hideSplash();

    this.animate();
    window.addEventListener('resize', () => this.onResize());
  }

  private setupScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.05);
  }

  private setupCamera(): void {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 100);
    this.camera.position.set(0, 3.5, 4.5);
    this.camera.lookAt(0, 0, 0);
  }

  private setupRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);
  }

  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 12;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.minPolarAngle = 0.2;
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(3, 6, 4);
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x4a90d9, 0.3);
    fillLight.position.set(-3, 4, -3);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xe94560, 0.4, 15);
    rimLight.position.set(0, 2, -4);
    this.scene.add(rimLight);
  }

  private generateMaterialTexture(type: MaterialType): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const color = MATERIALS[type].color;

    switch (type) {
      case 'water':
        this.drawWaterTexture(ctx, color);
        break;
      case 'metal':
        this.drawMetalTexture(ctx, color);
        break;
      case 'glass':
        this.drawGlassTexture(ctx, color);
        break;
      case 'leaf':
        this.drawLeafTexture(ctx, color);
        break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  private drawWaterTexture(ctx: CanvasRenderingContext2D, _color: string): void {
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#1e3a5f');
    grad.addColorStop(0.5, '#2c5282');
    grad.addColorStop(1, '#1a365d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 30; i++) {
      const cx = Math.random() * 512;
      const cy = Math.random() * 512;
      for (let r = 10; r < 60; r += 15) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(74,144,217,${0.15 - r * 0.0015})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    const glossGrad = ctx.createLinearGradient(0, 50, 512, 100);
    glossGrad.addColorStop(0, 'rgba(255,255,255,0)');
    glossGrad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
    glossGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glossGrad;
    ctx.fillRect(0, 50, 512, 60);
  }

  private drawMetalTexture(ctx: CanvasRenderingContext2D, _color: string): void {
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#e8e8e8');
    grad.addColorStop(0.25, '#a0a0a0');
    grad.addColorStop(0.5, '#d0d0d0');
    grad.addColorStop(0.75, '#808080');
    grad.addColorStop(1, '#b0b0b0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    for (let x = 0; x < 512; x += 3) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.strokeStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.03})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const h1 = ctx.createLinearGradient(0, 0, 512, 0);
    h1.addColorStop(0, 'rgba(255,255,255,0)');
    h1.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    h1.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = h1;
    ctx.fillRect(0, 80, 512, 50);

    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.25})`;
      ctx.fill();
    }
  }

  private drawGlassTexture(ctx: CanvasRenderingContext2D, color: string): void {
    const baseColor = this.hexToRgb(color);
    const bg = `rgba(${baseColor.r},${baseColor.g},${baseColor.b},0.18)`;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 508, 508);

    const shine1 = ctx.createLinearGradient(0, 0, 512, 512);
    shine1.addColorStop(0, 'rgba(255,255,255,0.55)');
    shine1.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(180, 0);
    ctx.lineTo(0, 180);
    ctx.closePath();
    ctx.fillStyle = shine1;
    ctx.fill();
    ctx.restore();

    const shine2 = ctx.createLinearGradient(512, 512, 0, 0);
    shine2.addColorStop(0, 'rgba(255,255,255,0.4)');
    shine2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(512, 512);
    ctx.lineTo(320, 512);
    ctx.lineTo(512, 320);
    ctx.closePath();
    ctx.fillStyle = shine2;
    ctx.fill();
    ctx.restore();

    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.1})`;
      ctx.fillRect(Math.random() * 400, Math.random() * 400, 8 + Math.random() * 15, 60 + Math.random() * 120);
    }
  }

  private drawLeafTexture(ctx: CanvasRenderingContext2D, _color: string): void {
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#2d5a27');
    grad.addColorStop(0.5, '#228B22');
    grad.addColorStop(1, '#1e4d1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    for (let y = 0; y < 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y + 32);
      for (let x = 0; x <= 512; x += 32) {
        const q = y + 16 + Math.sin(x * 0.03) * 12;
        ctx.quadraticCurveTo(x + 16, q, x + 32, y + 32);
      }
      ctx.strokeStyle = 'rgba(30,60,20,0.25)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    for (let x = 0; x < 512; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x + 32, 0);
      for (let y = 0; y <= 512; y += 32) {
        const q = x + 16 + Math.sin(y * 0.03) * 10;
        ctx.quadraticCurveTo(q, y + 16, x + 32, y + 32);
      }
      ctx.strokeStyle = 'rgba(30,60,20,0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (let i = 0; i < 20; i++) {
      const cx = Math.random() * 512;
      const cy = Math.random() * 512;
      const rx = 30 + Math.random() * 40;
      const ry = 10 + Math.random() * 20;
      const lg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
      lg.addColorStop(0, 'rgba(100,200,80,0.2)');
      lg.addColorStop(1, 'rgba(100,200,80,0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 192, g: 192, b: 192 };
  }

  private setupSurface(): void {
    const waterTex = this.generateMaterialTexture('water');
    const metalTex = this.generateMaterialTexture('metal');
    const glassTex = this.generateMaterialTexture('glass');
    const leafTex = this.generateMaterialTexture('leaf');
    this.surfaceTextures.set('water', waterTex);
    this.surfaceTextures.set('metal', metalTex);
    this.surfaceTextures.set('glass', glassTex);
    this.surfaceTextures.set('leaf', leafTex);

    const geometry = new THREE.PlaneGeometry(SURFACE_SIZE, SURFACE_SIZE);
    const material = new THREE.MeshStandardMaterial({
      map: waterTex,
      metalness: 0.3,
      roughness: 0.6,
      transparent: true,
      opacity: 0.95
    });

    this.surface = new THREE.Mesh(geometry, material);
    this.surface.rotation.x = -Math.PI / 2;
    this.surface.position.y = 0;
    this.surface.receiveShadow = true;
    this.scene.add(this.surface);

    const gridHelper = new THREE.GridHelper(SURFACE_SIZE, 20, 0x4a90d9, 0x1a1a2e);
    (gridHelper.material as THREE.Material).opacity = 0.15;
    (gridHelper.material as THREE.Material).transparent = true;
    gridHelper.position.y = 0.001;
    this.scene.add(gridHelper);
  }

  private setupModules(): void {
    const half = SURFACE_SIZE / 2 - 0.05;
    this.particleSystem = new ParticleSystem(this.scene);
    this.particleSystem.setCurrentMaterial(this.currentMaterial);

    this.raindropManager = new RaindropManager({
      scene: this.scene,
      particleSystem: this.particleSystem,
      surfaceBounds: { minX: -half, maxX: half, minZ: -half, maxZ: half },
      initialSpeed: INITIAL_SPEED,
      initialCount: INITIAL_COUNT,
      getCurrentMaterial: () => this.currentMaterial
    });
  }

  private setupUI(): void {
    this.uiController = new UIController({
      container: document.body,
      initialMaterial: INITIAL_MATERIAL,
      initialSpeed: INITIAL_SPEED,
      initialCount: INITIAL_COUNT,
      speedRange: SPEED_RANGE,
      countRange: COUNT_RANGE
    });

    this.uiController.on('material:change', (mat) => {
      this.switchMaterial(mat);
    });

    this.uiController.on('speed:change', (speed) => {
      this.raindropManager.setSpeed(speed);
    });

    this.uiController.on('count:change', (count) => {
      const effective = Math.round(count * this.spawnRateMultiplier);
      this.raindropManager.setSpawnRate(effective);
    });

    this.uiController.on('scene:reset', () => {
      this.resetScene();
    });
  }

  private switchMaterial(mat: MaterialType): void {
    this.currentMaterial = mat;
    this.particleSystem.setCurrentMaterial(mat);

    const texture = this.surfaceTextures.get(mat);
    if (!texture || !this.surface) return;
    const matSurface = this.surface.material as THREE.MeshStandardMaterial;
    matSurface.map = texture;
    matSurface.map!.needsUpdate = true;

    switch (mat) {
      case 'water':
        matSurface.metalness = 0.2;
        matSurface.roughness = 0.3;
        matSurface.opacity = 0.92;
        break;
      case 'metal':
        matSurface.metalness = 0.95;
        matSurface.roughness = 0.25;
        matSurface.opacity = 1.0;
        break;
      case 'glass':
        matSurface.metalness = 0.05;
        matSurface.roughness = 0.05;
        matSurface.opacity = 0.55;
        break;
      case 'leaf':
        matSurface.metalness = 0.0;
        matSurface.roughness = 0.85;
        matSurface.opacity = 1.0;
        break;
    }
    matSurface.needsUpdate = true;
  }

  private setupInteraction(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.handlePointer(e);
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const now = performance.now();
      if (now - this.lastManualSpawn >= this.manualSpawnInterval) {
        this.lastManualSpawn = now;
        this.handlePointer(e);
      }
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.isDragging = true;
        this.handleTouch(e.touches[0]);
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length === 0) return;
      const now = performance.now();
      if (now - this.lastManualSpawn >= this.manualSpawnInterval + 20) {
        this.lastManualSpawn = now;
        this.handleTouch(e.touches[0]);
      }
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  private handlePointer(e: MouseEvent): void {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.spawnRaindropAtPointer();
  }

  private handleTouch(t: Touch): void {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((t.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((t.clientY - rect.top) / rect.height) * 2 + 1;
    this.spawnRaindropAtPointer();
  }

  private spawnRaindropAtPointer(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, point);

    if (point) {
      this.raindropManager.spawnManual(point.x, point.z, 4.5);
    }
  }

  private hideSplash(): void {
    setTimeout(() => {
      const splash = document.getElementById('splash');
      if (splash) {
        splash.classList.add('hidden');
        setTimeout(() => splash.remove(), 1000);
      }
    }, 800);
  }

  private onResize(): void {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private updateFPS(dt: number): void {
    this.fpsFrameCount++;
    this.fpsAccumulator += dt;

    if (this.fpsAccumulator >= FPS_SAMPLE_WINDOW) {
      this.currentFPS = this.fpsFrameCount / this.fpsAccumulator;
      this.fpsAccumulator = 0;
      this.fpsFrameCount = 0;
      this.adaptQuality();
    }
  }

  private adaptQuality(): void {
    const oldLevel = this.qualityLevel;

    if (this.currentFPS < TARGET_FPS * 0.85) {
      this.qualityLevel = Math.max(MIN_QUALITY_LEVEL, this.qualityLevel - 1);
    } else if (this.currentFPS > TARGET_FPS * 1.2) {
      this.qualityLevel = Math.min(MAX_QUALITY_LEVEL, this.qualityLevel + 1);
    }

    if (oldLevel !== this.qualityLevel) {
      this.applyQualityLevel();
    }
  }

  private applyQualityLevel(): void {
    this.qualityDirty = true;

    switch (this.qualityLevel) {
      case MIN_QUALITY_LEVEL:
        this.spawnRateMultiplier = 0.4;
        this.trailEnabled = false;
        this.renderer.setPixelRatio(1);
        break;
      case 1:
        this.spawnRateMultiplier = 0.65;
        this.trailEnabled = false;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        break;
      case 2:
        this.spawnRateMultiplier = 0.85;
        this.trailEnabled = true;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        break;
      case MAX_QUALITY_LEVEL:
      default:
        this.spawnRateMultiplier = 1.0;
        this.trailEnabled = true;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        break;
    }

    this.raindropManager.setSpawnRate(
      Math.round(COUNT_RANGE[1] * 0.6 * this.spawnRateMultiplier)
    );
  }

  private resetScene(): void {
    this.raindropManager.clearAll();
    this.particleSystem.clearAll();

    this.currentMaterial = INITIAL_MATERIAL;
    this.switchMaterial(INITIAL_MATERIAL);
    this.uiController.updateMaterialDisplay(INITIAL_MATERIAL);

    this.raindropManager.setSpeed(INITIAL_SPEED);
    this.raindropManager.setSpawnRate(INITIAL_COUNT);
    this.uiController.updateSpeedDisplay(INITIAL_SPEED);
    this.uiController.updateCountDisplay(INITIAL_COUNT);

    this.qualityLevel = MAX_QUALITY_LEVEL;
    this.applyQualityLevel();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.updateFPS(dt);

    const scaledDt = this.qualityLevel === MIN_QUALITY_LEVEL ? dt * 0.85 : dt;

    this.raindropManager.update(scaledDt);
    this.particleSystem.update(scaledDt);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.controls.dispose();

    this.raindropManager.dispose();
    this.particleSystem.dispose();

    this.surfaceTextures.forEach(t => t.dispose());
    this.surface.geometry.dispose();
    (this.surface.material as THREE.Material).dispose();

    this.renderer.dispose();
    this.renderer.domElement.remove();

    window.removeEventListener('resize', () => this.onResize());
  }
}

new RainTalesApp();
