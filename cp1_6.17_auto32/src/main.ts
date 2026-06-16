import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WeatherSystem, SYSTEM_INFO } from './weatherSystem';
import type { SystemType } from './weatherSystem';
import { ParticleRenderer } from './particleRenderer';
import { UIPanel } from './uiPanel';
import type { UIParams } from './uiPanel';

class WeatherSimulationApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private weatherSystem: WeatherSystem;
  private particleRenderer: ParticleRenderer;
  private uiPanel: UIPanel;
  private clock: THREE.Clock;
  private simTime: number = 0;
  private isPaused: boolean = false;
  private rafId: number | null = null;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsAccumulator: number = 0;
  private currentFps: number = 60;
  private lastSystemType: SystemType;
  private container: HTMLElement;
  private stars: THREE.Points | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container #${containerId} not found`);
    this.container = container;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.camera.position.set(0, 5, 12);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 35;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.target.set(0, 2, 0);

    this.weatherSystem = new WeatherSystem('coldFront');
    this.lastSystemType = 'coldFront';
    this.particleRenderer = new ParticleRenderer(this.scene);
    this.particleRenderer.init(this.weatherSystem.getParticleCount());

    this.createGroundGrid();
    this.createStars();
    this.setupLighting();

    this.uiPanel = new UIPanel(document.getElementById('app') || document.body);
    this.uiPanel.addEventListener((params: UIParams) => this.onParamsChange(params));

    this.clock = new THREE.Clock();
    this.onWindowResize();
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private createGroundGrid(): void {
    const gridSize = 30;
    const gridDivisions = 30;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0xffffff, 0xffffff);
    const gridMaterial = gridHelper.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.15;
    gridHelper.position.y = 0;
    this.scene.add(gridHelper);

    const planeGeo = new THREE.PlaneGeometry(gridSize, gridSize);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x1a237e,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.001;
    this.scene.add(plane);
  }

  private createStars(): void {
    const starCount = 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 40 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1) * 0.5;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 5;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const brightness = 0.6 + Math.random() * 0.4;
      const tint = 0.85 + Math.random() * 0.15;
      colors[i * 3] = brightness * tint;
      colors[i * 3 + 1] = brightness * tint;
      colors[i * 3 + 2] = brightness;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      depthWrite: false
    });
    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 7);
    this.scene.add(dir);
  }

  private onWindowResize(): void {
    const canvasContainer = this.container;
    const width = canvasContainer.clientWidth || window.innerWidth;
    const height = canvasContainer.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.particleRenderer.resize();
  }

  private onParamsChange(params: UIParams): void {
    if (params.systemType !== this.lastSystemType) {
      this.weatherSystem.setSystemType(params.systemType);
      this.particleRenderer.setParticleCount(this.weatherSystem.getParticleCount());
      this.lastSystemType = params.systemType;
      this.simTime = 0;
    }
    this.weatherSystem.updateParams(params.tempDiff, params.humidity, params.windSpeed);
    this.isPaused = params.isPaused;
  }

  public start(): void {
    this.clock.start();
    this.lastFrameTime = performance.now();
    this.animate();
  }

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);
    const now = performance.now();
    const rawDt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    const minDt = 1 / 240;
    const maxDt = 1 / 30;
    const dt = Math.max(minDt, Math.min(maxDt, rawDt));

    this.frameCount++;
    this.fpsAccumulator += rawDt;
    if (this.fpsAccumulator >= 0.5) {
      this.currentFps = this.frameCount / this.fpsAccumulator;
      this.frameCount = 0;
      this.fpsAccumulator = 0;
    }

    if (!this.isPaused) {
      this.simTime += dt;
      const maxDuration = SYSTEM_INFO[this.weatherSystem.getSystemType()].duration;
      if (this.simTime >= maxDuration) {
        this.simTime = 0;
      }
      this.weatherSystem.update(this.simTime, dt);
      const particleData = this.weatherSystem.getParticleData();
      this.particleRenderer.update(particleData);
    }

    if (this.stars) {
      this.stars.rotation.y += dt * 0.005;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    this.uiPanel.updateInfo(
      this.weatherSystem.getSystemType(),
      this.weatherSystem.getParticleCount(),
      this.simTime,
      this.currentFps
    );
  };

  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public dispose(): void {
    this.stop();
    this.uiPanel.dispose();
    this.particleRenderer.dispose();
    window.removeEventListener('resize', () => this.onWindowResize());
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}

let app: WeatherSimulationApp | null = null;

function initApp(): void {
  if (!document.getElementById('canvas-container')) return;
  try {
    app = new WeatherSimulationApp('canvas-container');
    app.start();
  } catch (err) {
    console.error('Failed to initialize weather simulation:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

export default app;
