import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TreeSystem, type ForestType } from './TreeSystem';
import { ResourceSystem } from './ResourceSystem';
import { UIPanel, type UIParams } from './UIPanel';

const GROUND_SIZE = 20;

class ForestApp {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private treeSystem: TreeSystem;
  private resourceSystem: ResourceSystem;
  private uiPanel: UIPanel;

  private clock: THREE.Clock;
  private frameCount: number = 0;
  private fpsTimer: number = 0;
  private isPlaying: boolean = true;
  private currentForestType: ForestType = 'mixed';
  private rafId: number | null = null;

  constructor() {
    this.container = document.getElementById('canvas-container')!;

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.setupGround();
    this.setupLighting();
    this.setupFog();

    this.treeSystem = new TreeSystem(this.scene);
    this.resourceSystem = new ResourceSystem(this.scene);
    this.uiPanel = new UIPanel();

    this.clock = new THREE.Clock();

    this.bindUI();
    this.initScene();
    this.onResize();

    window.addEventListener('resize', () => this.onResize());
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    camera.position.set(0, 10, 10);
    camera.lookAt(0, 1.5, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.target.set(0, 1.5, 0);
    controls.enablePan = true;
    controls.panSpeed = 0.8;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.9;
    return controls;
  }

  private setupGround(): void {
    const groundGeo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2D2418,
      roughness: 0.95,
      metalness: 0.0
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(
      GROUND_SIZE,
      GROUND_SIZE,
      0x3A4A3A,
      0x3A4A3A
    );
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.35;
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x4A5568, 0.55);
    this.scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x3E2723, 0.35);
    this.scene.add(hemisphereLight);

    const sunLight = new THREE.DirectionalLight(0xFFF5E1, 1.2);
    sunLight.position.set(8, 14, 6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 50;
    sunLight.shadow.camera.left = -GROUND_SIZE / 2 - 2;
    sunLight.shadow.camera.right = GROUND_SIZE / 2 + 2;
    sunLight.shadow.camera.top = GROUND_SIZE / 2 + 2;
    sunLight.shadow.camera.bottom = -GROUND_SIZE / 2 - 2;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x88AAFF, 0.25);
    fillLight.position.set(-6, 8, -4);
    this.scene.add(fillLight);
  }

  private setupFog(): void {
    this.scene.fog = new THREE.Fog(0x0B1A2E, 18, 45);
  }

  private bindUI(): void {
    this.uiPanel.onChange((params: UIParams) => this.onParamsChange(params));
  }

  private initScene(): void {
    const initialParams = this.uiPanel.getParams();
    this.currentForestType = initialParams.forestType;
    this.isPlaying = initialParams.isPlaying;

    this.treeSystem.generateTrees(this.currentForestType);
    this.resourceSystem.setTrees(this.treeSystem.getTrees());
    this.resourceSystem.setLightIntensity(initialParams.lightIntensity);
    this.resourceSystem.setSoilMoisture(initialParams.soilMoisture);
    this.treeSystem.setMycorrhizaStrength(initialParams.mycorrhizaStrength);

    this.uiPanel.setTreeCount(this.treeSystem.getTreeCount());
  }

  private onParamsChange(params: UIParams): void {
    this.isPlaying = params.isPlaying;

    this.resourceSystem.setLightIntensity(params.lightIntensity);
    this.resourceSystem.setSoilMoisture(params.soilMoisture);

    this.treeSystem.setMycorrhizaStrength(params.mycorrhizaStrength);

    if (params.forestType !== this.currentForestType) {
      this.currentForestType = params.forestType;
      this.treeSystem.generateTrees(this.currentForestType);
      this.resourceSystem.setTrees(this.treeSystem.getTrees());
      this.resourceSystem.resetStats();
      this.uiPanel.setTreeCount(this.treeSystem.getTreeCount());
    }
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private update(): void {
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.controls.update();
    this.resourceSystem.update(deltaTime, this.isPlaying);

    this.frameCount++;
    this.fpsTimer += deltaTime;
    if (this.fpsTimer >= 0.5) {
      const fps = this.frameCount / this.fpsTimer;
      this.uiPanel.setFPS(fps);
      this.frameCount = 0;
      this.fpsTimer = 0;
      this.uiPanel.setParticleCount(this.resourceSystem.getActiveParticleCount());
    }
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);
    this.update();
    this.render();
  };

  start(): void {
    this.animate();
  }

  dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    this.treeSystem.dispose();
    this.resourceSystem.dispose();

    window.removeEventListener('resize', () => this.onResize());

    this.controls.dispose();
    this.renderer.dispose();

    this.container.removeChild(this.renderer.domElement);
  }
}

let app: ForestApp | null = null;

function bootstrap(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
  } else {
    onReady();
  }
}

function onReady(): void {
  app = new ForestApp();
  app.start();
}

bootstrap();
