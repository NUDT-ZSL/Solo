import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WindField, WindFieldMode } from './windField';
import { ParticleSystem } from './particleSystem';
import { UIController } from './ui';

class WindFieldApp {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private canvas!: HTMLCanvasElement;

  private windField!: WindField;
  private particleSystem!: ParticleSystem;
  private uiController!: UIController;

  private gridHelper!: THREE.Group;

  private raycaster!: THREE.Raycaster;
  private mouseNDC!: THREE.Vector2;
  private emissionPlane!: THREE.Plane;
  private isMouseOverCanvas: boolean = false;

  private clock!: THREE.Clock;
  private fpsAccumulator: number = 0;
  private fpsFrameCount: number = 0;
  private currentFps: number = 60;

  private isTransitioning: boolean = false;

  constructor() {
    this.init();
  }

  private init(): void {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    this.initThree();
    this.initWindField();
    this.initParticleSystem();
    this.initGrid();
    this.initUI();
    this.initMouseInteraction();
    this.initResizeHandler();

    this.clock = new THREE.Clock();
    this.animate();
  }

  private initThree(): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a1628, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a1628, 0.025);

    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 200);
    this.camera.position.set(18, 14, 20);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0, 0);
    this.controls.minDistance = 5;
    this.controls.maxDistance = 80;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(10, 15, 10);
    this.scene.add(dirLight);

    this.updateRendererSize();
  }

  private initWindField(): void {
    this.windField = new WindField(20, 20, 10);
  }

  private initParticleSystem(): void {
    this.particleSystem = new ParticleSystem(this.scene, this.windField);
  }

  private initGrid(): void {
    this.gridHelper = new THREE.Group();

    const { min, max } = this.windField.bounds;
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0x0099cc,
      transparent: true,
      opacity: 0.15
    });

    const xSize = max.x - min.x;
    const ySize = max.y - min.y;
    const zSize = max.z - min.z;

    for (let ix = 0; ix <= this.windField.gridSize.x; ix += 4) {
      const x = min.x + (ix / this.windField.gridSize.x) * xSize;
      const points = [
        new THREE.Vector3(x, min.y, min.z),
        new THREE.Vector3(x, max.y, min.z),
        new THREE.Vector3(x, max.y, max.z),
        new THREE.Vector3(x, min.y, max.z),
        new THREE.Vector3(x, min.y, min.z)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, gridMaterial);
      this.gridHelper.add(line);
    }

    for (let iy = 0; iy <= this.windField.gridSize.y; iy += 4) {
      const y = min.y + (iy / this.windField.gridSize.y) * ySize;
      const points = [
        new THREE.Vector3(min.x, y, min.z),
        new THREE.Vector3(max.x, y, min.z),
        new THREE.Vector3(max.x, y, max.z),
        new THREE.Vector3(min.x, y, max.z),
        new THREE.Vector3(min.x, y, min.z)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, gridMaterial);
      this.gridHelper.add(line);
    }

    for (let iz = 0; iz <= this.windField.gridSize.z; iz += 2) {
      const z = min.z + (iz / this.windField.gridSize.z) * zSize;
      const points = [
        new THREE.Vector3(min.x, min.y, z),
        new THREE.Vector3(max.x, min.y, z),
        new THREE.Vector3(max.x, max.y, z),
        new THREE.Vector3(min.x, max.y, z),
        new THREE.Vector3(min.x, min.y, z)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, gridMaterial);
      this.gridHelper.add(line);
    }

    this.scene.add(this.gridHelper);
  }

  private initUI(): void {
    this.uiController = new UIController('ui-container', {
      onWindModeChange: (mode: WindFieldMode) => this.handleWindModeChange(mode),
      onParticleLifeChange: (value: number) => {
        this.particleSystem.params.particleLife = value;
      },
      onEmissionRateChange: (value: number) => {
        this.particleSystem.params.emissionRate = value;
      },
      onSpeedMultiplierChange: (value: number) => {
        this.particleSystem.params.speedMultiplier = value;
      },
      onGridToggle: (show: boolean) => {
        this.gridHelper.visible = show;
      }
    });
  }

  private initMouseInteraction(): void {
    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();
    this.emissionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.isMouseOverCanvas = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isMouseOverCanvas = false;
    });

    this.canvas.addEventListener('mouseenter', () => {
      this.isMouseOverCanvas = true;
    });
  }

  private initResizeHandler(): void {
    window.addEventListener('resize', () => this.updateRendererSize());
  }

  private updateRendererSize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private handleWindModeChange(mode: WindFieldMode): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    this.particleSystem.setFadeOut();

    setTimeout(() => {
      this.windField.generateField(mode);
      this.particleSystem.resetParticles();
      this.particleSystem.setFadeIn();
      this.isTransitioning = false;
    }, 250);
  }

  private getEmissionPoint(): THREE.Vector3 | null {
    if (!this.isMouseOverCanvas) return null;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);

    const target = new THREE.Vector3();
    const distance = this.raycaster.ray.distanceToPoint(this.controls.target);
    this.raycaster.ray.at(Math.max(5, distance * 0.6), target);

    const { min, max } = this.windField.bounds;
    target.x = THREE.MathUtils.clamp(target.x, min.x + 0.5, max.x - 0.5);
    target.y = THREE.MathUtils.clamp(target.y, min.y + 0.5, max.y - 0.5);
    target.z = THREE.MathUtils.clamp(target.z, min.z + 0.5, max.z - 0.5);

    return target;
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.fpsAccumulator += deltaTime;
    this.fpsFrameCount++;
    if (this.fpsAccumulator >= 0.5) {
      this.currentFps = this.fpsFrameCount / this.fpsAccumulator;
      this.fpsAccumulator = 0;
      this.fpsFrameCount = 0;
    }

    const emissionPoint = this.getEmissionPoint();
    this.particleSystem.setEmissionPoint(emissionPoint);

    this.particleSystem.update(deltaTime);
    this.controls.update();

    this.renderer.render(this.scene, this.camera);

    this.uiController.updateStats(this.currentFps, this.particleSystem.getParticleCount());
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new WindFieldApp();
});
