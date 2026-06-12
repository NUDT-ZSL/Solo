import * as THREE from 'three';

export type ThemeName = 'neon' | 'aurora' | 'retro';

export interface ThemeConfig {
  background: number;
  barBottom: number;
  barTop: number;
}

export const THEMES: Record<ThemeName, ThemeConfig> = {
  neon: { background: 0x0a0a23, barBottom: 0xff00ff, barTop: 0x00ffff },
  aurora: { background: 0x001a33, barBottom: 0x00ff88, barTop: 0xff6600 },
  retro: { background: 0x1a0a00, barBottom: 0xff8800, barTop: 0xffcc00 },
};

const BAR_COUNT = 64;
const BAR_RADIUS = 12;
const BAR_WIDTH = 0.6;
const BAR_DEPTH = 0.6;
const BAR_BASE_HEIGHT = 0.5;
const BAR_MAX_HEIGHT = 8;
const SPHERE_RADIUS = 0.15;
const SMOOTH_DURATION = 0.15;
const MIN_DISTANCE = 3;
const MAX_DISTANCE = 20;
const ROTATE_SPEED = 0.5;
const AUTO_ROTATE_PERIOD = 10;
const THEME_TRANSITION_DURATION = 0.5;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function lerpColor(a: THREE.Color, b: THREE.Color, t: number, out: THREE.Color): THREE.Color {
  out.r = a.r + (b.r - a.r) * t;
  out.g = a.g + (b.g - a.g) * t;
  out.b = a.b + (b.b - a.b) * t;
  return out;
}

interface BarState {
  targetHeight: number;
  currentHeight: number;
  startHeight: number;
  animStartTime: number;
}

export class Visualizer3D {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private bars: THREE.Mesh[] = [];
  private barMaterials: THREE.MeshStandardMaterial[] = [];
  private spheres: THREE.Mesh[] = [];
  private sphereMaterials: THREE.MeshStandardMaterial[] = [];
  private barStates: BarState[] = [];

  private theme: ThemeName = 'neon';
  private targetTheme: ThemeName = 'neon';
  private themeTransitionStart: number = 0;
  private currentThemeData = { bottom: new THREE.Color(), top: new THREE.Color() };
  private prevThemeData = { bottom: new THREE.Color(), top: new THREE.Color() };

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private rotationY: number = 0;
  private rotationX: number = (30 * Math.PI) / 180;
  private targetRotationY: number = 0;
  private distance: number = 18;
  private userInteractedAt: number = 0;

  private fpsDisplay: HTMLDivElement;
  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  private animationId: number = 0;

  private _barCount = BAR_COUNT;

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    this.applyThemeColors();
    this.setupLights();
    this.setupBars();
    this.setupInteraction();
    this.fpsDisplay = this.setupFpsDisplay();
    this.updateCameraPosition();

    window.addEventListener('resize', this.onResize);
    this.onResize();

