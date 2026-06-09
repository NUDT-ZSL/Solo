import * as THREE from 'three';
import { IceCrystalForest, IceCrystalConfig } from './IceCrystal';
import { Aurora } from './Aurora';
import { ParticleSystem } from './ParticleSystem';
import { UI, UIParams, UICallbacks } from './UI';

class App {
  scene: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  clock: THREE.Clock;
  forest: IceCrystalForest;
  aurora: Aurora;
  particleSystem: ParticleSystem;
  ui: UI;

  isDragging: boolean;
  previousMousePosition: { x: number; y: number };
  cameraAngle: { theta: number; phi: number };
  cameraDistance: number;
  cameraTarget: THREE.Vector3;

  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;

  constructor() {
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.cameraAngle = { theta: 0, phi: 0 };
    this.cameraDistance = 12;
    this.cameraTarget = new THREE.Vector3(0, 2, 0);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.initRenderer();
    this.initCamera();
    this.initLights();
    this.setBackground();

    const config: IceCrystalConfig = { baseOpacity: 0.4 };
    this.forest = new IceCrystalForest(this.scene, config);
    this.aurora = new Aurora(this.scene);
    this.particleSystem = new ParticleSystem(this.scene);

    const callbacks: UICallbacks = {
      onAuroraSpeedChange: (speed: number) => this.aurora.setColorSpeed(speed),
      onCrystalOpacityChange: (opacity: number) => this.forest.setOpacity(opacity),
      onParticleCountChange: (count: number) => {
        const crystalCount = this.forest.getTotalCrystalCount();
        this.particleSystem.setParticleCount(count, crystalCount);
      },
      onReset: () => this.resetScene()
    };
    this.ui = new UI(callbacks);

    this.setupEventListeners();
    this.animate();
  }

  initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.getElementById('canvas-container')!.appendChild(this.renderer.domElement);
  }

  initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();
  }

  initLights(): void {
    const ambientLight = new THREE.AmbientLight(0x112244, 0.6);
    this.scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0x4488FF, 0x001133, 0.4);
    this.scene.add(hemisphereLight);
  }

  setBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1A1A3A');
    gradient.addColorStop(1, '#0A0A1A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
    this.scene.fog = new THREE.FogExp2(0x0A0A1A, 0.03);
  }

  updateCameraPosition(): void {
    const maxPhi = (20 * Math.PI) / 180;
    const minPhi = (-20 * Math.PI) / 180;
    this.cameraAngle.phi = Math.max(minPhi, Math.min(maxPhi, this.cameraAngle.phi));

    const x = this.cameraDistance * Math.sin(this.cameraAngle.theta) * Math.cos(this.cameraAngle.phi);
    const y = this.cameraDistance * Math.sin(this.cameraAngle.phi) + 3;
    const z = this.cameraDistance * Math.cos(this.cameraAngle.theta) * Math.cos(this.cameraAngle.phi);

    this.camera.position.set(
      this.cameraTarget.x + x,
      this.cameraTarget.y + y,
      this.cameraTarget.z + z
    );
    this.camera.lookAt(this.cameraTarget);
  }

  setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;
        this.cameraAngle.theta -= deltaX * 0.005;
        this.cameraAngle.phi += deltaY * 0.005;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      this.cameraDistance += e.deltaY * 0.01;
      this.cameraDistance = Math.max(3, Math.min(20, this.cameraDistance));
    }, { passive: false });

    canvas.addEventListener('click', (e: MouseEvent) => {
      if (this.isDragging) return;

      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const meshes = this.forest.getAllMeshes();
      const intersects = this.raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const crystal = this.forest.findCrystalByMesh(hitMesh);
        if (crystal) {
          crystal.triggerGrowth();
          const auroraColor = this.aurora.getCurrentColor();
          this.particleSystem.emit(crystal.group.position.clone(), auroraColor);
          this.forest.group.add(crystal.group);
          crystal.children.forEach(child => {
            this.forest.group.add(child.group);
            this.forest.crystals.push(child as any);
          });
        }
      }
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  resetScene(): void {
    const params: UIParams = this.ui.getParams();
    const config: IceCrystalConfig = { baseOpacity: params.crystalOpacity };
    this.forest.reset(config);
    this.aurora.reset();
    this.particleSystem.reset();
    this.aurora.setColorSpeed(params.auroraSpeed);
    this.particleSystem.setParticleCount(params.particleCount, this.forest.getTotalCrystalCount());
    this.cameraAngle = { theta: 0, phi: 0 };
    this.cameraDistance = 12;
  }

  animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    this.updateCameraPosition();

    const auroraColor = this.aurora.update(delta);
    this.forest.update(delta, time, auroraColor);
    this.particleSystem.update(delta);

    this.ui.updateFPS();
    this.ui.updateCrystalCount(this.forest.getTotalCrystalCount());
    this.ui.updateAuroraColor({
      r: auroraColor.r,
      g: auroraColor.g,
      b: auroraColor.b
    });

    const crystalCount = this.forest.getTotalCrystalCount();
    this.particleSystem.setParticleCount(this.ui.getParams().particleCount, crystalCount);

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
