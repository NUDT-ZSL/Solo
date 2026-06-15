import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CONSTELLATIONS } from './constellationData';
import { InteractionManager } from './interaction';
import { UIManager, MusicPlayer } from './ui';

class StarField {
  private particles: THREE.Points;
  private baseOpacity: Float32Array;
  private blinkPhase: Float32Array;
  private particleCount: number;

  constructor(scene: THREE.Scene) {
    this.particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);
    this.baseOpacity = new Float32Array(this.particleCount);
    this.blinkPhase = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 80 + Math.random() * 120;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      sizes[i] = (0.05 + Math.random() * 0.1) * 10;
      this.baseOpacity[i] = 0.4 + Math.random() * 0.6;
      this.blinkPhase[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(200, 220, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(180, 200, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(150, 180, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(100, 140, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.5,
      map: texture,
      transparent: true,
      opacity: 0.8,
      vertexColors: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.particles = new THREE.Points(geometry, material);
    scene.add(this.particles);
  }

  public update(elapsedTime: number): void {
    const material = this.particles.material as THREE.PointsMaterial;
    material.opacity = 0.6 + 0.2 * Math.sin(elapsedTime * 0.5);
    this.particles.rotation.y = elapsedTime * 0.005;
  }
}

class NebulaBackground {
  private mesh: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    const geometry = new THREE.SphereGeometry(150, 32, 32);

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const bgGradient = ctx.createLinearGradient(0, 0, 0, 512);
    bgGradient.addColorStop(0, '#0A0A12');
    bgGradient.addColorStop(1, '#050510');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1024, 512);

    for (let i = 0; i < 8; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = 100 + Math.random() * 200;
      const nebulaGradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      const hue = 200 + Math.random() * 60;
      nebulaGradient.addColorStop(0, `hsla(${hue}, 70%, 30%, 0.15)`);
      nebulaGradient.addColorStop(0.5, `hsla(${hue + 20}, 60%, 20%, 0.08)`);
      nebulaGradient.addColorStop(1, 'hsla(220, 50%, 10%, 0)');
      ctx.fillStyle = nebulaGradient;
      ctx.fillRect(0, 0, 1024, 512);
    }

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.9
    });

    this.mesh = new THREE.Mesh(geometry, material);
    scene.add(this.mesh);
  }

  public update(elapsedTime: number): void {
    this.mesh.rotation.y = elapsedTime * 0.002;
    this.mesh.rotation.x = Math.sin(elapsedTime * 0.001) * 0.05;
  }
}

class ConstellationExplorer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private clock: THREE.Clock;
  private starField: StarField;
  private nebula: NebulaBackground;
  private interactionManager: InteractionManager;
  private uiManager: UIManager;
  private musicPlayer: MusicPlayer;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a12);
    this.scene.fog = new THREE.FogExp2(0x0a0a12, 0.003);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 0, 100);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0a0a12, 1);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 200;
    this.controls.enablePan = false;

    this.starField = new StarField(this.scene);
    this.nebula = new NebulaBackground(this.scene);

    this.interactionManager = new InteractionManager(this.scene, this.camera);

    this.uiManager = new UIManager();
    this.musicPlayer = new MusicPlayer();

    this.setupEventListeners();
    this.setupCallbacks();

    this.animate();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());

    this.renderer.domElement.addEventListener('click', (e) => {
      this.interactionManager.handleClick(e, this.container);
    });

    this.renderer.domElement.addEventListener('pointermove', (e) => {
      this.onPointerMove(e);
    });
  }

  private setupCallbacks(): void {
    this.uiManager.setOnConstellationSelect((id) => {
      this.interactionManager.setCurrentConstellation(id);
    });

    this.uiManager.setOnReset(() => {
      this.interactionManager.resetAll();
    });

    this.uiManager.setOnToggleMusic(() => {
      return this.musicPlayer.toggle();
    });

    this.uiManager.setOnExport(() => {
      this.exportStarMap();
    });

    this.interactionManager.setOnConstellationComplete((id) => {
      this.uiManager.markConstellationCompleted(id);
    });

    this.interactionManager.setOnMythIconClick((id) => {
      const constellation = CONSTELLATIONS.find(c => c.id === id);
      if (constellation) {
        this.uiManager.openModal(constellation);
      }
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onPointerMove(event: PointerEvent): void {
    const rect = this.container.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    const starObjects = Array.from(this.interactionManager.getStarObjects().values())
      .filter(s => s.highlighted)
      .map(s => s.mesh);

    const intersects = raycaster.intersectObjects(starObjects);
    this.renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
  }

  private exportStarMap(): void {
    const exportWidth = 800;
    const exportHeight = 600;

    const originalSize = {
      width: this.renderer.domElement.width,
      height: this.renderer.domElement.height
    };
    const originalClearColor = this.renderer.getClearColor(new THREE.Color());
    const originalPixelRatio = this.renderer.getPixelRatio();

    this.renderer.setPixelRatio(1);
    this.renderer.setSize(exportWidth, exportHeight, false);
    this.renderer.setClearColor(0x0a0a12, 1);

    const leftPanel = document.getElementById('left-panel') as HTMLElement;
    const bottomBar = document.getElementById('bottom-bar') as HTMLElement;
    const hintText = document.getElementById('hint-text') as HTMLElement;

    if (leftPanel) leftPanel.style.display = 'none';
    if (bottomBar) bottomBar.style.display = 'none';
    if (hintText) hintText.style.display = 'none';

    this.renderer.render(this.scene, this.camera);

    const dataURL = this.renderer.domElement.toDataURL('image/png');

    if (leftPanel) leftPanel.style.display = '';
    if (bottomBar) bottomBar.style.display = '';
    if (hintText) hintText.style.display = '';

    this.renderer.setPixelRatio(originalPixelRatio);
    this.renderer.setSize(originalSize.width / originalPixelRatio, originalSize.height / originalPixelRatio, false);
    this.renderer.setClearColor(originalClearColor, 1);

    const link = document.createElement('a');
    link.download = `constellation-map-${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.controls.update();
    this.starField.update(elapsedTime);
    this.nebula.update(elapsedTime);
    this.interactionManager.update(deltaTime, elapsedTime);

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ConstellationExplorer();
});