    this.startLoop();
  }

  public get barCount(): number {
    return this._barCount;
  }

  private applyThemeColors(): void {
    const cfg = THEMES[this.theme];
    this.scene.background = new THREE.Color(cfg.background);
    this.prevThemeData.bottom.setHex(THEMES[this.theme].barBottom);
    this.prevThemeData.top.setHex(THEMES[this.theme].barTop);
    this.currentThemeData.bottom.setHex(THEMES[this.theme].barBottom);
    this.currentThemeData.top.setHex(THEMES[this.theme].barTop);
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(10, 20, 10);
    dir.castShadow = true;
    this.scene.add(dir);

    const point = new THREE.PointLight(0xffffff, 0.6, 50);
    point.position.set(0, 10, 0);
    this.scene.add(point);
  }

  private setupBars(): void {
    const barGeometry = new THREE.BoxGeometry(BAR_WIDTH, BAR_BASE_HEIGHT, BAR_DEPTH);
    const sphereGeometry = new THREE.SphereGeometry(SPHERE_RADIUS, 16, 16);

    for (let i = 0; i < BAR_COUNT; i++) {
      const angle = (-Math.PI / 2) + (i / (BAR_COUNT - 1)) * Math.PI;
      const x = Math.cos(angle) * BAR_RADIUS;
      const z = Math.sin(angle) * BAR_RADIUS;

      const barMat = new THREE.MeshStandardMaterial({
        color: 0x0000ff,
        roughness: 0.3,
        metalness: 0.5,
      });
      const bar = new THREE.Mesh(barGeometry, barMat);
      bar.position.set(x, BAR_BASE_HEIGHT / 2, z);
      bar.rotation.y = -angle;
      bar.castShadow = true;
      bar.receiveShadow = true;
      this.scene.add(bar);
      this.bars.push(bar);
      this.barMaterials.push(barMat);

      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        roughness: 0.3,
        metalness: 0.5,
        emissive: 0xff0000,
        emissiveIntensity: 0.3,
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMat);
      sphere.position.set(x, BAR_BASE_HEIGHT + SPHERE_RADIUS, z);
      sphere.rotation.y = -angle;
      sphere.castShadow = true;
      this.scene.add(sphere);
      this.spheres.push(sphere);
      this.sphereMaterials.push(sphereMat);

      this.barStates.push({
        targetHeight: BAR_BASE_HEIGHT,
        currentHeight: BAR_BASE_HEIGHT,
        startHeight: BAR_BASE_HEIGHT,
        animStartTime: 0,
      });
    }

    const floorGeometry = new THREE.RingGeometry(BAR_RADIUS - 3, BAR_RADIUS + 3, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111122,
      roughness: 0.8,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  private setupInteraction(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.userInteractedAt = performance.now();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.targetRotationY += (dx * ROTATE_SPEED * Math.PI) / 180;
      this.rotationX = Math.max(
        0.05,
        Math.min(Math.PI / 2 - 0.05, this.rotationX + (dy * ROTATE_SPEED * Math.PI) / 180)
      );
      this.userInteractedAt = performance.now();
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.distance = Math.max(
        MIN_DISTANCE,
        Math.min(MAX_DISTANCE, this.distance + e.deltaY * 0.01)
      );
      this.userInteractedAt = performance.now();
    }, { passive: false });

    dom.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
        this.userInteractedAt = performance.now();
      }
    });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    window.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - this.lastMouseX;
      const dy = t.clientY - this.lastMouseY;
      this.lastMouseX = t.clientX;
      this.lastMouseY = t.clientY;
      this.targetRotationY += (dx * ROTATE_SPEED * Math.PI) / 180;
      this.rotationX = Math.max(
        0.05,
        Math.min(Math.PI / 2 - 0.05, this.rotationX + (dy * ROTATE_SPEED * Math.PI) / 180)
      );
      this.userInteractedAt = performance.now();
    });
  }

  private setupFpsDisplay(): HTMLDivElement {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.top = '60px';
    el.style.right = '16px';
    el.style.fontSize = '12px';
    el.style.color = '#ffffff';
    el.style.background = 'rgba(0,0,0,0.5)';
    el.style.padding = '4px 8px';
    el.style.borderRadius = '4px';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '100';
    el.textContent = 'FPS: 0';
    this.container.appendChild(el);
    return el;
  }

  private onResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private updateCameraPosition(): void {
    const x = Math.sin(this.rotationY) * Math.cos(this.rotationX) * this.distance;
    const y = Math.sin(this.rotationX) * this.distance;
    const z = Math.cos(this.rotationY) * Math.cos(this.rotationX) * this.distance;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 2, 0);
  }

  public setTheme(theme: ThemeName): void {
    if (this.theme === theme) return;
    this.prevThemeData.bottom.copy(this.currentThemeData.bottom);
    this.prevThemeData.top.copy(this.currentThemeData.top);
    this.targetTheme = theme;
    this.theme = theme;
    this.themeTransitionStart = performance.now();
    this.scene.background = new THREE.Color(THEMES[theme].background);
  }

  public updateFrequencyData(data: number[]): void {
    const now = performance.now();
    for (let i = 0; i < BAR_COUNT; i++) {
      const raw = data[i] ?? 0;
      const targetHeight = BAR_BASE_HEIGHT + raw * BAR_MAX_HEIGHT;
      const state = this.barStates[i];
      if (Math.abs(state.targetHeight - targetHeight) > 0.001) {
        state.startHeight = state.currentHeight;
        state.targetHeight = targetHeight;
        state.animStartTime = now;
      }
    }
  }

  private startLoop(): void {
    const loop = () => {
      this.animationId = requestAnimationFrame(loop);
      this.update(performance.now());
      this.renderer.render(this.scene, this.camera);
      this.updateFps();
    };
    this.animationId = requestAnimationFrame(loop);
  }

  private update(now: number): void {
    const autoRotateActive = now - this.userInteractedAt > 3000;
    if (autoRotateActive && !this.isDragging) {
      this.targetRotationY += (2 * Math.PI) / (AUTO_ROTATE_PERIOD * 60);
    }
    this.rotationY += (this.targetRotationY - this.rotationY) * 0.1;

    this.updateThemeColors(now);
    this.updateBarHeights(now);
    this.updateCameraPosition();
  }

  private updateThemeColors(now: number): void {
    const target = THEMES[this.targetTheme];
    const targetBottom = new THREE.Color(target.barBottom);
    const targetTop = new THREE.Color(target.barTop);
    const t = Math.min(1, (now - this.themeTransitionStart) / (THEME_TRANSITION_DURATION * 1000));
    const eased = easeOutCubic(t);
    lerpColor(this.prevThemeData.bottom, targetBottom, eased, this.currentThemeData.bottom);
    lerpColor(this.prevThemeData.top, targetTop, eased, this.currentThemeData.top);
  }

  private updateBarHeights(now: number): void {
    const tmpColor = new THREE.Color();
    for (let i = 0; i < BAR_COUNT; i++) {
      const state = this.barStates[i];
      const animElapsed = (now - state.animStartTime) / 1000;
      const t = Math.min(1, animElapsed / SMOOTH_DURATION);
      const eased = easeOutCubic(t);
      state.currentHeight = state.startHeight + (state.targetHeight - state.startHeight) * eased;

      const bar = this.bars[i];
      const h = state.currentHeight;
      bar.scale.y = h / BAR_BASE_HEIGHT;
      const ratio = (h - BAR_BASE_HEIGHT) / BAR_MAX_HEIGHT;
      const yPos = h / 2;
      bar.position.y = yPos;

      const sphere = this.spheres[i];
      sphere.position.y = h + SPHERE_RADIUS;

      const bottom = this.currentThemeData.bottom;
      const top = this.currentThemeData.top;
      lerpColor(bottom, top, Math.max(0, Math.min(1, ratio)), tmpColor);

      this.barMaterials[i].color.copy(tmpColor);
      this.barMaterials[i].emissive.copy(tmpColor);
      this.barMaterials[i].emissiveIntensity = 0.15 + ratio * 0.25;

      this.sphereMaterials[i].color.copy(top);
      this.sphereMaterials[i].emissive.copy(top);
      this.sphereMaterials[i].emissiveIntensity = 0.3 + ratio * 0.5;
    }
  }

  private updateFps(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.fpsDisplay.textContent = `FPS: ${fps}`;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    if (this.fpsDisplay.parentElement === this.container) {
      this.container.removeChild(this.fpsDisplay);
    }
  }
}
