import * as THREE from 'three';
import { buildTerrain, type TerrainData } from './terrain';
import { FloodController } from './flood';

const YEAR_MIN = 2020;
const YEAR_MAX = 2100;
const LEVEL_MIN = 0;
const LEVEL_MAX = 10;
const CAMERA_AZIMUTH = Math.PI / 4;
const CAMERA_ELEVATION = Math.PI / 6;
const CAMERA_DISTANCE = 200;
const CAMERA_TARGET = new THREE.Vector3(0, 5, 0);

interface AppState {
  currentYear: number;
  currentLevel: number;
  submergedPercent: number;
}

class CoastalFloodApp {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private terrainData!: TerrainData;
  private floodController!: FloodController;
  private clock: THREE.Clock;
  private appState: AppState = {
    currentYear: YEAR_MIN,
    currentLevel: LEVEL_MIN,
    submergedPercent: 0,
  };

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private cameraAzimuth: number = CAMERA_AZIMUTH;
  private cameraElevation: number = CAMERA_ELEVATION;
  private cameraDistance: number = CAMERA_DISTANCE;

  private yearSlider!: HTMLInputElement;
  private yearValueEl!: HTMLElement;
  private levelValueEl!: HTMLElement;
  private percentValueEl!: HTMLElement;
  private sliderYearEl!: HTMLElement;

  private displayState: AppState = {
    currentYear: YEAR_MIN,
    currentLevel: LEVEL_MIN,
    submergedPercent: 0,
  };

  constructor() {
    this.container = document.getElementById('app') as HTMLElement;
    if (!this.container) {
      throw new Error('Container #app not found');
    }

    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = new THREE.Fog(0x0a1a3a, 150, 400);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.setupUI();
    this.setupLights();
    this.setupTerrain();
    this.setupInteraction();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private setupUI(): void {
    this.yearSlider = document.getElementById('yearSlider') as HTMLInputElement;
    this.yearValueEl = document.getElementById('yearValue') as HTMLElement;
    this.levelValueEl = document.getElementById('levelValue') as HTMLElement;
    this.percentValueEl = document.getElementById('percentValue') as HTMLElement;
    this.sliderYearEl = document.getElementById('sliderYear') as HTMLElement;

    this.yearSlider.addEventListener('input', (e) => {
      const year = parseInt((e.target as HTMLInputElement).value, 10);
      this.setYear(year);
    });

    this.updateInfoDisplay(0, true);
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xb8d4ff, 0x3a5f3a, 0.35);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff0dd, 1.1);
    sun.position.set(80, 120, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 500;
    sun.shadow.camera.left = -150;
    sun.shadow.camera.right = 150;
    sun.shadow.camera.top = 150;
    sun.shadow.camera.bottom = -150;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    const fillLight = new THREE.DirectionalLight(0x6688cc, 0.25);
    fillLight.position.set(-60, 40, -40);
    this.scene.add(fillLight);
  }

  private setupTerrain(): void {
    this.terrainData = buildTerrain();
    this.scene.add(this.terrainData.group);
    this.floodController = new FloodController(this.terrainData, this.scene);
  }

  private setupInteraction(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      canvas.style.cursor = 'grab';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;

      this.cameraAzimuth -= dx * 0.005;
      this.cameraElevation = Math.max(
        0.05,
        Math.min(Math.PI / 2 - 0.05, this.cameraElevation + dy * 0.005)
      );

      this.updateCameraPosition();

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    canvas.style.cursor = 'grab';

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
      this.cameraDistance = Math.max(50, Math.min(400, this.cameraDistance * zoomFactor));
      this.updateCameraPosition();
    }, { passive: false });

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartDist = 0;

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        this.lastMouseX = touchStartX;
        this.lastMouseY = touchStartY;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDist = Math.sqrt(dx * dx + dy * dy);
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && this.isDragging) {
        const dx = e.touches[0].clientX - this.lastMouseX;
        const dy = e.touches[0].clientY - this.lastMouseY;

        this.cameraAzimuth -= dx * 0.005;
        this.cameraElevation = Math.max(
          0.05,
          Math.min(Math.PI / 2 - 0.05, this.cameraElevation + dy * 0.005)
        );

        this.updateCameraPosition();

        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const scale = touchStartDist / dist;
        this.cameraDistance = Math.max(50, Math.min(400, this.cameraDistance * scale));
        this.updateCameraPosition();
        touchStartDist = dist;
      }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  private updateCameraPosition(): void {
    const x = CAMERA_TARGET.x + this.cameraDistance * Math.cos(this.cameraElevation) * Math.cos(this.cameraAzimuth);
    const y = CAMERA_TARGET.y + this.cameraDistance * Math.sin(this.cameraElevation);
    const z = CAMERA_TARGET.z + this.cameraDistance * Math.cos(this.cameraElevation) * Math.sin(this.cameraAzimuth);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(CAMERA_TARGET);
  }

  private yearToLevel(year: number): number {
    const t = (year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN);
    const eased = t * t * (3 - 2 * t);
    return LEVEL_MIN + (LEVEL_MAX - LEVEL_MIN) * eased;
  }

  private setYear(year: number): void {
    this.appState.currentYear = year;
    this.appState.currentLevel = this.yearToLevel(year);
    this.floodController.setWaterLevel(this.appState.currentLevel);
    this.sliderYearEl.textContent = year.toString();
  }

  private updateInfoDisplay(dt: number, force: boolean = false): void {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const speed = 8;
    const safeDt = dt || 0.016;
    const t = Math.min(1, speed * safeDt);

    let changed = false;

    if (Math.abs(this.displayState.currentYear - this.appState.currentYear) > 0.1) {
      this.displayState.currentYear = lerp(this.displayState.currentYear, this.appState.currentYear, t);
      changed = true;
    } else {
      this.displayState.currentYear = this.appState.currentYear;
    }

    if (Math.abs(this.displayState.currentLevel - this.appState.currentLevel) > 0.005) {
      this.displayState.currentLevel = lerp(this.displayState.currentLevel, this.appState.currentLevel, t);
      changed = true;
    } else {
      this.displayState.currentLevel = this.appState.currentLevel;
    }

    if (Math.abs(this.displayState.submergedPercent - this.appState.submergedPercent) > 0.05) {
      this.displayState.submergedPercent = lerp(this.displayState.submergedPercent, this.appState.submergedPercent, t);
      changed = true;
    } else {
      this.displayState.submergedPercent = this.appState.submergedPercent;
    }

    if (changed || force) {
      this.animateValue(this.yearValueEl, Math.round(this.displayState.currentYear).toString());
      this.animateValue(this.levelValueEl, `${this.displayState.currentLevel.toFixed(2)} m`);
      this.animateValue(this.percentValueEl, `${this.displayState.submergedPercent.toFixed(2)}%`);
    }
  }

  private animateValue(el: HTMLElement, newValue: string): void {
    if (el.dataset.lastValue !== newValue) {
      el.classList.add('updating');
      setTimeout(() => {
        el.textContent = newValue;
        el.classList.remove('updating');
      }, 150);
      el.dataset.lastValue = newValue;
    }
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  public start(): void {
    const animate = () => {
      requestAnimationFrame(animate);

      const delta = this.clock.getDelta() || 0.016;
      const safeDelta = Math.min(delta, 0.05);

      const floodState = this.floodController.update(safeDelta);
      this.appState.currentLevel = floodState.waterLevel;
      this.appState.submergedPercent = floodState.submergedPercent;

      this.updateInfoDisplay(safeDelta);

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const app = new CoastalFloodApp();
    app.start();
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
});
